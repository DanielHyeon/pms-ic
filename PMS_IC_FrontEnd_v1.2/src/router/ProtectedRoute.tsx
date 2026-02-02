import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuthStore } from '../stores/authStore';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    // Redirect to login page with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRoles && user?.role && !requiredRoles.includes(user.role)) {
    // Redirect to dashboard if user doesn't have required role
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
