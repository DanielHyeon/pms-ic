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

// Re-export menu access from menuConfig for backward compatibility
export { menuAccessByRole, canAccessMenu } from '../config/menuConfig';

// Helper to check if user can use AI assistant
export function canUseAI(role: UserRole | undefined): boolean {
  if (!role) return false;
  return ['sponsor', 'pmo_head', 'pm', 'developer', 'qa', 'business_analyst', 'admin'].includes(role);
}
