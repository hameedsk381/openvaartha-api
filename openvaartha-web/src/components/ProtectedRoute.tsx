import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location   = useLocation();
  const isAuthed   = !!localStorage.getItem('token');
  const isPortal   = location.pathname.startsWith('/portal');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // Only portal routes require auth — news and content are public
  if (!isAuthed && isPortal) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated users sent to /login or /register go home
  if (isAuthed && isAuthPage) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
