import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

// Portal sub-paths that genuinely require an authenticated account.
// /portal/saved is intentionally public — saved articles live in localStorage.
const AUTH_REQUIRED_PATHS = ['/portal/dashboard', '/portal/history', '/portal/settings'];

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location   = useLocation();
  const isAuthed   = !!localStorage.getItem('token');
  const requiresAuth = AUTH_REQUIRED_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // Authenticated users sent to /login or /register go home
  if (isAuthed && isAuthPage) {
    return <Navigate to="/" replace />;
  }

  // Note: account-required pages render an inline sign-in prompt via
  // PortalLayout rather than redirecting — keeps users in flow.
  return <>{children}</>;
};

export default ProtectedRoute;
