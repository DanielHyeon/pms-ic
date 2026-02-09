import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense, ComponentType } from 'react';
import Layout from '../app/components/Layout';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore, UserRole } from '../stores/authStore';

// Lazy load all views for code splitting
const Dashboard = lazy(() => import('../app/components/Dashboard'));
const ProjectManagement = lazy(() => import('../app/components/ProjectManagement'));
const PartManagement = lazy(() => import('../app/components/PartManagement'));
const PartManagementV2 = lazy(() => import('../app/components/PartManagementV2'));
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
const SystemSettings = lazy(() => import('../app/components/SystemSettings'));
const LoginScreen = lazy(() => import('../app/components/LoginScreen'));

// Implemented pages
const WbsManagement = lazy(() => import('../app/components/WbsManagement'));
const TraceabilityManagement = lazy(() => import('../app/components/TraceabilityManagement'));
const IssuesPage = lazy(() => import('../app/components/IssuesPage'));
const DeliverablesPage = lazy(() => import('../app/components/DeliverablesPage'));
const MeetingsPage = lazy(() => import('../app/components/MeetingsPage'));

// Implemented pages (continued)
const TestingManagement = lazy(() => import('../app/components/TestingPage'));
const StatisticsPage = lazy(() => import('../app/components/StatisticsPage'));
const UserManagementPage = lazy(() => import('../app/components/UserManagementPage'));
const AuditLogsPage = lazy(() => import('../app/components/AuditLogsPage'));
const AnnouncementsPage = lazy(() => import('../app/components/AnnouncementsPage'));

// Placeholder pages for features under development
const AiAssistant = lazy(() => import('../app/components/PlaceholderPage').then(m => ({ default: m.AiAssistantPage })));
const ReportManagement = lazy(() => import('../app/components/ReportManagement'));
const PmoConsolePage = lazy(() => import('../app/components/PmoConsolePage'));
const PartDashboard = lazy(() => import('../app/components/PartDashboard'));

// Pages missing from router (existed in old App.tsx switch)
const SprintManagement = lazy(() => import('../app/components/SprintManagement'));
const MyWorkPage = lazy(() => import('../app/components/MyWorkPage'));
const DecisionRiskPage = lazy(() => import('../app/components/DecisionRiskPage'));
const AuditEvidencePage = lazy(() => import('../app/components/AuditEvidencePage'));
const PlaceholderPage = lazy(() => import('../app/components/PlaceholderPage'));
const ProjectAccountabilityPage = lazy(() => import('../app/components/ProjectAccountabilityPage'));
const RolePermissionPage = lazy(() => import('../app/components/RolePermissionPage'));

// Wrapper component to inject userRole from store
function withUserRole<P extends { userRole: UserRole }>(
  Component: ComponentType<P>
): ComponentType<Omit<P, 'userRole'>> {
  return function WrappedComponent(props: Omit<P, 'userRole'>) {
    const { user } = useAuthStore();
    // Default to auditor (read-only) for minimum privilege principle
    const userRole = user?.role || 'auditor';
    return <Component {...(props as P)} userRole={userRole} />;
  };
}

// Wrapped components with userRole injection
const DashboardWithRole = withUserRole(Dashboard);
const ProjectManagementWithRole = withUserRole(ProjectManagement);
const PartManagementWithRole = withUserRole(PartManagement);
const PartManagementV2WithRole = withUserRole(PartManagementV2);
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
const SystemSettingsWithRole = withUserRole(SystemSettings);
const ReportManagementWithRole = withUserRole(ReportManagement);
const WbsManagementWithRole = withUserRole(WbsManagement);
const TraceabilityManagementWithRole = withUserRole(TraceabilityManagement);
const IssuesPageWithRole = withUserRole(IssuesPage);
const DeliverablesPageWithRole = withUserRole(DeliverablesPage);
const MeetingsPageWithRole = withUserRole(MeetingsPage);
const TestingPageWithRole = withUserRole(TestingManagement);
const StatisticsPageWithRole = withUserRole(StatisticsPage);
const UserManagementPageWithRole = withUserRole(UserManagementPage);
const AuditLogsPageWithRole = withUserRole(AuditLogsPage);
const AnnouncementsPageWithRole = withUserRole(AnnouncementsPage);
const PmoConsolePageWithRole = withUserRole(PmoConsolePage);
const PartDashboardWithRole = withUserRole(PartDashboard);
const SprintManagementWithRole = withUserRole(SprintManagement);
const MyWorkPageWithRole = withUserRole(MyWorkPage);
const DecisionRiskPageWithRole = withUserRole(DecisionRiskPage);
const AuditEvidencePageWithRole = withUserRole(AuditEvidencePage);
const ProjectAccountabilityPageWithRole = withUserRole(ProjectAccountabilityPage);
const RolePermissionPageWithRole = withUserRole(RolePermissionPage);

function Loading() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        <span className="text-sm text-gray-500">로딩 중...</span>
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
      // Dashboard (standalone)
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <DashboardWithRole />
          </SuspenseWrapper>
        ),
      },

      // Project Setup Zone
      {
        path: 'projects',
        element: (
          <SuspenseWrapper>
            <ProjectManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'project-management',
        element: (
          <SuspenseWrapper>
            <ProjectAccountabilityPageWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'parts',
        element: (
          <SuspenseWrapper>
            <PartManagementV2WithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'parts/:partId/dashboard',
        element: (
          <ProtectedRoute requiredRoles={['admin', 'pmo_head', 'pm', 'sponsor', 'business_analyst', 'developer', 'qa']}>
            <SuspenseWrapper>
              <PartDashboardWithRole />
            </SuspenseWrapper>
          </ProtectedRoute>
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
        path: 'role-permission',
        element: (
          <SuspenseWrapper>
            <RolePermissionPageWithRole />
          </SuspenseWrapper>
        ),
      },

      // Requirements Management Zone
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
        path: 'traceability',
        element: (
          <SuspenseWrapper>
            <TraceabilityManagementWithRole />
          </SuspenseWrapper>
        ),
      },

      // Execution Management Zone
      {
        path: 'phases',
        element: (
          <SuspenseWrapper>
            <PhaseManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'wbs',
        element: (
          <SuspenseWrapper>
            <WbsManagementWithRole />
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
        path: 'kanban',
        element: (
          <SuspenseWrapper>
            <KanbanBoardWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'sprints',
        element: (
          <SuspenseWrapper>
            <SprintManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'my-work',
        element: (
          <SuspenseWrapper>
            <MyWorkPageWithRole />
          </SuspenseWrapper>
        ),
      },

      // Quality Management Zone
      {
        path: 'testing',
        element: (
          <SuspenseWrapper>
            <TestingPageWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'issues',
        element: (
          <SuspenseWrapper>
            <IssuesPageWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'deliverables',
        element: (
          <SuspenseWrapper>
            <DeliverablesPageWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'decisions',
        element: (
          <SuspenseWrapper>
            <DecisionRiskPageWithRole />
          </SuspenseWrapper>
        ),
      },

      // Collaboration Zone
      {
        path: 'meetings',
        element: (
          <SuspenseWrapper>
            <MeetingsPageWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'announcements',
        element: (
          <SuspenseWrapper>
            <AnnouncementsPageWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'ai-assistant',
        element: (
          <SuspenseWrapper>
            <AiAssistant />
          </SuspenseWrapper>
        ),
      },

      // Education Zone
      {
        path: 'education',
        element: (
          <SuspenseWrapper>
            <EducationManagementWithRole />
          </SuspenseWrapper>
        ),
      },

      // Analytics & Reports Zone
      {
        path: 'pmo-console',
        element: (
          <ProtectedRoute requiredRoles={['pmo_head', 'pm', 'admin', 'sponsor']}>
            <SuspenseWrapper>
              <PmoConsolePageWithRole />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'health-matrix',
        element: (
          <ProtectedRoute requiredRoles={['pmo_head', 'pm', 'admin', 'sponsor']}>
            <SuspenseWrapper>
              <PlaceholderPage title="Health Matrix" description="Multi-project health scoring matrix for PMO oversight." />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: 'audit-evidence',
        element: (
          <SuspenseWrapper>
            <AuditEvidencePageWithRole />
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
        path: 'reports',
        element: (
          <SuspenseWrapper>
            <ReportManagementWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'statistics',
        element: (
          <ProtectedRoute requiredRoles={['sponsor', 'pmo_head', 'pm', 'auditor', 'business_analyst', 'admin']}>
            <SuspenseWrapper>
              <StatisticsPageWithRole />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },

      // System Settings Zone
      {
        path: 'user-management',
        element: (
          <SuspenseWrapper>
            <UserManagementPageWithRole />
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
        path: 'audit-logs',
        element: (
          <SuspenseWrapper>
            <AuditLogsPageWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'system-settings',
        element: (
          <SuspenseWrapper>
            <SystemSettingsWithRole />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'admin-system',
        element: (
          <SuspenseWrapper>
            <SystemSettingsWithRole />
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
      {
        path: 'admin-project',
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
