/**
 * Accessibility utilities for modal components
 */

// Color contrast calculation utilities
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const getLuminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

// WCAG compliance levels
export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;
export const WCAG_AAA_NORMAL = 7;
export const WCAG_AAA_LARGE = 4.5;

export const isWCAGCompliant = (
  foreground: string, 
  background: string, 
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  
  if (level === 'AA') {
    return ratio >= (isLargeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL);
  } else {
    return ratio >= (isLargeText ? WCAG_AAA_LARGE : WCAG_AAA_NORMAL);
  }
};

// Keyboard navigation helpers
export const FOCUSABLE_ELEMENTS = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(', ');

export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  return Array.from(container.querySelectorAll(FOCUSABLE_ELEMENTS));
};

export const getFirstFocusableElement = (container: HTMLElement): HTMLElement | null => {
  const elements = getFocusableElements(container);
  return elements.length > 0 ? elements[0] : null;
};

export const getLastFocusableElement = (container: HTMLElement): HTMLElement | null => {
  const elements = getFocusableElements(container);
  return elements.length > 0 ? elements[elements.length - 1] : null;
};

// Screen reader utilities
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
};

// Touch target size validation
export const MIN_TOUCH_TARGET_SIZE = 44; // pixels

export const isTouchTargetSizeValid = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.width >= MIN_TOUCH_TARGET_SIZE && rect.height >= MIN_TOUCH_TARGET_SIZE;
};

// Reduced motion detection
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// High contrast mode detection
export const prefersHighContrast = (): boolean => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

// Generate accessible IDs
let idCounter = 0;
export const generateAccessibleId = (prefix: string = 'modal'): string => {
  return `${prefix}-${++idCounter}-${Date.now()}`;
};

// Validate ARIA attributes
export const validateAriaAttributes = (element: HTMLElement): string[] => {
  const warnings: string[] = [];
  
  // Check for required ARIA attributes on interactive elements
  if (element.tagName === 'BUTTON' && !element.getAttribute('aria-label') && !element.textContent?.trim()) {
    warnings.push('Button element should have aria-label or visible text content');
  }
  
  // Check for proper ARIA relationships
  const ariaDescribedBy = element.getAttribute('aria-describedby');
  if (ariaDescribedBy) {
    const describedElements = ariaDescribedBy.split(' ');
    describedElements.forEach(id => {
      if (!document.getElementById(id)) {
        warnings.push(`aria-describedby references non-existent element: ${id}`);
      }
    });
  }
  
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelElements = ariaLabelledBy.split(' ');
    labelElements.forEach(id => {
      if (!document.getElementById(id)) {
        warnings.push(`aria-labelledby references non-existent element: ${id}`);
      }
    });
  }
  
  return warnings;
};

// Semantic HTML validation
export const validateSemanticStructure = (container: HTMLElement): string[] => {
  const warnings: string[] = [];
  
  // Check for proper heading hierarchy
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let previousLevel = 0;
  
  headings.forEach((heading) => {
    const currentLevel = parseInt(heading.tagName.charAt(1));
    if (currentLevel > previousLevel + 1) {
      warnings.push(`Heading level ${currentLevel} follows level ${previousLevel}, skipping levels`);
    }
    previousLevel = currentLevel;
  });
  
  // Check for form labels
  const inputs = container.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const id = input.getAttribute('id');
    const ariaLabel = input.getAttribute('aria-label');
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    
    if (id) {
      const label = container.querySelector(`label[for="${id}"]`);
      if (!label && !ariaLabel && !ariaLabelledBy) {
        warnings.push(`Form input with id "${id}" has no associated label`);
      }
    } else if (!ariaLabel && !ariaLabelledBy) {
      warnings.push('Form input has no label or aria-label');
    }
  });
  
  return warnings;
};