import { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  Ban,
  Info,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import ProjectNotSelectedMessage from './ProjectNotSelectedMessage';
import { useProject } from '../../contexts/ProjectContext';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useUsers } from '../../hooks/api/useRoles';
import {
  useRolesQuery,
  useCapabilitiesQuery,
  useUserRolesQuery,
  useUserCapabilitiesQuery,
  useDelegationsQuery,
  useDelegationMapQuery,
  useEffectiveCapabilitiesQuery,
  useGovernanceFindingsQuery,
  useGovernanceCheckRunsQuery,
  useGrantUserRole,
  useRevokeUserRole,
  useGrantUserCapability,
  useRevokeUserCapability,
  useCreateDelegation,
  useApproveDelegation,
  useRevokeDelegation,
  useRunGovernanceCheck,
  type RoleDto,
  type CapabilityDto,
  type UserRoleDto,
  type UserCapabilityDto,
  type DelegationDto,
  type DelegationMapNodeDto,
  type EffectiveCapabilityDto,
  type GovernanceFindingDto,
  type GovernanceCheckRunDto,
} from '../../hooks/api/useAuthority';

interface Props {
  userRole: string;
}

type TabId = 'delegation-map' | 'role-capability' | 'governance';

// ==================== Status/Severity Badge Helpers ====================

function DelegationStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    ACTIVE: { variant: 'default', label: 'Active' },
    PENDING: { variant: 'secondary', label: 'Pending' },
    EXPIRED: { variant: 'outline', label: 'Expired' },
    REVOKED: { variant: 'destructive', label: 'Revoked' },
  };
  const c = config[status] || { variant: 'outline' as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { className: string; label: string }> = {
    HIGH: { className: 'bg-red-100 text-red-800 border-red-200', label: 'HIGH' },
    MEDIUM: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'MEDIUM' },
    LOW: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'LOW' },
    INFO: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'INFO' },
  };
  const c = config[severity] || { className: 'bg-gray-100 text-gray-600 border-gray-200', label: severity };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.className}`}>{c.label}</span>;
}

function SourceBadge({ sourceType }: { sourceType: string }) {
  const config: Record<string, { className: string; label: string }> = {
    DELEGATION: { className: 'bg-purple-100 text-purple-800', label: 'Delegation' },
    DIRECT: { className: 'bg-blue-100 text-blue-800', label: 'Direct' },
    ROLE: { className: 'bg-green-100 text-green-800', label: 'Role' },
  };
  const c = config[sourceType] || { className: 'bg-gray-100 text-gray-600', label: sourceType };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>{c.label}</span>;
}

// ==================== Tab 1: Delegation Map ====================

function DelegationMapTab({
  projectId,
  delegationMap,
  isLoading,
  selectedUserId,
  setSelectedUserId,
}: {
  projectId: string;
  delegationMap: DelegationMapNodeDto[];
  isLoading: boolean;
  selectedUserId: string | null;
  setSelectedUserId: (id: string | null) => void;
}) {
  const effectiveCaps = useEffectiveCapabilitiesQuery(projectId, selectedUserId || undefined);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (!delegationMap || delegationMap.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No delegation map data available.</p>
        <p className="text-sm mt-1">Create delegations in the Role/Capability tab to see the map.</p>
      </div>
    );
  }

  function renderNode(node: DelegationMapNodeDto, depth: number) {
    const isSelected = selectedUserId === node.userId;
    return (
      <div key={node.userId + '-' + depth} className="ml-0">
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
            isSelected ? 'bg-blue-50 border border-blue-200' : ''
          }`}
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
          onClick={() => setSelectedUserId(isSelected ? null : node.userId)}
        >
          {depth > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
            depth === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {(node.userName || '?').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{node.userName || node.userId}</div>
            <div className="text-xs text-gray-500">{node.roleName || ''}</div>
          </div>
          {node.delegations?.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {node.delegations.length} delegation{node.delegations.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Delegation Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {delegationMap.map(node => renderNode(node, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        {selectedUserId ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                User Detail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {effectiveCaps.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Effective Capabilities</h4>
                    {(!effectiveCaps.data || effectiveCaps.data.length === 0) ? (
                      <p className="text-xs text-gray-500">No effective capabilities found.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(effectiveCaps.data as EffectiveCapabilityDto[]).map((cap, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                            <div>
                              <span className="font-medium">{cap.capabilityName || cap.capabilityCode}</span>
                            </div>
                            <SourceBadge sourceType={cap.sourceType} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-gray-500 text-sm">
              <Eye className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              Click a user in the map to see their details.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ==================== Tab 2: Role/Capability ====================

function RoleCapabilityTab({
  projectId,
  canManage,
}: {
  projectId: string;
  canManage: boolean;
}) {
  const [showGrantRole, setShowGrantRole] = useState(false);
  const [showGrantCap, setShowGrantCap] = useState(false);
  const [showCreateDelegation, setShowCreateDelegation] = useState(false);
  const [grantRoleForm, setGrantRoleForm] = useState({ userId: '', roleId: '', reason: '' });
  const [grantCapForm, setGrantCapForm] = useState({ userId: '', capabilityId: '', reason: '' });
  const [delegationForm, setDelegationForm] = useState({
    delegateeId: '',
    capabilityId: '',
    scopeType: 'PROJECT',
    durationType: 'PERMANENT',
    startAt: new Date().toISOString().slice(0, 10),
    endAt: '',
    approverId: '',
    reason: '',
  });

  const roles = useRolesQuery(projectId);
  const capabilities = useCapabilitiesQuery(projectId);
  const userRoles = useUserRolesQuery(projectId);
  const userCaps = useUserCapabilitiesQuery(projectId);
  const delegations = useDelegationsQuery(projectId);
  const { data: users } = useUsers();

  const grantRole = useGrantUserRole(projectId);
  const revokeRole = useRevokeUserRole(projectId);
  const grantCap = useGrantUserCapability(projectId);
  const revokeCap = useRevokeUserCapability(projectId);
  const createDelegation = useCreateDelegation(projectId);
  const approveDelegation = useApproveDelegation(projectId);
  const revokeDelegation = useRevokeDelegation(projectId);

  const userList = useMemo(() => {
    if (!users) return [];
    return Array.isArray(users) ? users : [];
  }, [users]);

  const handleGrantRole = async () => {
    if (!grantRoleForm.userId || !grantRoleForm.roleId) return;
    try {
      await grantRole.mutateAsync(grantRoleForm);
      setShowGrantRole(false);
      setGrantRoleForm({ userId: '', roleId: '', reason: '' });
    } catch (e: any) {
      alert(e?.message || 'Failed to grant role');
    }
  };

  const handleGrantCap = async () => {
    if (!grantCapForm.userId || !grantCapForm.capabilityId) return;
    try {
      await grantCap.mutateAsync(grantCapForm);
      setShowGrantCap(false);
      setGrantCapForm({ userId: '', capabilityId: '', reason: '' });
    } catch (e: any) {
      alert(e?.message || 'Failed to grant capability');
    }
  };

  const handleCreateDelegation = async () => {
    if (!delegationForm.delegateeId || !delegationForm.capabilityId || !delegationForm.approverId) return;
    try {
      await createDelegation.mutateAsync({
        ...delegationForm,
        endAt: delegationForm.durationType === 'TEMPORARY' ? delegationForm.endAt : undefined,
      });
      setShowCreateDelegation(false);
      setDelegationForm({
        delegateeId: '', capabilityId: '', scopeType: 'PROJECT',
        durationType: 'PERMANENT', startAt: new Date().toISOString().slice(0, 10),
        endAt: '', approverId: '', reason: '',
      });
    } catch (e: any) {
      alert(e?.message || 'Failed to create delegation');
    }
  };

  const isLoading = roles.isLoading || userRoles.isLoading || delegations.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* User Roles Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Roles
            </CardTitle>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setShowGrantRole(true)}>
                <Plus className="h-3 w-3 mr-1" /> Grant Role
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!userRoles.data || (userRoles.data as UserRoleDto[]).length === 0) ? (
            <p className="text-sm text-gray-500 text-center py-4">No role assignments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium">Granted By</th>
                    <th className="pb-2 font-medium">Date</th>
                    {canManage && <th className="pb-2 font-medium w-16"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(userRoles.data as UserRoleDto[]).map(ur => (
                    <tr key={ur.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">{ur.userName || ur.userId}</td>
                      <td className="py-2"><Badge variant="secondary">{ur.roleName || ur.roleId}</Badge></td>
                      <td className="py-2 text-gray-500">{ur.grantedByName || ur.grantedBy}</td>
                      <td className="py-2 text-gray-500">{ur.grantedAt ? new Date(ur.grantedAt).toLocaleDateString() : ''}</td>
                      {canManage && (
                        <td className="py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Revoke this role assignment?')) {
                                revokeRole.mutate(ur.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Direct Capability Grants Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Direct Capability Grants
            </CardTitle>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setShowGrantCap(true)}>
                <Plus className="h-3 w-3 mr-1" /> Grant Capability
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!userCaps.data || (userCaps.data as UserCapabilityDto[]).length === 0) ? (
            <p className="text-sm text-gray-500 text-center py-4">No direct capability grants.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Capability</th>
                    <th className="pb-2 font-medium">Granted By</th>
                    <th className="pb-2 font-medium">Date</th>
                    {canManage && <th className="pb-2 font-medium w-16"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(userCaps.data as UserCapabilityDto[]).map(uc => (
                    <tr key={uc.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">{uc.userName || uc.userId}</td>
                      <td className="py-2">
                        <Badge variant="outline">{uc.capabilityName || uc.capabilityCode}</Badge>
                      </td>
                      <td className="py-2 text-gray-500">{uc.grantedByName || uc.grantedBy}</td>
                      <td className="py-2 text-gray-500">{uc.grantedAt ? new Date(uc.grantedAt).toLocaleDateString() : ''}</td>
                      {canManage && (
                        <td className="py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Revoke this capability?')) {
                                revokeCap.mutate(uc.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delegations Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Delegations
            </CardTitle>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setShowCreateDelegation(true)}>
                <Plus className="h-3 w-3 mr-1" /> Create Delegation
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!delegations.data || (delegations.data as DelegationDto[]).length === 0) ? (
            <p className="text-sm text-gray-500 text-center py-4">No delegations.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">From</th>
                    <th className="pb-2 font-medium">To</th>
                    <th className="pb-2 font-medium">Capability</th>
                    <th className="pb-2 font-medium">Scope</th>
                    <th className="pb-2 font-medium">Duration</th>
                    <th className="pb-2 font-medium">Status</th>
                    {canManage && <th className="pb-2 font-medium w-24"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(delegations.data as DelegationDto[]).map(d => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">{d.delegatorName || d.delegatorId}</td>
                      <td className="py-2">{d.delegateeName || d.delegateeId}</td>
                      <td className="py-2"><Badge variant="outline">{d.capabilityName || d.capabilityCode}</Badge></td>
                      <td className="py-2 text-gray-500 text-xs">{d.scopeType}{d.scopePartName ? ` (${d.scopePartName})` : ''}</td>
                      <td className="py-2 text-gray-500 text-xs">
                        {d.durationType === 'PERMANENT' ? 'Permanent' : `${d.startAt?.slice(0, 10)} ~ ${d.endAt?.slice(0, 10) || ''}`}
                      </td>
                      <td className="py-2"><DelegationStatusBadge status={d.status} /></td>
                      {canManage && (
                        <td className="py-2 flex gap-1">
                          {d.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-green-600 hover:text-green-800"
                              onClick={() => approveDelegation.mutate(d.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(d.status === 'ACTIVE' || d.status === 'PENDING') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-red-500 hover:text-red-700"
                              onClick={() => {
                                const reason = prompt('Revoke reason (optional):');
                                if (reason !== null) {
                                  revokeDelegation.mutate({ delegationId: d.id, reason });
                                }
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grant Role Dialog */}
      <Dialog open={showGrantRole} onOpenChange={setShowGrantRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Role</DialogTitle>
            <DialogDescription>Assign a role to a user in this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">User</label>
              <Select value={grantRoleForm.userId} onValueChange={v => setGrantRoleForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={grantRoleForm.roleId} onValueChange={v => setGrantRoleForm(f => ({ ...f, roleId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  {(roles.data as RoleDto[] || []).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                value={grantRoleForm.reason}
                onChange={e => setGrantRoleForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for granting..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantRole(false)}>Cancel</Button>
            <Button onClick={handleGrantRole} disabled={grantRole.isPending}>
              {grantRole.isPending ? 'Granting...' : 'Grant Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Capability Dialog */}
      <Dialog open={showGrantCap} onOpenChange={setShowGrantCap}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Capability</DialogTitle>
            <DialogDescription>Directly grant a capability to a user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">User</label>
              <Select value={grantCapForm.userId} onValueChange={v => setGrantCapForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Capability</label>
              <Select value={grantCapForm.capabilityId} onValueChange={v => setGrantCapForm(f => ({ ...f, capabilityId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select capability..." /></SelectTrigger>
                <SelectContent>
                  {(capabilities.data as CapabilityDto[] || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                value={grantCapForm.reason}
                onChange={e => setGrantCapForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for granting..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantCap(false)}>Cancel</Button>
            <Button onClick={handleGrantCap} disabled={grantCap.isPending}>
              {grantCap.isPending ? 'Granting...' : 'Grant Capability'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Delegation Dialog */}
      <Dialog open={showCreateDelegation} onOpenChange={setShowCreateDelegation}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Delegation</DialogTitle>
            <DialogDescription>Delegate a capability to another user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-sm font-medium">Delegatee (To)</label>
              <Select value={delegationForm.delegateeId} onValueChange={v => setDelegationForm(f => ({ ...f, delegateeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Capability</label>
              <Select value={delegationForm.capabilityId} onValueChange={v => setDelegationForm(f => ({ ...f, capabilityId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select capability..." /></SelectTrigger>
                <SelectContent>
                  {(capabilities.data as CapabilityDto[] || []).filter(c => c.isDelegatable).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Scope</label>
              <Select value={delegationForm.scopeType} onValueChange={v => setDelegationForm(f => ({ ...f, scopeType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROJECT">Project</SelectItem>
                  <SelectItem value="PART">Part</SelectItem>
                  <SelectItem value="FUNCTION">Function</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Duration</label>
              <Select value={delegationForm.durationType} onValueChange={v => setDelegationForm(f => ({ ...f, durationType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERMANENT">Permanent</SelectItem>
                  <SelectItem value="TEMPORARY">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {delegationForm.durationType === 'TEMPORARY' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={delegationForm.startAt}
                    onChange={e => setDelegationForm(f => ({ ...f, startAt: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={delegationForm.endAt}
                    onChange={e => setDelegationForm(f => ({ ...f, endAt: e.target.value }))}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Approver</label>
              <Select value={delegationForm.approverId} onValueChange={v => setDelegationForm(f => ({ ...f, approverId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select approver..." /></SelectTrigger>
                <SelectContent>
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                value={delegationForm.reason}
                onChange={e => setDelegationForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Reason for delegation..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDelegation(false)}>Cancel</Button>
            <Button onClick={handleCreateDelegation} disabled={createDelegation.isPending}>
              {createDelegation.isPending ? 'Creating...' : 'Create Delegation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Tab 3: Governance ====================

function GovernanceTab({ projectId, canAudit }: { projectId: string; canAudit: boolean }) {
  const findings = useGovernanceFindingsQuery(projectId);
  const checkRuns = useGovernanceCheckRunsQuery(projectId);
  const runCheck = useRunGovernanceCheck(projectId);

  const findingsData = (findings.data || []) as GovernanceFindingDto[];
  const checkRunsData = (checkRuns.data || []) as GovernanceCheckRunDto[];

  const latestRun = checkRunsData.length > 0 ? checkRunsData[0] : null;

  const groupedFindings = useMemo(() => {
    const groups: Record<string, GovernanceFindingDto[]> = {};
    findingsData.forEach(f => {
      const key = f.findingType || 'OTHER';
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return groups;
  }, [findingsData]);

  const findingTypeConfig: Record<string, { icon: typeof AlertTriangle; label: string; color: string }> = {
    SOD_VIOLATION: { icon: Ban, label: 'SoD Violations', color: 'text-red-600' },
    SELF_APPROVAL: { icon: AlertTriangle, label: 'Self-Approval', color: 'text-orange-600' },
    EXPIRING_DELEGATION: { icon: Clock, label: 'Expiring Delegations', color: 'text-yellow-600' },
    EXPIRED_DELEGATION: { icon: XCircle, label: 'Expired Delegations', color: 'text-gray-600' },
    DUPLICATE_CAPABILITY: { icon: Info, label: 'Duplicate Capabilities', color: 'text-blue-600' },
    POLICY_VIOLATION: { icon: Shield, label: 'Policy Violations', color: 'text-purple-600' },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Governance Audit
              </CardTitle>
              {latestRun && (
                <p className="text-xs text-gray-500 mt-1">
                  Last check: {new Date(latestRun.checkedAt).toLocaleString()}
                </p>
              )}
            </div>
            {canAudit && (
              <Button
                size="sm"
                onClick={() => runCheck.mutate()}
                disabled={runCheck.isPending}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${runCheck.isPending ? 'animate-spin' : ''}`} />
                {runCheck.isPending ? 'Running...' : 'Run Check'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {findings.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : findingsData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
              <p className="font-medium text-green-600">All Clear</p>
              <p className="text-sm mt-1">No governance findings detected.</p>
              {!latestRun && <p className="text-xs mt-2">Run a governance check to scan for issues.</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedFindings).map(([type, items]) => {
                const config = findingTypeConfig[type] || { icon: AlertTriangle, label: type, color: 'text-gray-600' };
                const Icon = config.icon;
                return (
                  <div key={type} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className={`font-medium text-sm ${config.color}`}>
                        {config.label} ({items.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.map(finding => (
                        <div key={finding.id} className="bg-gray-50 rounded p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span>{finding.message}</span>
                            <SeverityBadge severity={finding.severity} />
                          </div>
                          {finding.userId && (
                            <p className="text-xs text-gray-500 mt-1">User: {finding.userId}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check Run History */}
      {checkRunsData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Check Run History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checkRunsData.map(run => {
                let summary: any = {};
                try { summary = JSON.parse(run.summaryJson || '{}'); } catch { /* empty */ }
                return (
                  <div key={run.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div>
                      <span className="font-medium">{new Date(run.checkedAt).toLocaleString()}</span>
                      <span className="text-gray-500 ml-2">by {run.checkedBy}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      {summary.totalFindings !== undefined && (
                        <Badge variant={summary.totalFindings > 0 ? 'destructive' : 'secondary'}>
                          {summary.totalFindings} finding{summary.totalFindings !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== Main Page Component ====================

export default function RolePermissionPage({ userRole }: Props) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const { hasCapability } = useCapabilities(userRole?.toUpperCase() || '');

  const [activeTab, setActiveTab] = useState<TabId>('delegation-map');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const canManage = hasCapability('manage_roles');
  const canAudit = hasCapability('manage_roles'); // audit_governance maps to manage_roles for now

  const delegationMap = useDelegationMapQuery(projectId);

  if (!projectId) {
    return <ProjectNotSelectedMessage />;
  }

  const tabs = [
    { id: 'delegation-map' as TabId, label: 'Delegation Map', icon: GitBranch },
    { id: 'role-capability' as TabId, label: 'Roles / Capabilities', icon: ShieldCheck },
    { id: 'governance' as TabId, label: 'Governance Audit', icon: Shield },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Role & Permission Management
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-0" aria-label="Tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'delegation-map' && (
        <DelegationMapTab
          projectId={projectId}
          delegationMap={(delegationMap.data || []) as DelegationMapNodeDto[]}
          isLoading={delegationMap.isLoading}
          selectedUserId={selectedUserId}
          setSelectedUserId={setSelectedUserId}
        />
      )}
      {activeTab === 'role-capability' && (
        <RoleCapabilityTab
          projectId={projectId}
          canManage={canManage}
        />
      )}
      {activeTab === 'governance' && (
        <GovernanceTab
          projectId={projectId}
          canAudit={canAudit}
        />
      )}
    </div>
  );
}
