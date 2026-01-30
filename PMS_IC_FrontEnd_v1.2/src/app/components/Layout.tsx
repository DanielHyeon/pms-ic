import { Outlet, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AIAssistant from './AIAssistant';
import ToastContainer from './ToastContainer';
import ErrorBoundary from './ErrorBoundary';
import MobileNavDrawer from './MobileNavDrawer';
import { ProjectProvider } from '../../contexts/ProjectContext';
import { useAuthStore, canUseAI as checkCanUseAI } from '../../stores/authStore';
import { useIsMobile } from './ui/use-mobile';

export default function Layout() {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isMobile = useIsMobile();

  // Default to auditor (read-only) for minimum privilege principle
  const userRole = user?.role || 'auditor';
  const canUseAI = checkCanUseAI(user?.role);

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
          <Sidebar userRole={userRole} />
        </div>

        {/* Mobile navigation drawer */}
        <MobileNavDrawer
          isOpen={mobileNavOpen}
          onClose={handleMobileNavClose}
          userRole={userRole}
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
