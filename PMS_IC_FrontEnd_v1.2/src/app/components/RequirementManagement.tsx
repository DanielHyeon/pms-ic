import { useState, useMemo, useCallback } from 'react';
import {
  ClipboardList,
  MoreVertical,
  Eye,
  Edit,
  Link2,
  Trash2,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import {
  Requirement,
  RequirementPriority,
  RequirementStatus,
  RequirementCategory,
} from '../../types/project';
import type { RequirementPanelMode, TraceStatusValue } from '../../types/requirement';
import type { ViewModePreset } from '../../types/menuOntology';
import { UserRole } from '../App';
import {
  useRequirements,
  useCreateRequirement,
  useUpdateRequirement,
  useLinkRequirementToTask,
} from '../../hooks/api/useRequirements';
import {
  useDownloadRequirementTemplate,
  useExportRequirements,
  useImportRequirements,
} from '../../hooks/api/useExcelImportExport';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { ExcelImportExportButtons } from './common/ExcelImportExportButtons';
import { PresetSwitcher } from './common/PresetSwitcher';
import type { FilterValues } from './common/FilterSpecBar';
import { RequirementKpiRow } from './requirements/RequirementKpiRow';
import { RequirementFilters, REQUIREMENT_FILTER_KEYS } from './requirements/RequirementFilters';
import { RequirementRightPanel } from './requirements/RequirementRightPanel';
import { TraceStatusBadge } from './requirements/TraceStatusBadge';
import { TraceCoverageBar } from './requirements/TraceCoverageBar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

// ─── Config maps (reused from v1) ──────────────────────────

interface RequirementManagementProps {
  userRole: UserRole;
}

const priorityConfig: Record<RequirementPriority, { label: string; color: string }> = {
  CRITICAL: { label: '\uAE34\uAE09', color: 'bg-red-100 text-red-700' },
  HIGH: { label: '\uB192\uC74C', color: 'bg-orange-100 text-orange-700' },
  MEDIUM: { label: '\uBCF4\uD1B5', color: 'bg-yellow-100 text-yellow-700' },
  LOW: { label: '\uB0AE\uC74C', color: 'bg-gray-100 text-gray-700' },
};

const statusConfig: Record<RequirementStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  IDENTIFIED: { label: '\uC2DD\uBCC4\uB428', color: 'bg-gray-100 text-gray-700', icon: ClipboardList },
  ANALYZED: { label: '\uBD84\uC11D\uB428', color: 'bg-blue-100 text-blue-700', icon: Eye },
  APPROVED: { label: '\uC2B9\uC778\uB428', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  IMPLEMENTED: { label: '\uAD6C\uD604\uB428', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
  VERIFIED: { label: '\uAC80\uC99D\uB428', color: 'bg-teal-100 text-teal-700', icon: CheckCircle },
  DEFERRED: { label: '\uBCF4\uB958', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  REJECTED: { label: '\uAC70\uC808\uB428', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const categoryConfig: Record<RequirementCategory, { label: string; color: string; ratio?: string }> = {
  AI: { label: 'AI', color: 'bg-blue-100 text-blue-700', ratio: '30%' },
  SI: { label: 'SI', color: 'bg-green-100 text-green-700', ratio: '30%' },
  COMMON: { label: '\uACF5\uD1B5', color: 'bg-purple-100 text-purple-700', ratio: '15%' },
  NON_FUNCTIONAL: { label: '\uBE44\uAE30\uB2A5', color: 'bg-orange-100 text-orange-700', ratio: '25%' },
  FUNCTIONAL: { label: '\uAE30\uB2A5', color: 'bg-blue-50 text-blue-600' },
  TECHNICAL: { label: '\uAE30\uC220', color: 'bg-teal-50 text-teal-600' },
  BUSINESS: { label: '\uBE44\uC988\uB2C8\uC2A4', color: 'bg-amber-50 text-amber-600' },
  CONSTRAINT: { label: '\uC81C\uC57D\uC0AC\uD56D', color: 'bg-red-50 text-red-600' },
};

// ─── Helpers ────────────────────────────────────────────────

/**
 * Derive TraceStatusValue from a Requirement.
 * The backend may or may not have traceStatus populated yet.
 */
function deriveTraceStatus(req: Requirement): TraceStatusValue {
  const raw = (req as unknown as Record<string, unknown>).traceStatus;
  if (raw === 'linked' || raw === 'unlinked' || raw === 'breakpoint') {
    return raw as TraceStatusValue;
  }
  return req.linkedTaskIds && req.linkedTaskIds.length > 0 ? 'linked' : 'unlinked';
}

/**
 * Derive trace coverage from a Requirement.
 */
function deriveTraceCoverage(req: Requirement): number {
  const raw = (req as unknown as Record<string, unknown>).traceCoverage;
  if (typeof raw === 'number') return raw;
  if (req.linkedTaskIds && req.linkedTaskIds.length > 0) {
    return Math.min(100, req.linkedTaskIds.length * 25);
  }
  return 0;
}

/**
 * Determine the panel mode based on the current preset.
 */
function panelModeForPreset(preset: ViewModePreset): RequirementPanelMode {
  switch (preset) {
    case 'CUSTOMER_APPROVAL':
      return 'approval';
    case 'PM_WORK':
    case 'PMO_CONTROL':
    case 'AUDIT_EVIDENCE':
      return 'preview';
    default:
      return 'preview';
  }
}

// ─── Main Component ─────────────────────────────────────────

export default function RequirementManagement({ userRole }: RequirementManagementProps) {
  const { currentProject } = useProject();
  const { data: requirements = [], isLoading, refetch } = useRequirements(currentProject?.id);
  const createMutation = useCreateRequirement();
  const updateMutation = useUpdateRequirement();
  const linkMutation = useLinkRequirementToTask();

  // Excel import/export hooks
  const downloadTemplateMutation = useDownloadRequirementTemplate();
  const exportMutation = useExportRequirements();
  const importMutation = useImportRequirements();

  // Preset management
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());

  // FilterSpec-based filtering
  const {
    filters,
    setFilters,
  } = useFilterSpec({
    keys: REQUIREMENT_FILTER_KEYS,
    syncUrl: false,
  });

  // Right Panel state
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [panelMode, setPanelMode] = useState<RequirementPanelMode>('none');

  // Dialog states (preserved from v1)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  // Create form state
  const [newRequirement, setNewRequirement] = useState({
    title: '',
    description: '',
    category: 'FUNCTIONAL' as RequirementCategory,
    priority: 'MEDIUM' as RequirementPriority,
    acceptanceCriteria: '',
  });

  // Edit form state
  const [editRequirement, setEditRequirement] = useState({
    title: '',
    description: '',
    category: 'FUNCTIONAL' as RequirementCategory,
    priority: 'MEDIUM' as RequirementPriority,
    status: 'IDENTIFIED' as RequirementStatus,
    acceptanceCriteria: '',
  });

  // Task link state
  const [taskIdToLink, setTaskIdToLink] = useState('');

  // ─── Filtering logic (using FilterSpec values) ────────────

  const filteredRequirements = useMemo(() => {
    return requirements.filter((req) => {
      // Search query
      const q = (filters.q as string) || '';
      if (q) {
        const lowerQ = q.toLowerCase();
        const matchesSearch =
          req.title.toLowerCase().includes(lowerQ) ||
          req.code.toLowerCase().includes(lowerQ) ||
          req.description?.toLowerCase().includes(lowerQ);
        if (!matchesSearch) return false;
      }

      // Category filter
      const categoryVal = filters.category as string;
      if (categoryVal) {
        if (categoryVal === 'FUNCTIONAL') {
          // Functional includes AI, SI, COMMON, FUNCTIONAL, TECHNICAL, BUSINESS, CONSTRAINT
          if (req.category === 'NON_FUNCTIONAL') return false;
        } else if (categoryVal === 'NON_FUNCTIONAL') {
          if (req.category !== 'NON_FUNCTIONAL') return false;
        }
      }

      // AI/SI type filter
      const aiSiVal = filters.aiSi as string;
      if (aiSiVal) {
        const reqAiSi = (req as unknown as Record<string, unknown>).aiSiType as string || req.category;
        if (reqAiSi !== aiSiVal) return false;
      }

      // Trace status filter
      const traceStatusVal = filters.traceStatus as string;
      if (traceStatusVal) {
        const traceStatus = deriveTraceStatus(req);
        if (traceStatus !== traceStatusVal) return false;
      }

      return true;
    });
  }, [requirements, filters]);

  // ─── Event handlers ───────────────────────────────────────

  const handleRowClick = useCallback((req: Requirement) => {
    if (selectedRequirement?.id === req.id && panelMode !== 'none') {
      // Toggle off if clicking same row
      setPanelMode('none');
      setSelectedRequirement(null);
    } else {
      setSelectedRequirement(req);
      setPanelMode(panelModeForPreset(currentPreset));
    }
  }, [selectedRequirement, panelMode, currentPreset]);

  const handleClosePanel = useCallback(() => {
    setPanelMode('none');
    setSelectedRequirement(null);
  }, []);

  const handleCreateRequirement = useCallback(() => {
    if (!currentProject || !newRequirement.title.trim()) return;

    createMutation.mutate({
      projectId: currentProject.id,
      data: {
        ...newRequirement,
        status: 'IDENTIFIED',
        rfpId: '',
      }
    }, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        setNewRequirement({
          title: '',
          description: '',
          category: 'FUNCTIONAL',
          priority: 'MEDIUM',
          acceptanceCriteria: '',
        });
      },
      onError: (error) => {
        console.error('Failed to create requirement:', error);
      }
    });
  }, [currentProject, newRequirement, createMutation]);

  const handleLinkTask = useCallback(() => {
    if (!currentProject || !selectedRequirement || !taskIdToLink.trim()) return;

    linkMutation.mutate({
      projectId: currentProject.id,
      requirementId: selectedRequirement.id,
      taskId: taskIdToLink,
    }, {
      onSuccess: () => {
        setIsLinkDialogOpen(false);
        setTaskIdToLink('');
      },
      onError: (error) => {
        console.error('Failed to link task:', error);
      }
    });
  }, [currentProject, selectedRequirement, taskIdToLink, linkMutation]);

  const handleViewRequirement = useCallback((requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setIsViewDialogOpen(true);
  }, []);

  const handleOpenLinkDialog = useCallback((requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setIsLinkDialogOpen(true);
  }, []);

  const handleOpenEditDialog = useCallback((requirement: Requirement) => {
    setSelectedRequirement(requirement);
    setEditRequirement({
      title: requirement.title,
      description: requirement.description || '',
      category: requirement.category,
      priority: requirement.priority,
      status: requirement.status,
      acceptanceCriteria: requirement.acceptanceCriteria || '',
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleUpdateRequirement = useCallback(() => {
    if (!currentProject || !selectedRequirement || !editRequirement.title.trim()) return;

    updateMutation.mutate({
      projectId: currentProject.id,
      requirementId: selectedRequirement.id,
      data: editRequirement,
    }, {
      onSuccess: () => {
        setIsEditDialogOpen(false);
      },
      onError: (error) => {
        console.error('Failed to update requirement:', error);
      }
    });
  }, [currentProject, selectedRequirement, editRequirement, updateMutation]);

  // ─── Permission checks ───────────────────────────────────

  const canCreate = ['pmo_head', 'pm', 'business_analyst', 'admin'].includes(userRole);
  const canEdit = ['pmo_head', 'pm', 'business_analyst', 'admin'].includes(userRole);
  const canLink = ['pm', 'developer', 'admin'].includes(userRole);

  // ─── Render guards ───────────────────────────────────────

  if (!currentProject) {
    return (
      <div className="p-6 text-center text-gray-500">
        <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>{'\uD504\uB85C\uC81D\uD2B8\uB97C \uBA3C\uC800 \uC120\uD0DD\uD574\uC8FC\uC138\uC694.'}</p>
      </div>
    );
  }

  const showRightPanel = panelMode !== 'none' && selectedRequirement !== null;

  return (
    <div className="p-6 space-y-4">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{'\uC694\uAD6C\uC0AC\uD56D \uAD00\uB9AC'}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {'\uD504\uB85C\uC81D\uD2B8 \uC694\uAD6C\uC0AC\uD56D\uC744 \uCD94\uC801\uD558\uACE0 \uD0DC\uC2A4\uD06C\uC640 \uC5F0\uACB0\uD569\uB2C8\uB2E4.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PresetSwitcher
            currentPreset={currentPreset}
            onSwitch={switchPreset}
            compact
          />
          {canCreate && (
            <ExcelImportExportButtons
              onDownloadTemplate={() => downloadTemplateMutation.mutateAsync(currentProject.id)}
              onExport={() => exportMutation.mutateAsync({ projectId: currentProject.id })}
              onImport={(file) => importMutation.mutateAsync({ projectId: currentProject.id, file })}
              isDownloadingTemplate={downloadTemplateMutation.isPending}
              isExporting={exportMutation.isPending}
              isImporting={importMutation.isPending}
            />
          )}
          {canCreate && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {'\uC694\uAD6C\uC0AC\uD56D \uCD94\uAC00'}
            </Button>
          )}
        </div>
      </div>

      {/* ─── KPI Row (preset-driven) ─────────────────────────── */}
      <RequirementKpiRow requirements={requirements} preset={currentPreset} />

      {/* ─── Filter Bar (FilterSpec-based) ────────────────────── */}
      <RequirementFilters
        values={filters}
        onChange={setFilters}
        preset={currentPreset}
      />

      {/* ─── Main Content: Table + Right Panel ────────────────── */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
          <p className="text-gray-500 mt-2">{'\uB85C\uB529 \uC911...'}</p>
        </div>
      ) : filteredRequirements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {filters.q || Object.keys(filters).some((k) => k !== 'q' && filters[k])
                ? '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'
                : '\uB4F1\uB85D\uB41C \uC694\uAD6C\uC0AC\uD56D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.'}
            </p>
            {canCreate && !filters.q && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                {'\uCCAB \uBC88\uC9F8 \uC694\uAD6C\uC0AC\uD56D \uCD94\uAC00\uD558\uAE30'}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-0">
          {/* Table area */}
          <Card className={showRightPanel ? 'flex-1 min-w-0' : 'w-full'}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{'\uCF54\uB4DC'}</TableHead>
                  <TableHead>{'\uC81C\uBAA9'}</TableHead>
                  <TableHead className="w-24">{'\uBD84\uB958'}</TableHead>
                  <TableHead className="w-24">{'\uC6B0\uC120\uC21C\uC704'}</TableHead>
                  <TableHead className="w-24">{'\uC0C1\uD0DC'}</TableHead>
                  <TableHead className="w-28">Trace</TableHead>
                  <TableHead className="w-32">Coverage</TableHead>
                  <TableHead className="w-24">{'\uC5F0\uACB0 \uD0DC\uC2A4\uD06C'}</TableHead>
                  <TableHead className="w-10">
                    <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.map((req) => {
                  const status = statusConfig[req.status] ?? { label: req.status, color: 'bg-gray-100 text-gray-700', icon: ClipboardList };
                  const priority = priorityConfig[req.priority] ?? { label: req.priority, color: 'bg-gray-100 text-gray-700' };
                  const category = categoryConfig[req.category] ?? { label: req.category, color: 'bg-gray-100 text-gray-700' };
                  const traceStatus = deriveTraceStatus(req);
                  const traceCoverage = deriveTraceCoverage(req);
                  const isSelected = selectedRequirement?.id === req.id;

                  return (
                    <TableRow
                      key={req.id}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 hover:bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleRowClick(req)}
                    >
                      <TableCell className="font-mono text-sm">{req.code}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{req.title}</span>
                          {req.description && (
                            <p className="text-sm text-gray-500 truncate max-w-md">
                              {req.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={category.color}>
                          {category.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priority.color}>{priority.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <TraceStatusBadge status={traceStatus} compact />
                      </TableCell>
                      <TableCell>
                        <TraceCoverageBar coverage={traceCoverage} />
                      </TableCell>
                      <TableCell>
                        {req.linkedTaskIds?.length > 0 ? (
                          <Badge variant="outline" className="bg-blue-50">
                            <Link2 className="h-3 w-3 mr-1" />
                            {req.linkedTaskIds.length}{'\uAC1C'}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">{'\uC5C6\uC74C'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewRequirement(req)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {'\uC0C1\uC138 \uBCF4\uAE30'}
                            </DropdownMenuItem>
                            {canEdit && (
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(req)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {'\uC218\uC815'}
                              </DropdownMenuItem>
                            )}
                            {canLink && (
                              <DropdownMenuItem onClick={() => handleOpenLinkDialog(req)}>
                                <Link2 className="h-4 w-4 mr-2" />
                                {'\uD0DC\uC2A4\uD06C \uC5F0\uACB0'}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {'\uC0AD\uC81C'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Right Panel */}
          {showRightPanel && (
            <RequirementRightPanel
              panelMode={panelMode}
              requirement={selectedRequirement}
              onClose={handleClosePanel}
              onViewDetail={() => {
                if (selectedRequirement) {
                  handleViewRequirement(selectedRequirement);
                }
              }}
            />
          )}
        </div>
      )}

      {/* ─── Create Dialog ───────────────────────────────────── */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{'\uC0C8 \uC694\uAD6C\uC0AC\uD56D \uCD94\uAC00'}</DialogTitle>
            <DialogDescription>
              {'\uC694\uAD6C\uC0AC\uD56D \uC815\uBCF4\uB97C \uC785\uB825\uD558\uC138\uC694.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">{'\uC81C\uBAA9'} *</Label>
              <Input
                id="title"
                value={newRequirement.title}
                onChange={(e) => setNewRequirement({ ...newRequirement, title: e.target.value })}
                placeholder={'\uC694\uAD6C\uC0AC\uD56D \uC81C\uBAA9'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{'\uBD84\uB958'}</Label>
                <Select
                  value={newRequirement.category}
                  onValueChange={(v) => setNewRequirement({ ...newRequirement, category: v as RequirementCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{'\uC6B0\uC120\uC21C\uC704'}</Label>
                <Select
                  value={newRequirement.priority}
                  onValueChange={(v) => setNewRequirement({ ...newRequirement, priority: v as RequirementPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{'\uC124\uBA85'}</Label>
              <Textarea
                id="description"
                value={newRequirement.description}
                onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
                placeholder={'\uC694\uAD6C\uC0AC\uD56D \uC0C1\uC138 \uC124\uBA85...'}
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="acceptanceCriteria">{'\uC778\uC218 \uC870\uAC74'}</Label>
              <Textarea
                id="acceptanceCriteria"
                value={newRequirement.acceptanceCriteria}
                onChange={(e) => setNewRequirement({ ...newRequirement, acceptanceCriteria: e.target.value })}
                placeholder={'\uC694\uAD6C\uC0AC\uD56D\uC774 \uCDA9\uC871\uB418\uC5C8\uB294\uC9C0 \uD655\uC778\uD560 \uC218 \uC788\uB294 \uC870\uAC74...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              {'\uCDE8\uC18C'}
            </Button>
            <Button
              onClick={handleCreateRequirement}
              disabled={!newRequirement.title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {'\uCD94\uAC00 \uC911...'}
                </>
              ) : (
                '\uC694\uAD6C\uC0AC\uD56D \uCD94\uAC00'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Dialog ─────────────────────────────────────── */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-500">{selectedRequirement?.code}</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              {selectedRequirement?.title}
            </DialogTitle>
            <DialogDescription>
              {'\uC694\uAD6C\uC0AC\uD56D \uC0C1\uC138 \uC815\uBCF4\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequirement && (() => {
            const selCategory = categoryConfig[selectedRequirement.category] ?? { label: selectedRequirement.category, color: 'bg-gray-100 text-gray-700' };
            const selPriority = priorityConfig[selectedRequirement.priority] ?? { label: selectedRequirement.priority, color: 'bg-gray-100 text-gray-700' };
            const selStatus = statusConfig[selectedRequirement.status] ?? { label: selectedRequirement.status, color: 'bg-gray-100 text-gray-700' };
            const selTraceStatus = deriveTraceStatus(selectedRequirement);
            const selTraceCoverage = deriveTraceCoverage(selectedRequirement);
            return (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge className={selCategory.color}>{selCategory.label}</Badge>
                  <Badge className={selPriority.color}>{selPriority.label}</Badge>
                  <Badge className={selStatus.color}>{selStatus.label}</Badge>
                  <TraceStatusBadge status={selTraceStatus} />
                </div>

                {/* Trace coverage in detail view */}
                <div>
                  <Label className="text-gray-500">Trace Coverage</Label>
                  <TraceCoverageBar coverage={selTraceCoverage} className="mt-1 max-w-xs" />
                </div>

                <div>
                  <Label className="text-gray-500">{'\uC124\uBA85'}</Label>
                  <p className="mt-1">{selectedRequirement.description || '\uC124\uBA85 \uC5C6\uC74C'}</p>
                </div>

                {selectedRequirement.acceptanceCriteria && (
                  <div>
                    <Label className="text-gray-500">{'\uC778\uC218 \uC870\uAC74'}</Label>
                    <p className="mt-1 whitespace-pre-wrap">{selectedRequirement.acceptanceCriteria}</p>
                  </div>
                )}

                {selectedRequirement.sourceText && (
                  <div>
                    <Label className="text-gray-500">{'\uC6D0\uBCF8 \uD14D\uC2A4\uD2B8 (RFP)'}</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded text-sm italic">
                      "{selectedRequirement.sourceText}"
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-gray-500">{'\uC5F0\uACB0\uB41C \uD0DC\uC2A4\uD06C'}</Label>
                  {selectedRequirement.linkedTaskIds?.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedRequirement.linkedTaskIds.map((taskId) => (
                        <Badge key={taskId} variant="outline">
                          <Link2 className="h-3 w-3 mr-1" />
                          {taskId}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-gray-400">{'\uC5F0\uACB0\uB41C \uD0DC\uC2A4\uD06C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.'}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500">{'\uC608\uC0C1 \uACF5\uC218'}</Label>
                    <p>{selectedRequirement.estimatedEffort ? `${selectedRequirement.estimatedEffort}\uC2DC\uAC04` : '-'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">{'\uC2E4\uC81C \uACF5\uC218'}</Label>
                    <p>{selectedRequirement.actualEffort ? `${selectedRequirement.actualEffort}\uC2DC\uAC04` : '-'}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              {'\uB2EB\uAE30'}
            </Button>
            {canLink && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                handleOpenLinkDialog(selectedRequirement!);
              }}>
                <Link2 className="h-4 w-4 mr-2" />
                {'\uD0DC\uC2A4\uD06C \uC5F0\uACB0'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Link Dialog ─────────────────────────────────────── */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{'\uD0DC\uC2A4\uD06C \uC5F0\uACB0'}</DialogTitle>
            <DialogDescription>
              {'\uC694\uAD6C\uC0AC\uD56D'} "{selectedRequirement?.title}"{'\uC5D0 \uC5F0\uACB0\uD560 \uD0DC\uC2A4\uD06C ID\uB97C \uC785\uB825\uD558\uC138\uC694.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="taskId">{'\uD0DC\uC2A4\uD06C ID'}</Label>
              <Input
                id="taskId"
                value={taskIdToLink}
                onChange={(e) => setTaskIdToLink(e.target.value)}
                placeholder="TASK-001"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLinkDialogOpen(false)}
              disabled={linkMutation.isPending}
            >
              {'\uCDE8\uC18C'}
            </Button>
            <Button
              onClick={handleLinkTask}
              disabled={!taskIdToLink.trim() || linkMutation.isPending}
            >
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {'\uC5F0\uACB0 \uC911...'}
                </>
              ) : (
                '\uC5F0\uACB0'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{'\uC694\uAD6C\uC0AC\uD56D \uC218\uC815'}</DialogTitle>
            <DialogDescription>
              {selectedRequirement?.code} - {'\uC694\uAD6C\uC0AC\uD56D \uC815\uBCF4\uB97C \uC218\uC815\uD569\uB2C8\uB2E4.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">{'\uC81C\uBAA9'} *</Label>
              <Input
                id="edit-title"
                value={editRequirement.title}
                onChange={(e) => setEditRequirement({ ...editRequirement, title: e.target.value })}
                placeholder={'\uC694\uAD6C\uC0AC\uD56D \uC81C\uBAA9'}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>{'\uBD84\uB958'}</Label>
                <Select
                  value={editRequirement.category}
                  onValueChange={(v) => setEditRequirement({ ...editRequirement, category: v as RequirementCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{'\uC6B0\uC120\uC21C\uC704'}</Label>
                <Select
                  value={editRequirement.priority}
                  onValueChange={(v) => setEditRequirement({ ...editRequirement, priority: v as RequirementPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{'\uC0C1\uD0DC'}</Label>
                <Select
                  value={editRequirement.status}
                  onValueChange={(v) => setEditRequirement({ ...editRequirement, status: v as RequirementStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">{'\uC124\uBA85'}</Label>
              <Textarea
                id="edit-description"
                value={editRequirement.description}
                onChange={(e) => setEditRequirement({ ...editRequirement, description: e.target.value })}
                placeholder={'\uC694\uAD6C\uC0AC\uD56D \uC0C1\uC138 \uC124\uBA85...'}
                rows={4}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-acceptanceCriteria">{'\uC778\uC218 \uC870\uAC74'}</Label>
              <Textarea
                id="edit-acceptanceCriteria"
                value={editRequirement.acceptanceCriteria}
                onChange={(e) => setEditRequirement({ ...editRequirement, acceptanceCriteria: e.target.value })}
                placeholder={'\uC694\uAD6C\uC0AC\uD56D\uC774 \uCDA9\uC871\uB418\uC5C8\uB294\uC9C0 \uD655\uC778\uD560 \uC218 \uC788\uB294 \uC870\uAC74...'}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              {'\uCDE8\uC18C'}
            </Button>
            <Button
              onClick={handleUpdateRequirement}
              disabled={!editRequirement.title.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {'\uC800\uC7A5 \uC911...'}
                </>
              ) : (
                '\uC800\uC7A5'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
