import { UserRole } from '../app/App';

/**
 * Centralized role-based permission checks
 * Eliminates duplicate permission logic across components
 */

// Edit permissions
const EDIT_ROLES: UserRole[] = ['pm', 'developer', 'qa', 'pmo_head', 'sponsor', 'admin'];
const READ_ONLY_ROLES: UserRole[] = ['auditor', 'business_analyst'];

// Approval permissions
const APPROVE_ROLES: UserRole[] = ['sponsor', 'pmo_head', 'pm'];

// Upload permissions
const UPLOAD_ROLES: UserRole[] = ['pm', 'developer', 'qa', 'pmo_head'];

// KPI management permissions
const KPI_MANAGE_ROLES: UserRole[] = ['pm', 'pmo_head'];

// Phase management permissions
const PHASE_MANAGE_ROLES: UserRole[] = ['sponsor', 'pmo_head', 'pm'];

// Budget view permissions
const BUDGET_VIEW_ROLES: UserRole[] = ['sponsor', 'pmo_head', 'pm'];

// Prioritization permissions
const PRIORITIZE_ROLES: UserRole[] = ['pm', 'pmo_head'];

// Portfolio view roles
const PORTFOLIO_VIEW_ROLES: UserRole[] = ['pmo_head', 'admin'];

export const canEdit = (role: UserRole): boolean =>
  !READ_ONLY_ROLES.includes(role);

export const canApprove = (role: UserRole): boolean =>
  APPROVE_ROLES.includes(role);

export const canUpload = (role: UserRole): boolean =>
  UPLOAD_ROLES.includes(role);

export const canManageKpi = (role: UserRole): boolean =>
  KPI_MANAGE_ROLES.includes(role);

export const canManagePhases = (role: UserRole): boolean =>
  PHASE_MANAGE_ROLES.includes(role);

export const canViewBudget = (role: UserRole): boolean =>
  BUDGET_VIEW_ROLES.includes(role);

export const canPrioritize = (role: UserRole): boolean =>
  PRIORITIZE_ROLES.includes(role);

export const isReadOnly = (role: UserRole): boolean =>
  READ_ONLY_ROLES.includes(role);

export const canViewPortfolio = (role: UserRole): boolean =>
  PORTFOLIO_VIEW_ROLES.includes(role);

/**
 * Check multiple permissions at once
 */
export interface RolePermissions {
  canEdit: boolean;
  canApprove: boolean;
  canUpload: boolean;
  canManageKpi: boolean;
  canManagePhases: boolean;
  canViewBudget: boolean;
  canPrioritize: boolean;
  isReadOnly: boolean;
  canViewPortfolio: boolean;
}

export const getRolePermissions = (role: UserRole): RolePermissions => ({
  canEdit: canEdit(role),
  canApprove: canApprove(role),
  canUpload: canUpload(role),
  canManageKpi: canManageKpi(role),
  canManagePhases: canManagePhases(role),
  canViewBudget: canViewBudget(role),
  canPrioritize: canPrioritize(role),
  isReadOnly: isReadOnly(role),
  canViewPortfolio: canViewPortfolio(role),
});
