import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ModuleAccess } from '../../types';

/**
 * Route Guard Types
 */
export interface RouteGuard {
  check: () => boolean | Promise<boolean>;
  fallbackPath?: string;
  fallbackMessage?: string;
}

export interface PermissionGuard extends RouteGuard {
  requiredPermission: keyof ModuleAccess;
}

export interface AuthGuard extends RouteGuard {
  requireAuth?: boolean;
}

export interface RoleGuard extends RouteGuard {
  allowedRoles: string[];
}

/**
 * Generic Route Guard Component
 * Provides reusable route protection logic
 */
export const RouteGuard: React.FC<{
  guard: RouteGuard;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ guard, children, fallback }) => {
  const [checking, setChecking] = React.useState(false);
  const [allowed, setAllowed] = React.useState<boolean | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const checkGuard = async () => {
      setChecking(true);
      try {
        const result = await guard.check();
        setAllowed(result);
      } catch (error) {
        console.error('Route guard check failed:', error);
        setAllowed(false);
      } finally {
        setChecking(false);
      }
    };

    checkGuard();
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mr-3"></div>
          <span className="text-gray-600">Checking permissions...</span>
        </div>
      </div>
    );
  }

  if (allowed === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            <div className="w-16 h-16 text-red-400 mx-auto mb-4">🚫</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">
              {guard.fallbackMessage || 'You do not have permission to access this page.'}
            </p>
            {guard.fallbackPath && (
              <button
                onClick={() => guard.fallbackPath && navigate(guard.fallbackPath)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (allowed === true) {
    return <>{children}</>;
  }

  return fallback || null;
};

/**
 * Permission Guard Hook
 * Checks if user has required module permission
 */
export const usePermissionGuard = (requiredPermission: keyof ModuleAccess) => {
  const { hasModuleAccess } = useAuth();

  return {
    check: () => Promise.resolve(hasModuleAccess(requiredPermission)),
    fallbackPath: '/dashboard',
    fallbackMessage: `You need ${String(requiredPermission)} permission to access this feature.`
  };
};

/**
 * Authentication Guard Hook  
 * Checks if user is authenticated
 */
export const useAuthGuard = () => {
  const { isAuthenticated } = useAuth();

  return {
    check: () => Promise.resolve(isAuthenticated),
    fallbackPath: '/login',
    fallbackMessage: 'Please log in to access this page.'
  };
};

/**
 * Role Guard Hook
 * Checks if user has required role
 */
export const useRoleGuard = (allowedRoles: ('admin' | 'supervisor' | 'operator' | 'client')[]) => {
  const { user } = useAuth();

  return {
    check: () => Promise.resolve(user ? allowedRoles.includes(user.role) : false),
    fallbackPath: '/dashboard',
    fallbackMessage: 'You do not have the required role to access this page.'
  };
};

/**
 * Custom Guard Components
 */
export const PermissionGuard: React.FC<{
  requiredPermission: keyof ModuleAccess;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ requiredPermission, children, fallback }) => {
  const guard = usePermissionGuard(requiredPermission);
  return <RouteGuard guard={guard} fallback={fallback}>{children}</RouteGuard>;
};

export const AuthGuard: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  const guard = useAuthGuard();
  return <RouteGuard guard={guard} fallback={fallback}>{children}</RouteGuard>;
};

export const RoleGuard: React.FC<{
  allowedRoles: ('admin' | 'supervisor' | 'operator' | 'client')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ allowedRoles, children, fallback }) => {
  const guard = useRoleGuard(allowedRoles);
  return <RouteGuard guard={guard} fallback={fallback}>{children}</RouteGuard>;
};