import React from 'react';
import { useNavigationPreservation } from './useNavigationPreservation';

/**
 * Deep Linking Support Hook
 * Handles direct URL access to specific modules and content
 */
export const useDeepLinking = () => {
  const { location, navigate, addToHistory } = useNavigationPreservation();

  // Handle deep linking on mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const bookingId = urlParams.get('booking');
    const action = urlParams.get('action');

    // Handle specific deep links
    if (bookingId && location.pathname === '/booking') {
      // Simulate navigation to specific booking after a short delay
      const timer = setTimeout(() => {
        navigate(`/booking/${bookingId}`, { replace: true });
        addToHistory('booking', `Opened booking ${bookingId}`);
      }, 1000);

      return () => clearTimeout(timer);
    }

    // Handle deep linking actions
    if (action === 'create-booking' && location.pathname === '/booking') {
      const timer = setTimeout(() => {
        navigate('/booking/new', { replace: true });
        addToHistory('booking', 'Opened new booking form');
      }, 1000);

      return () => clearTimeout(timer);
    }

    if (action === 'export-data' && location.pathname === '/booking') {
      // Handle data export deep link
      const timer = setTimeout(() => {
        // This would trigger export functionality
        console.log('Deep link: Export booking data requested');
        addToHistory('booking', 'Exported booking data');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [location.search, location.pathname]);

  // Generate shareable URLs
  const generateShareableUrl = (module: string, itemId?: string, action?: string) => {
    const baseUrl = `${window.location.origin}${location.pathname}`;
    const url = new URL(baseUrl);

    if (itemId) {
      url.searchParams.set('id', itemId);
    }

    if (action) {
      url.searchParams.set('action', action);
    }

    return url.toString();
  };

  return {
    generateShareableUrl,
    handleDeepLink: (url: string, title?: string) => {
      // Copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);

        // Show success message (you could use toast here)
        console.log(`Link copied: ${url}`);

        // Add to history
        addToHistory('system', `Copied link: ${title || url}`);
      }
    },

    // Check if current page was accessed via deep link
    isDeepLinked: () => {
      const referrer = document.referrer;
      const isExternal = referrer && !referrer.includes(window.location.origin);
      const hasParams = location.search.length > 0;

      return isExternal || hasParams;
    },

    // Get deep link parameters
    getDeepLinkParams: () => {
      const params = new URLSearchParams(location.search);
      const result: Record<string, string> = {};

      for (const [key, value] of params.entries()) {
        result[key] = value;
      }

      return result;
    }
  };
};