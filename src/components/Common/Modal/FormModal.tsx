import React, { useState, useCallback } from 'react';
import { Save, Loader } from 'lucide-react';
import { FormModalProps, NotificationState } from './types';
import { StandardModal } from './StandardModal';
import { ModalFooter } from './components/ModalFooter';
import { NotificationArea } from './components/NotificationArea';

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  subtitle,
  icon,
  children,
  size = 'lg',
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  validationErrors = [],
  autoSave = false,
  onAutoSave,
  showCloseButton = true,
  preventBackdropClose = false,
  className = ''
}) => {
  const [notification, setNotification] = useState<NotificationState>({
    type: 'info',
    message: '',
    show: false,
    autoHide: true,
    duration: 1500
  });
  const [autoSaving, setAutoSaving] = useState(false);

  const showNotification = useCallback((
    type: NotificationState['type'],
    message: string,
    options?: { autoHide?: boolean; duration?: number }
  ) => {
    setNotification({
      type,
      message,
      show: true,
      autoHide: options?.autoHide ?? (type === 'success'),
      duration: options?.duration ?? 1500
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous notifications
    hideNotification();

    // Show validation errors if any
    if (validationErrors.length > 0) {
      showNotification('error', `Please fix the following errors: ${validationErrors.join(', ')}`, { autoHide: false });
      return;
    }

    try {
      await onSubmit({});
      showNotification('success', 'Form submitted successfully!');
      
      // Close modal after successful submission
      setTimeout(() => {
        if (isOpen) {
          onClose();
        }
      }, 1500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showNotification('error', `Submission failed: ${errorMessage}`, { autoHide: false });
    }
  };

  const triggerAutoSave = useCallback(() => {
    if (autoSave && onAutoSave) {
      setAutoSaving(true);
      onAutoSave();
      setTimeout(() => setAutoSaving(false), 1000);
    }
  }, [autoSave, onAutoSave]);

  const headerContent = (
    <>
      {autoSaving && (
        <div className="flex items-center space-x-2 text-green-600">
          <Loader className="h-4 w-4 animate-spin" />
          <span className="text-xs">Auto-saving...</span>
        </div>
      )}
    </>
  );

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      size={size}
      showCloseButton={showCloseButton}
      preventBackdropClose={preventBackdropClose}
      className={className}
      hideDefaultFooter={true}
    >
      {/* Notification Area */}
      <NotificationArea
        notification={notification}
        onDismiss={hideNotification}
      />

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pass functions to children only if they are React components, not DOM elements */}
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            // Only pass props to custom React components, not DOM elements
            const isCustomComponent = typeof child.type === 'function' || 
                                    (typeof child.type === 'object' && child.type !== null);
            
            if (isCustomComponent) {
              return React.cloneElement(child, { 
                triggerAutoSave,
                showNotification,
                hideNotification
              } as any);
            }
          }
          return child;
        })}

        {/* Form Footer */}
        <ModalFooter justify="between">
          <div className="text-sm text-gray-600">
            {validationErrors.length > 0 && (
              <span className="text-red-600 font-medium">
                {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary mobile-button order-2 sm:order-1"
              disabled={isSubmitting}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || validationErrors.length > 0}
              className="btn-success mobile-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 order-1 sm:order-2"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{submitLabel}</span>
                </>
              )}
            </button>
          </div>
        </ModalFooter>
      </form>
    </StandardModal>
  );
};