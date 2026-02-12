import React, { useState, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

interface NavigationState {
  scrollPosition: { x: number; y: number };
  moduleHistory: Array<{
    module: string;
    timestamp: number;
    url: string;
  title?: string;
  }>;
  savedFormData: Record<string, any>;
}

/**
 * Navigation Preservation Hook
 * Preserves scroll position, form data, and navigation history
 */
export const useNavigationPreservation = () => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    scrollPosition: { x: 0, y: 0 },
    moduleHistory: [],
    savedFormData: {}
  });

  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      scrollPosition: { x: window.scrollX, y: window.scrollY }
    }));
  }, []);

  // Restore scroll position on location change
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const savedPosition = navigationState.scrollPosition;
      if (savedPosition.x > 0 || savedPosition.y > 0) {
        window.scrollTo(savedPosition.x, savedPosition.y);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Save form data preservation
  const saveFormData = useCallback((key: string, data: any) => {
    setNavigationState(prev => ({
      ...prev,
      savedFormData: {
        ...prev.savedFormData,
        [key]: data
      }
    }));
  }, []);

  // Add to module history
  const addToHistory = useCallback((module: string, title?: string) => {
    setNavigationState(prev => ({
      ...prev,
      moduleHistory: [
        ...prev.moduleHistory,
        {
          module,
          timestamp: Date.now(),
          url: `${window.location.pathname}${window.location.search}`,
          title
        }
      ]
    }));
  }, [window.location.pathname]);

  // Navigate with state preservation
  const navigateWithState = useCallback((to: string, state?: any) => {
    saveScrollPosition();
    navigate(to, state);
  }, [navigate]);

  // Restore saved form data
  const getSavedFormData = useCallback((key: string) => {
    return navigationState.savedFormData[key];
  }, [navigationState.savedFormData]);

  // Get module history item
  const getModuleHistory = useCallback((url: string) => {
    return navigationState.moduleHistory.find(item => item.url === url);
  }, [navigationState.moduleHistory]);

  return {
    navigationState,
    saveScrollPosition,
    navigateWithState,
    addToHistory,
    getSavedFormData,
    getModuleHistory,
    location,
    navigate,
    params
  };
};