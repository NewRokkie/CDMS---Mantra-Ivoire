import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ModuleAccess } from '../../types';
import { AccessDenied } from '../Common/AccessDenied';

interface ProtectedRouteProps {
  path?: string;
  moduleKey: keyof ModuleAccess;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

/**
 * ProtectedRoute component ensures that:
 * 1. User is authenticated
 * 2. User has permission to access the specific module
 * 3. Provides appropriate fallbacks for unauthorized access
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  moduleKey,
  children,
  fallback,
  requireAuth = true
}) => {
  const { isAuthenticated, hasModuleAccess } = useAuth();

  // Check authentication first
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check module access permission
  if (!hasModuleAccess(moduleKey)) {
    return fallback || <AccessDenied />;
  }

  // User is authenticated and has permission
  return <>{children}</>;
};

/**
 * Higher-order component to wrap existing components with route protection
 */
export const withRouteProtection = <P extends object>(
  Component: React.ComponentType<P>,
  moduleKey: keyof ModuleAccess,
  requireAuth = true
) => {
  const ProtectedComponent: React.FC<P> = (props) => (
    <ProtectedRoute moduleKey={moduleKey} requireAuth={requireAuth}>
      <Component {...props} />
    </ProtectedRoute>
  );

  ProtectedComponent.displayName = `withRouteProtection(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
};

/**
 * Route configuration interface for defining protected routes
 */
export interface RouteConfig {
  path: string;
  moduleKey: keyof ModuleAccess;
  component: React.ComponentType<any>;
  requireAuth?: boolean;
  children?: RouteConfig[];
}

/**
 * Utility to create protected route configurations
 */
export const createProtectedRoute = (
  path: string,
  moduleKey: keyof ModuleAccess,
  component: React.ComponentType<any>,
  requireAuth = true
): RouteConfig => ({
  path,
  moduleKey,
  component,
  requireAuth
});