import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Module to URL path mapping
const MODULE_URL_MAP: Record<string, string> = {
  'dashboard': '/dashboard',
  'gate-in': '/gate-in',
  'gate-out': '/gate-out',
  'releases': '/booking', // Module mapping to booking URL
  'containers': '/containers',
  'yard-management': '/yard',
  'edi': '/edi',
  'reports': '/reports',
  'depot-management': '/config/depot',
  'stack-management': '/config/stacks',
  'client-pools': '/config/client-pools',
  'clients': '/config/clients',
  'users': '/config/users',
  'module-access': '/config/module-access'
};

// URL path to module mapping (reverse of MODULE_URL_MAP)
const URL_MODULE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_URL_MAP).map(([module, url]) => [url, module])
);

/**
 * Extract module ID from current URL path
 */
const extractModuleFromPath = (pathname: string): string => {
  // Remove trailing slash for consistency
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // Direct path matches
  if (URL_MODULE_MAP[normalizedPath]) {
    return URL_MODULE_MAP[normalizedPath];
  }

  // Check for sub-paths (e.g., /booking/123 should map to 'booking')
  const pathSegments = normalizedPath.split('/');
  for (let i = pathSegments.length; i > 0; i--) {
    const partialPath = '/' + pathSegments.slice(1, i).join('/');
    if (URL_MODULE_MAP[partialPath]) {
      return URL_MODULE_MAP[partialPath];
    }
  }

  // Default to dashboard if no match found
  return 'dashboard';
};

/**
 * Get URL path for a given module
 */
const getUrlForModule = (module: string): string => {
  return MODULE_URL_MAP[module] || '/dashboard';
};

/**
 * Hook to synchronize URL with module state
 * Provides two-way synchronization between URL and activeModule state
 */
export const useModuleRouting = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeModule, setActiveModuleState] = useState<string>(() =>
    extractModuleFromPath(location.pathname)
  );

  // Sync URL changes to state
  useEffect(() => {
    const moduleFromUrl = extractModuleFromPath(location.pathname);

    if (moduleFromUrl !== activeModule) {
      setActiveModuleState(moduleFromUrl);
    }
  }, [location.pathname, activeModule]);

  // Sync state changes to URL
  const setActiveModule = useCallback((module: string, options?: { replace?: boolean }) => {
    setActiveModuleState(module);
    const url = getUrlForModule(module);

    // Only navigate if URL is different
    if (url !== location.pathname) {
      if (options?.replace) {
        navigate(url, { replace: true });
      } else {
        navigate(url);
      }
    }
  }, [navigate, location.pathname]);

  // Navigate to a specific route within a module
  const navigateToRoute = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  // Check if current path matches a module
  const isModuleActive = useCallback((module: string): boolean => {
    return activeModule === module;
  }, [activeModule]);

  return {
    activeModule,
    setActiveModule,
    navigateToRoute,
    isModuleActive,
    getCurrentUrl: () => location.pathname,
    getUrlForModule
  };
};

/**
 * Get module ID from URL path (utility function)
 */
export const getModuleFromUrl = (pathname: string): string => {
  return extractModuleFromPath(pathname);
};

/**
 * Get URL path for module (utility function)
 */
export const getModuleUrl = (module: string): string => {
  return getUrlForModule(module);
};