/**
 * Tests for rolePermissions utility functions
 */
import { describe, it, expect } from 'vitest'
import {
  canEdit,
  canApprove,
  canUpload,
  canManageKpi,
  canManagePhases,
  canViewBudget,
  canPrioritize,
  isReadOnly,
  canViewPortfolio,
  getRolePermissions,
  type RolePermissions,
} from './rolePermissions'
import type { UserRole } from '../app/App'

// Define all roles for comprehensive testing
const ALL_ROLES: UserRole[] = [
  'sponsor',
  'pmo_head',
  'pm',
  'developer',
  'qa',
  'business_analyst',
  'auditor',
  'admin',
]

const READ_ONLY_ROLES: UserRole[] = ['auditor', 'business_analyst']
const EDIT_CAPABLE_ROLES: UserRole[] = ['pm', 'developer', 'qa', 'pmo_head', 'sponsor', 'admin']

describe('canEdit', () => {
  describe('edit capable roles', () => {
    it.each(EDIT_CAPABLE_ROLES)('should return true for %s', (role) => {
      expect(canEdit(role)).toBe(true)
    })
  })

  describe('read-only roles', () => {
    it.each(READ_ONLY_ROLES)('should return false for %s', (role) => {
      expect(canEdit(role)).toBe(false)
    })
  })
})

describe('canPrioritize', () => {
  const PRIORITIZE_ALLOWED: UserRole[] = ['pm', 'pmo_head']
  const PRIORITIZE_DENIED: UserRole[] = ['sponsor', 'developer', 'qa', 'business_analyst', 'auditor', 'admin']

  describe('roles with prioritization permission', () => {
    it.each(PRIORITIZE_ALLOWED)('should return true for %s', (role) => {
      expect(canPrioritize(role)).toBe(true)
    })
  })

  describe('roles without prioritization permission', () => {
    it.each(PRIORITIZE_DENIED)('should return false for %s', (role) => {
      expect(canPrioritize(role)).toBe(false)
    })
  })
})

describe('canApprove', () => {
  const APPROVE_ALLOWED: UserRole[] = ['sponsor', 'pmo_head', 'pm']
  const APPROVE_DENIED: UserRole[] = ['developer', 'qa', 'business_analyst', 'auditor', 'admin']

  describe('roles with approval permission', () => {
    it.each(APPROVE_ALLOWED)('should return true for %s', (role) => {
      expect(canApprove(role)).toBe(true)
    })
  })

  describe('roles without approval permission', () => {
    it.each(APPROVE_DENIED)('should return false for %s', (role) => {
      expect(canApprove(role)).toBe(false)
    })
  })
})

describe('canUpload', () => {
  const UPLOAD_ALLOWED: UserRole[] = ['pm', 'developer', 'qa', 'pmo_head']
  const UPLOAD_DENIED: UserRole[] = ['sponsor', 'business_analyst', 'auditor', 'admin']

  describe('roles with upload permission', () => {
    it.each(UPLOAD_ALLOWED)('should return true for %s', (role) => {
      expect(canUpload(role)).toBe(true)
    })
  })

  describe('roles without upload permission', () => {
    it.each(UPLOAD_DENIED)('should return false for %s', (role) => {
      expect(canUpload(role)).toBe(false)
    })
  })
})

describe('canManageKpi', () => {
  const KPI_ALLOWED: UserRole[] = ['pm', 'pmo_head']
  const KPI_DENIED: UserRole[] = ['sponsor', 'developer', 'qa', 'business_analyst', 'auditor', 'admin']

  describe('roles with KPI management permission', () => {
    it.each(KPI_ALLOWED)('should return true for %s', (role) => {
      expect(canManageKpi(role)).toBe(true)
    })
  })

  describe('roles without KPI management permission', () => {
    it.each(KPI_DENIED)('should return false for %s', (role) => {
      expect(canManageKpi(role)).toBe(false)
    })
  })
})

describe('canManagePhases', () => {
  const PHASE_ALLOWED: UserRole[] = ['sponsor', 'pmo_head', 'pm']
  const PHASE_DENIED: UserRole[] = ['developer', 'qa', 'business_analyst', 'auditor', 'admin']

  describe('roles with phase management permission', () => {
    it.each(PHASE_ALLOWED)('should return true for %s', (role) => {
      expect(canManagePhases(role)).toBe(true)
    })
  })

  describe('roles without phase management permission', () => {
    it.each(PHASE_DENIED)('should return false for %s', (role) => {
      expect(canManagePhases(role)).toBe(false)
    })
  })
})

describe('canViewBudget', () => {
  const BUDGET_ALLOWED: UserRole[] = ['sponsor', 'pmo_head', 'pm']
  const BUDGET_DENIED: UserRole[] = ['developer', 'qa', 'business_analyst', 'auditor', 'admin']

  describe('roles with budget view permission', () => {
    it.each(BUDGET_ALLOWED)('should return true for %s', (role) => {
      expect(canViewBudget(role)).toBe(true)
    })
  })

  describe('roles without budget view permission', () => {
    it.each(BUDGET_DENIED)('should return false for %s', (role) => {
      expect(canViewBudget(role)).toBe(false)
    })
  })
})

describe('isReadOnly', () => {
  describe('read-only roles', () => {
    it.each(READ_ONLY_ROLES)('should return true for %s', (role) => {
      expect(isReadOnly(role)).toBe(true)
    })
  })

  describe('non read-only roles', () => {
    it.each(EDIT_CAPABLE_ROLES)('should return false for %s', (role) => {
      expect(isReadOnly(role)).toBe(false)
    })
  })
})

describe('canViewPortfolio', () => {
  const PORTFOLIO_ALLOWED: UserRole[] = ['pmo_head', 'admin']
  const PORTFOLIO_DENIED: UserRole[] = ['sponsor', 'pm', 'developer', 'qa', 'business_analyst', 'auditor']

  describe('roles with portfolio view permission', () => {
    it.each(PORTFOLIO_ALLOWED)('should return true for %s', (role) => {
      expect(canViewPortfolio(role)).toBe(true)
    })
  })

  describe('roles without portfolio view permission', () => {
    it.each(PORTFOLIO_DENIED)('should return false for %s', (role) => {
      expect(canViewPortfolio(role)).toBe(false)
    })
  })
})

describe('getRolePermissions', () => {
  describe('complete permission object', () => {
    it('should return all permissions for pm role', () => {
      const permissions = getRolePermissions('pm')
      expect(permissions).toEqual({
        canEdit: true,
        canApprove: true,
        canUpload: true,
        canManageKpi: true,
        canManagePhases: true,
        canViewBudget: true,
        canPrioritize: true,
        isReadOnly: false,
        canViewPortfolio: false,
      })
    })

    it('should return all permissions for auditor role', () => {
      const permissions = getRolePermissions('auditor')
      expect(permissions).toEqual({
        canEdit: false,
        canApprove: false,
        canUpload: false,
        canManageKpi: false,
        canManagePhases: false,
        canViewBudget: false,
        canPrioritize: false,
        isReadOnly: true,
        canViewPortfolio: false,
      })
    })

    it('should return all permissions for pmo_head role', () => {
      const permissions = getRolePermissions('pmo_head')
      expect(permissions).toEqual({
        canEdit: true,
        canApprove: true,
        canUpload: true,
        canManageKpi: true,
        canManagePhases: true,
        canViewBudget: true,
        canPrioritize: true,
        isReadOnly: false,
        canViewPortfolio: true,
      })
    })

    it('should return all permissions for admin role', () => {
      const permissions = getRolePermissions('admin')
      expect(permissions).toEqual({
        canEdit: true,
        canApprove: false,
        canUpload: false,
        canManageKpi: false,
        canManagePhases: false,
        canViewBudget: false,
        canPrioritize: false,
        isReadOnly: false,
        canViewPortfolio: true,
      })
    })
  })

  describe('consistency between individual functions and aggregate', () => {
    it.each(ALL_ROLES)('should have consistent permissions for %s', (role) => {
      const aggregate = getRolePermissions(role)
      expect(aggregate.canEdit).toBe(canEdit(role))
      expect(aggregate.canApprove).toBe(canApprove(role))
      expect(aggregate.canUpload).toBe(canUpload(role))
      expect(aggregate.canManageKpi).toBe(canManageKpi(role))
      expect(aggregate.canManagePhases).toBe(canManagePhases(role))
      expect(aggregate.canViewBudget).toBe(canViewBudget(role))
      expect(aggregate.canPrioritize).toBe(canPrioritize(role))
      expect(aggregate.isReadOnly).toBe(isReadOnly(role))
      expect(aggregate.canViewPortfolio).toBe(canViewPortfolio(role))
    })
  })
})

describe('permission matrix sanity checks', () => {
  it('read-only roles should not have edit permission', () => {
    READ_ONLY_ROLES.forEach((role) => {
      expect(canEdit(role)).toBe(false)
      expect(isReadOnly(role)).toBe(true)
    })
  })

  it('canEdit and isReadOnly should be mutually exclusive', () => {
    ALL_ROLES.forEach((role) => {
      expect(canEdit(role)).not.toBe(isReadOnly(role))
    })
  })

  it('pmo_head should have the most permissions', () => {
    const pmoPermissions = getRolePermissions('pmo_head')
    const trueCount = Object.values(pmoPermissions).filter((v) => v === true).length
    // pmo_head should have 8 true permissions (all except isReadOnly)
    expect(trueCount).toBe(8)
  })
})
