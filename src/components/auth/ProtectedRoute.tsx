import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { LoadingIndicator } from '../ui/LoadingIndicator';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAuthLoading } = useUser();
  const location = useLocation();

  if (isAuthLoading) {
    return <LoadingIndicator fullScreen centered text="Verificando sessão..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}; 