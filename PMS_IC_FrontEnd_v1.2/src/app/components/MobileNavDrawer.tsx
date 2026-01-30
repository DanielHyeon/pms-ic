import { useEffect, useCallback, memo } from 'react';
import { X } from 'lucide-react';
import { UserRole } from '../../stores/authStore';
import Sidebar from './Sidebar';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
}

/**
 * Mobile navigation drawer component.
 * Renders the sidebar as a slide-out drawer on mobile devices.
 */
const MobileNavDrawer = memo(function MobileNavDrawer({
  isOpen,
  onClose,
  userRole,
}: MobileNavDrawerProps) {
  // Close on escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="fixed inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-in-out animate-in slide-in-from-left"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Sidebar content */}
        <Sidebar userRole={userRole} />
      </div>
    </div>
  );
});

export default MobileNavDrawer;
