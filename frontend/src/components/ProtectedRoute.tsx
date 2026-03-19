import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Layout from './Layout';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireManager?: boolean;
  requireSales?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireManager = false,
  requireSales = false,
}) => {
  const { isAuthenticated, isManager, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireManager && !isManager) {
    return <Navigate to="/" replace />;
  }

  if (requireSales && user?.role !== 'sales') {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

export default ProtectedRoute;
