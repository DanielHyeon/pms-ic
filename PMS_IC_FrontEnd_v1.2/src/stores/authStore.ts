import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'sponsor' | 'pmo_head' | 'pm' | 'developer' | 'qa' | 'business_analyst' | 'auditor' | 'admin';

export interface UserInfo {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  department: string;
}

interface AuthState {
  // State
  user: UserInfo | null;
  isAuthenticated: boolean;
  token: string | null;

  // Actions
  login: (userInfo: UserInfo, token?: string) => void;
  logout: () => void;
  setUser: (userInfo: UserInfo) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,

      login: (userInfo, token) => {
        set({
          user: userInfo,
          isAuthenticated: true,
          token: token || 'mock-token',
        });
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          token: null,
        });
        // Clear other stored data
        localStorage.removeItem('currentProjectId');
      },

      setUser: (userInfo) => {
        set({ user: userInfo });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
      }),
    }
  )
);

// Role-based menu access configuration
export const menuAccessByRole: Record<UserRole, string[]> = {
  sponsor: ['dashboard', 'rfp', 'requirements', 'lineage', 'phases', 'roles', 'common', 'education', 'settings'],
  pmo_head: ['dashboard', 'projects', 'parts', 'rfp', 'requirements', 'lineage', 'phases', 'kanban', 'backlog', 'roles', 'common', 'education', 'settings'],
  pm: ['dashboard', 'projects', 'parts', 'rfp', 'requirements', 'lineage', 'phases', 'kanban', 'backlog', 'common', 'education', 'settings'],
  developer: ['dashboard', 'requirements', 'lineage', 'kanban', 'backlog', 'education', 'settings'],
  qa: ['dashboard', 'requirements', 'lineage', 'kanban', 'backlog', 'education', 'settings'],
  business_analyst: ['dashboard', 'rfp', 'requirements', 'lineage', 'phases', 'backlog', 'education', 'settings'],
  auditor: ['dashboard', 'requirements', 'lineage', 'phases', 'roles', 'settings'],
  admin: ['dashboard', 'projects', 'parts', 'rfp', 'requirements', 'lineage', 'phases', 'kanban', 'backlog', 'roles', 'common', 'education', 'settings'],
};

// Helper to check if user can access a specific menu
export function canAccessMenu(role: UserRole | undefined, menuId: string): boolean {
  if (!role) return false;
  return menuAccessByRole[role]?.includes(menuId) ?? false;
}

// Helper to check if user can use AI assistant
export function canUseAI(role: UserRole | undefined): boolean {
  if (!role) return false;
  return ['sponsor', 'pmo_head', 'pm', 'developer', 'qa', 'business_analyst'].includes(role);
}
