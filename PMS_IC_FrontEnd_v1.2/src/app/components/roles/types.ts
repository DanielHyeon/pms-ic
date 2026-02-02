import { ProjectRole, SystemRole } from '../../../types/auth';

// Tab type for main RoleManagement component
export type TabType = 'users' | 'system' | 'project';

// Role definition for display purposes
export interface Role {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  userCount: number;
}

// Permission definition with role access matrix
export interface Permission {
  id: string;
  category: string;
  name: string;
  roles: {
    sponsor: boolean;
    pmo_head: boolean;
    pm: boolean;
    developer: boolean;
    qa: boolean;
    business_analyst: boolean;
    auditor: boolean;
    admin: boolean;
  };
}

// System user for admin management
export interface SystemUser {
  id: string;
  name: string;
  email: string;
  department: string;
  systemRole: SystemRole;
  legacyRole: string;
  status: 'active' | 'inactive';
  createdAt: string;
  projectRoles?: { projectId: string; projectName: string; role: ProjectRole }[];
}

// Project member type
export interface ProjectMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: ProjectRole;
  partName?: string;
  assignedAt: string;
}

// Message type for feedback alerts
export interface Message {
  type: 'success' | 'error';
  text: string;
}
