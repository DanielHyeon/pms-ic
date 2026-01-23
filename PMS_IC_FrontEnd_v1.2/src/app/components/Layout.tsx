import { Outlet, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AIAssistant from './AIAssistant';
import ToastContainer from './ToastContainer';
import ErrorBoundary from './ErrorBoundary';
import { ProjectProvider } from '../../contexts/ProjectContext';
import { useAuthStore, canUseAI as checkCanUseAI } from '../../stores/authStore';

export default function Layout() {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const userRole = user?.role || 'pm';
  const canUseAI = checkCanUseAI(user?.role);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
    role: 'pm' as const,
    email: '',
    department: '',
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar userRole={userRole} />

        <ProjectProvider>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              currentUser={currentUser}
              onAIToggle={() => setAiPanelOpen(!aiPanelOpen)}
              onLogout={handleLogout}
              canUseAI={canUseAI}
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
