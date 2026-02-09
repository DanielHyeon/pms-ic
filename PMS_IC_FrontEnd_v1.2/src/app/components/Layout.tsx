import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useState, useCallback, useMemo } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AIAssistant from './AIAssistant';
import ToastContainer from './ToastContainer';
import ErrorBoundary from './ErrorBoundary';
import MobileNavDrawer from './MobileNavDrawer';
import { ProjectProvider } from '../../contexts/ProjectContext';
import { useAuthStore, canUseAI as checkCanUseAI } from '../../stores/authStore';
import { useIsMobile } from './ui/use-mobile';

// Map menu ontology nodeIds to router paths
const NODE_TO_PATH: Record<string, string> = {
  'dashboard': '/',
  'rfp': '/rfp',
  'requirements': '/requirements',
  'backlog': '/backlog',
  'wbs': '/wbs',
  'phases': '/phases',
  'kanban': '/kanban',
  'sprints': '/sprints',
  'my-work': '/my-work',
  'issues': '/issues',
  'tests': '/testing',
  'deliverables': '/deliverables',
  'decisions': '/decisions',
  'lineage': '/lineage',
  'reports': '/reports',
  'statistics': '/statistics',
  'pmo': '/pmo-console',
  'health-matrix': '/health-matrix',
  'audit-evidence': '/audit-evidence',
  'meetings': '/meetings',
  'announcements': '/announcements',
  'ai-assistant': '/ai-assistant',
  'education': '/education',
  'projects': '/projects',
  'parts': '/parts',
  'roles': '/roles',
  'user-management': '/user-management',
  'admin-project': '/settings',
  'admin-system': '/system-settings',
};

// Reverse map: router path → nodeId
const PATH_TO_NODE: Record<string, string> = Object.fromEntries(
  Object.entries(NODE_TO_PATH).map(([nodeId, path]) => [path, nodeId]),
);

export default function Layout() {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const isMobile = useIsMobile();

  // Default to auditor (read-only) for minimum privilege principle
  const userRole = user?.role || 'auditor';
  const canUseAI = checkCanUseAI(user?.role);

  // Derive current sidebar view from the router path
  const currentView = useMemo(() => {
    return PATH_TO_NODE[location.pathname] || 'dashboard';
  }, [location.pathname]);

  // Navigate to the route corresponding to the sidebar nodeId
  const handleViewChange = useCallback((nodeId: string) => {
    const path = NODE_TO_PATH[nodeId];
    if (path) {
      navigate(path);
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleMobileNavToggle = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const handleMobileNavClose = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  // Create userInfo object compatible with Header
  const currentUser = user ? {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    department: user.department,
  } : {
    id: '',
    name: 'Guest',
    role: 'auditor' as const,
    email: '',
    department: '',
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-50">
        {/* Desktop sidebar - hidden on mobile, fixed height */}
        <div className="hidden md:flex h-full">
          <Sidebar userRole={userRole} currentView={currentView} onViewChange={handleViewChange} />
        </div>

        {/* Mobile navigation drawer */}
        <MobileNavDrawer
          isOpen={mobileNavOpen}
          onClose={handleMobileNavClose}
          userRole={userRole}
          currentView={currentView}
          onViewChange={handleViewChange}
        />

        <ProjectProvider>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              currentUser={currentUser}
              onAIToggle={() => setAiPanelOpen(!aiPanelOpen)}
              onLogout={handleLogout}
              canUseAI={canUseAI}
              onMobileMenuToggle={handleMobileNavToggle}
              isMobile={isMobile}
            />

            <main className="flex-1 overflow-auto">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </main>
          </div>

          {aiPanelOpen && canUseAI && (
            <AIAssistant onClose={() => setAiPanelOpen(false)} userRole={userRole} />
          )}
        </ProjectProvider>
        <ToastContainer />
      </div>
    </DndProvider>
  );
}
