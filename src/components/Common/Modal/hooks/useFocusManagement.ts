import { useEffect, useRef, useCallback } from 'react';

interface UseFocusManagementProps {
  isOpen: boolean;
  onClose: () => void;
  trapFocus?: boolean;
  restoreFocus?: boolean;
}

export const useFocusManagement = ({
  isOpen,
  onClose,
  trapFocus = true,
  restoreFocus = true
}: UseFocusManagementProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element when modal opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Focus management when modal opens/closes
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Focus first interactive element when modal opens
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    if (firstFocusable) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        firstFocusable.focus();
      }, 100);
    }

    // Return focus to previous element when modal closes
    return () => {
      if (restoreFocus && previousActiveElement.current) {
        setTimeout(() => {
          previousActiveElement.current?.focus();
        }, 100);
      }
    };
  }, [isOpen, restoreFocus]);

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    // Handle Escape key
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    // Handle Tab key for focus trapping
    if (event.key === 'Tab' && trapFocus) {
      const focusableElements = modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      );

      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    // Handle Arrow keys for enhanced navigation
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const focusableElements = Array.from(modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      )) as HTMLElement[];

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
      
      if (currentIndex !== -1) {
        event.preventDefault();
        
        if (event.key === 'ArrowDown') {
          // Move to next focusable element
          const nextIndex = (currentIndex + 1) % focusableElements.length;
          focusableElements[nextIndex]?.focus();
        } else {
          // Move to previous focusable element
          const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
          focusableElements[prevIndex]?.focus();
        }
      }
    }

    // Handle Home/End keys to jump to first/last focusable element
    if (event.key === 'Home' || event.key === 'End') {
      const focusableElements = modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      );

      if (focusableElements.length > 0) {
        event.preventDefault();
        
        if (event.key === 'Home') {
          (focusableElements[0] as HTMLElement)?.focus();
        } else {
          (focusableElements[focusableElements.length - 1] as HTMLElement)?.focus();
        }
      }
    }

    // Handle Enter/Space on buttons for better keyboard interaction
    if ((event.key === 'Enter' || event.key === ' ') && document.activeElement?.tagName === 'BUTTON') {
      const button = document.activeElement as HTMLButtonElement;
      if (!button.disabled) {
        event.preventDefault();
        button.click();
      }
    }
  }, [isOpen, trapFocus, onClose]);

  // Add/remove event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  return { modalRef };
};