import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense, ComponentType } from 'react';
import Layout from '../app/components/Layout';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore, UserRole } from '../stores/authStore';

// Lazy load all views for code splitting
const Dashboard = lazy(() => import('../app/components/Dashboard'));
const ProjectManagement = lazy(() => import('../app/components/ProjectManagement'));
const PartManagement = lazy(() => import('../app/components/PartManagement'));
const RfpManagement = lazy(() => import('../app/components/RfpManagement'));
const RequirementManagement = lazy(() => import('../app/components/RequirementManagement'));
const LineageManagement = lazy(() => import('../app/components/lineage').then(m => ({ default: m.LineageManagement })));
const PhaseManagement = lazy(() => import('../app/components/PhaseManagement'));
const KanbanBoard = lazy(() => import('../app/components/KanbanBoard'));
const BacklogManagement = lazy(() => import('../app/components/BacklogManagement'));
const RoleManagement = lazy(() => import('../app/components/RoleManagement'));
const CommonManagement = lazy(() => import('../app/components/CommonManagement'));
const EducationManagement = lazy(() => import('../app/components/EducationManagement'));
const Settings = lazy(() => import('../app/components/Settings'));
const LoginScreen = lazy(() => import('../app/components/LoginScreen'));

// Wrapper component to inject userRole from store
function withUserRole<P extends { userRole: UserRole }>(
  Component: ComponentType<P>
): ComponentType<Omit<P, 'userRole'>> {
  return function WrappedComponent(props: Omit<P, 'userRole'>) {
    const { user } = useAuthStore();
    const userRole = user?.role || 'pm';
    return <Component {...(props as P)} userRole={userRole} />;
  };
}

// Wrapped components with userRole injection
const DashboardWithRole = withUserRole(Dashboard);
const ProjectManagementWithRole = withUserRole(ProjectManagement);
const PartManagementWithRole = withUserRole(PartManagement);
const RfpManagementWithRole = withUserRole(RfpManagement);
const RequirementManagementWithRole = withUserRole(RequirementManagement);
const LineageManagementWithRole = withUserRole(LineageManagement);
const PhaseManagementWithRole = withUserRole(PhaseManagement);
const KanbanBoardWithRole = withUserRole(KanbanBoard);
const BacklogManagementWithRole = withUserRole(BacklogManagement);
const RoleManagementWithRole = withUserRole(RoleManagement);
const CommonManagementWithRole = withUserRole(CommonManagement);
const EducationManagementWithRole = withUserRole(EducationManagement);
const SettingsWithRole = withUserRole(Settings);

function Loading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    </div>
  );
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <SuspenseWrapper>
        <LoginScreen />
      </SuspenseWrapper>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <DashboardWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'projects',
        element: (
          <SuspenseWrapper>
            <ProjectManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'parts',
        element: (
          <SuspenseWrapper>
            <PartManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'rfp',
        element: (
          <SuspenseWrapper>
            <RfpManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'requirements',
        element: (
          <SuspenseWrapper>
            <RequirementManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'lineage',
        element: (
          <SuspenseWrapper>
            <LineageManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'phases',
        element: (
          <SuspenseWrapper>
            <PhaseManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'kanban',
        element: (
          <SuspenseWrapper>
            <KanbanBoardWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'backlog',
        element: (
          <SuspenseWrapper>
            <BacklogManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'roles',
        element: (
          <SuspenseWrapper>
            <RoleManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'common',
        element: (
          <SuspenseWrapper>
            <CommonManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'education',
        element: (
          <SuspenseWrapper>
            <EducationManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'settings',
        element: (
          <SuspenseWrapper>
            <SettingsWithRole />
          </SuspenseWrapper>
        ),
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
