import { UserInfo } from '../App';
import { Bell, Bot, User, LogOut, Shield, FolderKanban, ChevronDown, Menu } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useProject } from '../../contexts/ProjectContext';

interface HeaderProps {
  currentUser: UserInfo;
  onAIToggle: () => void;
  onLogout: () => void;
  canUseAI: boolean;
  onMobileMenuToggle?: () => void;
  isMobile?: boolean;
}

const roleNames: Record<string, string> = {
  sponsor: '프로젝트 스폰서',
  pmo_head: 'PMO 총괄',
  pm: '프로젝트 관리자',
  developer: '개발팀',
  qa: 'QA팀',
  business_analyst: '현업 분석가',
  auditor: '외부 감리',
  admin: '시스템 관리자',
};

export default function Header({
  currentUser,
  onAIToggle,
  onLogout,
  canUseAI,
  onMobileMenuToggle,
  isMobile,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const { currentProject, projects, selectProject } = useProject();

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on Escape key press
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setShowProjectMenu(false);
      setShowUserMenu(false);
    }
  }, []);

  // Close menus when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
      setShowProjectMenu(false);
    }
    if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
      setShowUserMenu(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleKeyDown, handleClickOutside]);

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Mobile menu button */}
        {isMobile && onMobileMenuToggle && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Open navigation menu"
            className="mr-3 p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 md:hidden"
          >
            <Menu size={24} aria-hidden="true" />
          </button>
        )}

        {/* 프로젝트 정보 */}
        <div className="relative flex-1 md:flex-none" ref={projectMenuRef}>
          <button
            type="button"
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            aria-expanded={showProjectMenu ? 'true' : 'false'}
            aria-haspopup="true"
            aria-label={`Current project: ${currentProject?.name || 'Select a project'}. Click to switch projects`}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -ml-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FolderKanban className="text-blue-600" size={20} aria-hidden="true" />
            </div>
            <div className="text-left hidden sm:block">
              <h2 className="text-lg font-semibold text-gray-900 truncate max-w-[200px] lg:max-w-none">
                {currentProject?.name || '프로젝트를 선택하세요'}
              </h2>
              <p className="text-sm text-gray-500">
                {currentProject?.code ? `Project Code: ${currentProject.code}` : '프로젝트 관리에서 선택'}
              </p>
            </div>
            <ChevronDown className="text-gray-400 hidden sm:block" size={20} aria-hidden="true" />
          </button>

          {/* 프로젝트 빠른 전환 메뉴 */}
          {showProjectMenu && (
            <div
              role="menu"
              aria-label="Project selection menu"
              className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
            >
              <div className="p-3 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase">빠른 프로젝트 전환</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    프로젝트가 없습니다
                  </div>
                ) : (
                  projects.map((project) => (
                    <button
                      type="button"
                      role="menuitem"
                      key={project.id}
                      onClick={() => {
                        selectProject(project.id);
                        setShowProjectMenu(false);
                      }}
                      aria-current={currentProject?.id === project.id ? 'true' : undefined}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left focus:outline-none focus:bg-gray-100 ${
                        currentProject?.id === project.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        currentProject?.id === project.id ? 'bg-blue-200' : 'bg-gray-200'
                      }`}>
                        <FolderKanban size={16} aria-hidden="true" className={
                          currentProject?.id === project.id ? 'text-blue-600' : 'text-gray-500'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          currentProject?.id === project.id ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {project.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {project.status === 'IN_PROGRESS' ? '진행 중' :
                           project.status === 'COMPLETED' ? '완료' :
                           project.status === 'PLANNING' ? '계획' : project.status}
                          {' · '}{project.progress}%
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {canUseAI && (
            <button
              type="button"
              onClick={onAIToggle}
              aria-label="AI Assistant"
              className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <Bot size={20} aria-hidden="true" />
              <span className="hidden md:inline">AI 어시스턴트</span>
            </button>
          )}

          <button
            type="button"
            aria-label="Notifications (unread)"
            className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Bell size={20} aria-hidden="true" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>
          </button>

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              aria-expanded={showUserMenu ? 'true' : 'false'}
              aria-haspopup="true"
              aria-label={`User menu for ${currentUser.name}`}
              className="flex items-center gap-2 md:gap-3 md:pl-4 md:border-l border-gray-200 hover:bg-gray-50 rounded-lg p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-500">{roleNames[currentUser.role]}</p>
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                <User size={18} aria-hidden="true" className="md:w-5 md:h-5" />
              </div>
            </button>

            {showUserMenu && (
              <div
                role="menu"
                aria-label="User menu"
                className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
              >
                <div className="p-4 border-b border-gray-200">
                  <p className="font-medium text-gray-900">{currentUser.name}</p>
                  <p className="text-sm text-gray-500">{currentUser.email}</p>
                  <p className="text-xs text-gray-400 mt-1">{currentUser.department}</p>
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    <Shield size={12} aria-hidden="true" />
                    <span>{roleNames[currentUser.role]}</span>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none focus:bg-red-50"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}