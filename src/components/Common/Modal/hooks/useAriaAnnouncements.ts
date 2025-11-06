import { useEffect, useRef, useCallback } from 'react';

interface UseAriaAnnouncementsProps {
  isOpen: boolean;
}

export const useAriaAnnouncements = ({ isOpen }: UseAriaAnnouncementsProps) => {
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Create live region for announcements
  useEffect(() => {
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.setAttribute('class', 'sr-only');
      liveRegion.setAttribute('id', 'modal-live-region');
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    return () => {
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
    };
  }, []);

  // Announce modal state changes
  useEffect(() => {
    if (liveRegionRef.current) {
      if (isOpen) {
        liveRegionRef.current.textContent = 'Modal dialog opened';
      } else {
        liveRegionRef.current.textContent = 'Modal dialog closed';
      }
    }
  }, [isOpen]);

  // Function to make custom announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;
      
      // Clear the message after a short delay to allow for re-announcements
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, []);

  return { announce };
};