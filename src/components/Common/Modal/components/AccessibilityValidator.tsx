import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { 
  validateAriaAttributes, 
  validateSemanticStructure, 
  isWCAGCompliant,
  isTouchTargetSizeValid 
} from '../utils/accessibility';

interface AccessibilityValidatorProps {
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
  showInProduction?: boolean;
}

interface ValidationResult {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  element?: HTMLElement;
}

export const AccessibilityValidator: React.FC<AccessibilityValidatorProps> = ({
  containerRef,
  enabled = process.env.NODE_ENV === 'development',
  showInProduction = false
}) => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled && !showInProduction) return;
    if (!containerRef.current) return;

    const validateAccessibility = () => {
      const container = containerRef.current;
      if (!container) return;

      const results: ValidationResult[] = [];

      // Validate ARIA attributes
      const ariaWarnings = validateAriaAttributes(container);
      ariaWarnings.forEach(warning => {
        results.push({
          type: 'warning',
          message: `ARIA: ${warning}`
        });
      });

      // Validate semantic structure
      const semanticWarnings = validateSemanticStructure(container);
      semanticWarnings.forEach(warning => {
        results.push({
          type: 'warning',
          message: `Semantic: ${warning}`
        });
      });

      // Validate touch targets
      const interactiveElements = container.querySelectorAll('button, a, input, select, textarea');
      interactiveElements.forEach(element => {
        if (!isTouchTargetSizeValid(element as HTMLElement)) {
          results.push({
            type: 'warning',
            message: `Touch target too small: ${element.tagName.toLowerCase()}`,
            element: element as HTMLElement
          });
        }
      });

      // Check color contrast (simplified check for common patterns)
      const textElements = container.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a');
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Only check if we have both colors and they're not transparent
        if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
          // This is a simplified check - in a real implementation you'd want more robust color parsing
          if (color === 'rgb(0, 0, 0)' && backgroundColor === 'rgb(255, 255, 255)') {
            results.push({
              type: 'success',
              message: `Good contrast: ${element.tagName.toLowerCase()}`,
              element: element as HTMLElement
            });
          }
        }
      });

      // Check for missing alt text on images
      const images = container.querySelectorAll('img');
      images.forEach(img => {
        if (!img.getAttribute('alt') && !img.getAttribute('aria-label')) {
          results.push({
            type: 'error',
            message: 'Image missing alt text or aria-label',
            element: img
          });
        }
      });

      // Check for proper form labels
      const formInputs = container.querySelectorAll('input, select, textarea');
      formInputs.forEach(input => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledBy = input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = container.querySelector(`label[for="${id}"]`);
          if (!label && !ariaLabel && !ariaLabelledBy) {
            results.push({
              type: 'error',
              message: `Form input missing label: ${input.tagName.toLowerCase()}`,
              element: input as HTMLElement
            });
          }
        }
      });

      setValidationResults(results);
    };

    // Run validation after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(validateAccessibility, 100);

    return () => clearTimeout(timeoutId);
  }, [containerRef, enabled, showInProduction]);

  if (!enabled && !showInProduction) return null;
  if (validationResults.length === 0) return null;

  const errorCount = validationResults.filter(r => r.type === 'error').length;
  const warningCount = validationResults.filter(r => r.type === 'warning').length;
  const successCount = validationResults.filter(r => r.type === 'success').length;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`p-3 rounded-full shadow-lg transition-colors ${
          errorCount > 0 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : warningCount > 0 
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
        aria-label={`Accessibility validation: ${errorCount} errors, ${warningCount} warnings`}
      >
        {errorCount > 0 ? (
          <AlertTriangle className="h-5 w-5" />
        ) : warningCount > 0 ? (
          <Info className="h-5 w-5" />
        ) : (
          <CheckCircle className="h-5 w-5" />
        )}
      </button>

      {isVisible && (
        <div className="absolute bottom-16 right-0 w-80 max-h-96 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Accessibility Report</h3>
            <div className="text-sm text-gray-600 mt-1">
              {errorCount} errors, {warningCount} warnings, {successCount} passed
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {validationResults.map((result, index) => (
              <div
                key={index}
                className={`p-3 border-b border-gray-100 last:border-b-0 ${
                  result.type === 'error' ? 'bg-red-50' :
                  result.type === 'warning' ? 'bg-yellow-50' :
                  result.type === 'success' ? 'bg-green-50' :
                  'bg-blue-50'
                }`}
                onClick={() => result.element?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              >
                <div className="flex items-start space-x-2">
                  <div className={`flex-shrink-0 mt-0.5 ${
                    result.type === 'error' ? 'text-red-500' :
                    result.type === 'warning' ? 'text-yellow-500' :
                    result.type === 'success' ? 'text-green-500' :
                    'text-blue-500'
                  }`}>
                    {result.type === 'error' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : result.type === 'warning' ? (
                      <Info className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      result.type === 'error' ? 'text-red-800' :
                      result.type === 'warning' ? 'text-yellow-800' :
                      result.type === 'success' ? 'text-green-800' :
                      'text-blue-800'
                    }`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};