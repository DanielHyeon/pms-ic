import { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Dashboard from './components/Dashboard';
import PhaseManagement from './components/PhaseManagement';
import KanbanBoard from './components/KanbanBoard';
import BacklogManagement from './components/BacklogManagement';
import RoleManagement from './components/RoleManagement';
import AIAssistant from './components/AIAssistant';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import Settings from './components/Settings';
import SystemSettings from './components/SystemSettings';
import EducationManagement from './components/EducationManagement';
import CommonManagement from './components/CommonManagement';
import ProjectManagement from './components/ProjectManagement';
import PartManagement from './components/PartManagement';
import RfpManagement from './components/RfpManagement';
import RequirementManagement from './components/RequirementManagement';
import { LineageManagement } from './components/lineage';
import { ProjectProvider } from '../contexts/ProjectContext';
import ToastContainer from './components/ToastContainer';
import { ProjectShell } from './components/workbench/ProjectShell';
import WbsManagement from './components/WbsManagement';
import IssuesPage from './components/IssuesPage';
import TestingPage from './components/TestingPage';
import DeliverablesPage from './components/DeliverablesPage';
import MeetingsPage from './components/MeetingsPage';
import AnnouncementsPage from './components/AnnouncementsPage';
import ReportManagement from './components/ReportManagement';
import StatisticsPage from './components/StatisticsPage';
import PmoConsolePage from './components/PmoConsolePage';
import AuditLogsPage from './components/AuditLogsPage';
import UserManagementPage from './components/UserManagementPage';
import SprintManagement from './components/SprintManagement';
import MyWorkPage from './components/MyWorkPage';
import PlaceholderPage from './components/PlaceholderPage';
import DecisionRiskPage from './components/DecisionRiskPage';
import AuditEvidencePage from './components/AuditEvidencePage';

export type View =
  | 'dashboard'
  | 'projects'
  | 'parts'
  | 'rfp'
  | 'requirements'
  | 'lineage'
  | 'phases'
  | 'kanban'
  | 'backlog'
  | 'workbench'
  | 'roles'
  | 'common'
  | 'education'
  | 'settings'
  | 'system-settings'
  | 'wbs'
  | 'issues'
  | 'tests'
  | 'deliverables'
  | 'meetings'
  | 'announcements'
  | 'reports'
  | 'statistics'
  | 'pmo'
  | 'audit-evidence'
  | 'ai-assistant'
  | 'admin-project'
  | 'admin-system'
  | 'sprints'
  | 'my-work'
  | 'decisions'
  | 'health-matrix'
  | 'pmo-console'
  | 'audit-logs'
  | 'user-management';

export type UserRole = 'sponsor' | 'pmo_head' | 'pm' | 'developer' | 'qa' | 'business_analyst' | 'auditor' | 'admin';

export interface UserInfo {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  department: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const handleLogin = (userInfo: UserInfo) => {
    setCurrentUser(userInfo);
    setIsLoggedIn(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setAiPanelOpen(false);
  };

  const canUseAI = !!currentUser?.role && ['sponsor', 'pmo_head', 'pm', 'developer', 'qa', 'business_analyst', 'admin'].includes(currentUser.role);

  const renderContent = () => {
    const userRole = currentUser?.role || 'pm';

    switch (currentView) {
      case 'dashboard':
        return <Dashboard userRole={userRole} />;
      case 'projects':
        return <ProjectManagement userRole={userRole} />;
      case 'parts':
        return <PartManagement userRole={userRole} />;
      case 'rfp':
        return <RfpManagement userRole={userRole} />;
      case 'requirements':
        return <RequirementManagement userRole={userRole} />;
      case 'lineage':
        return <LineageManagement userRole={userRole} />;
      case 'phases':
        return <PhaseManagement userRole={userRole} />;
      case 'kanban':
        return <KanbanBoard userRole={userRole} />;
      case 'backlog':
        return <BacklogManagement userRole={userRole} />;
      case 'workbench':
        return <ProjectShell />;
      case 'roles':
        return <RoleManagement userRole={userRole} />;
      case 'common':
        return <CommonManagement userRole={userRole} />;
      case 'education':
        return <EducationManagement userRole={userRole} />;
      case 'system-settings':
        return <SystemSettings userRole={userRole} />;
      case 'settings':
        return <Settings userRole={userRole} />;
      case 'wbs':
        return <WbsManagement userRole={userRole} />;
      case 'issues':
        return <IssuesPage userRole={userRole} />;
      case 'tests':
        return <TestingPage userRole={userRole} />;
      case 'deliverables':
        return <DeliverablesPage userRole={userRole} />;
      case 'meetings':
        return <MeetingsPage userRole={userRole} />;
      case 'announcements':
        return <AnnouncementsPage userRole={userRole} />;
      case 'reports':
        return <ReportManagement userRole={userRole} />;
      case 'statistics':
        return <StatisticsPage userRole={userRole} />;
      case 'pmo':
      case 'pmo-console':
        return <PmoConsolePage userRole={userRole} />;
      case 'audit-logs':
        return <AuditLogsPage userRole={userRole} />;
      case 'user-management':
        return <UserManagementPage userRole={userRole} />;
      case 'ai-assistant':
        return <PlaceholderPage title="AI Assistant" description="AI Assistant is accessible from the header panel toggle." />;
      case 'admin-project':
        return <PlaceholderPage title="Project Settings" description="Project-level configuration and member management." />;
      case 'admin-system':
        return <PlaceholderPage title="System Administration" description="System-wide settings and user account management." />;
      case 'sprints':
        return <SprintManagement userRole={userRole} />;
      case 'my-work':
        return <MyWorkPage userRole={userRole} />;
      case 'decisions':
        return <DecisionRiskPage userRole={userRole} />;
      case 'health-matrix':
        return <PlaceholderPage title="Health Matrix" description="Multi-project health scoring matrix for PMO oversight." />;
      case 'audit-evidence':
        return <AuditEvidencePage userRole={userRole} />;
      default:
        return <Dashboard userRole={userRole} />;
    }
  };

  if (!isLoggedIn || !currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          currentView={currentView}
          onViewChange={(view: string) => setCurrentView(view as View)}
          userRole={currentUser.role}
        />

        <ProjectProvider>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              currentUser={currentUser}
              onAIToggle={() => setAiPanelOpen(!aiPanelOpen)}
              onLogout={handleLogout}
              canUseAI={canUseAI}
            />

            <main className="flex-1 overflow-auto">
              {renderContent()}
            </main>
          </div>

          {aiPanelOpen && canUseAI && (
            <AIAssistant onClose={() => setAiPanelOpen(false)} userRole={currentUser.role} />
          )}
        </ProjectProvider>
        <ToastContainer />
      </div>
    </DndProvider>
  );
}
