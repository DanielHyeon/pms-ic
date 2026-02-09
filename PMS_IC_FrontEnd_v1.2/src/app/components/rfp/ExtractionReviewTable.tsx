import { useState, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  Edit,
  AlertTriangle,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Card, CardContent } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { ExtractionResult, RequirementCandidate, CandidateCategory } from '../../../types/rfp';
import { cn } from '../ui/utils';

interface ExtractionReviewTableProps {
  open: boolean;
  onClose: () => void;
  extraction: ExtractionResult | null;
  onConfirm: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
  onUpdateCandidate: (id: string, updates: Partial<RequirementCandidate>) => void;
  isConfirming?: boolean;
  isRejecting?: boolean;
}

export function ExtractionReviewTable({
  open,
  onClose,
  extraction,
  onConfirm,
  onReject,
  onUpdateCandidate,
  isConfirming,
  isRejecting,
}: ExtractionReviewTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const candidates = extraction?.candidates || [];
  const summary = extraction?.summary;
  const run = extraction?.run;

  const stats = useMemo(() => {
    const proposed = candidates.filter((c) => c.status === 'PROPOSED').length;
    const accepted = candidates.filter((c) => c.status === 'ACCEPTED').length;
    const rejected = candidates.filter((c) => c.status === 'REJECTED').length;
    const modified = candidates.filter((c) => c.status === 'MODIFIED').length;
    return { proposed, accepted, rejected, modified };
  }, [candidates]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const handleConfirmSelected = () => {
    onConfirm(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleRejectSelected = () => {
    onReject(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const startEdit = (candidate: RequirementCandidate) => {
    setEditingId(candidate.id);
    setEditText(candidate.editedText || candidate.text);
  };

  const saveEdit = () => {
    if (editingId) {
      onUpdateCandidate(editingId, { editedText: editText, status: 'MODIFIED' });
      setEditingId(null);
      setEditText('');
    }
  };

  const categoryColors: Record<CandidateCategory, string> = {
    FUNCTIONAL: 'bg-blue-100 text-blue-700',
    NON_FUNCTIONAL: 'bg-purple-100 text-purple-700',
    CONSTRAINT: 'bg-orange-100 text-orange-700',
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            요구사항 후보 검토
            {run && (
              <Badge className="bg-gray-100 text-gray-600 text-xs ml-2">
                {run.modelName} {run.modelVersion} | {run.promptVersion}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Summary stats */}
        <div className="grid grid-cols-5 gap-3 py-2">
          {[
            { label: '전체', value: candidates.length, color: 'text-gray-700' },
            { label: '제안됨', value: stats.proposed, color: 'text-blue-600' },
            { label: '채택', value: stats.accepted, color: 'text-green-600' },
            { label: '수정', value: stats.modified, color: 'text-orange-600' },
            { label: '폐기', value: stats.rejected, color: 'text-red-600' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-2 text-center">
                <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Low confidence / ambiguous alerts */}
        {summary && (summary.lowConfidenceTop5.length > 0 || summary.ambiguousTop5.length > 0) && (
          <div className="flex gap-3 text-xs">
            {summary.lowConfidenceTop5.length > 0 && (
              <div className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-3 w-3" />
                Low Confidence: {summary.lowConfidenceTop5.join(', ')}
              </div>
            )}
            {summary.ambiguousTop5.length > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                Ambiguous: {summary.ambiguousTop5.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Bulk actions */}
        <div className="flex items-center gap-2 py-2">
          <Button
            size="sm"
            onClick={handleConfirmSelected}
            disabled={selectedIds.size === 0 || isConfirming}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            선택 확정 ({selectedIds.size})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleRejectSelected}
            disabled={selectedIds.size === 0 || isRejecting}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            선택 폐기 ({selectedIds.size})
          </Button>
          <div className="flex-1" />
          <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === candidates.length && candidates.length > 0}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead className="w-24">Key</TableHead>
                <TableHead>Text</TableHead>
                <TableHead className="w-28">Category</TableHead>
                <TableHead className="w-20">Confidence</TableHead>
                <TableHead className="w-24">Source</TableHead>
                <TableHead className="w-16">Flags</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((cand) => (
                <TableRow
                  key={cand.id}
                  className={cn(
                    cand.status === 'ACCEPTED' && 'bg-green-50',
                    cand.status === 'REJECTED' && 'bg-red-50 opacity-50',
                    cand.status === 'MODIFIED' && 'bg-orange-50'
                  )}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(cand.id)}
                      onChange={() => toggleSelect(cand.id)}
                      className="rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{cand.reqKey}</TableCell>
                  <TableCell className="text-sm">
                    {editingId === cand.id ? (
                      <div className="flex gap-1">
                        <Input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="text-sm h-8"
                        />
                        <Button size="sm" onClick={saveEdit} className="h-8 text-xs">Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8 text-xs">Cancel</Button>
                      </div>
                    ) : (
                      <span className={cand.editedText ? 'italic' : ''}>
                        {cand.editedText || cand.text}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', categoryColors[cand.category])}>
                      {cand.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Progress value={cand.confidence * 100} className="h-1.5 w-12" />
                      <span className="text-xs text-gray-500">{(cand.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-400">{cand.sourceParagraphId || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {cand.isAmbiguous && (
                        <span title="Ambiguous">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                        </span>
                      )}
                      {cand.duplicateRefs.length > 0 && (
                        <span title="Duplicate">
                          <ChevronDown className="h-3.5 w-3.5 text-yellow-500" />
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => startEdit(cand)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-green-600"
                        onClick={() => onConfirm([cand.id])}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-600"
                        onClick={() => onReject([cand.id])}
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
