import React, { useState, useCallback } from 'react';
import { StandardModalProps, NotificationState } from './types';
import { ModalHeader } from './components/ModalHeader';
import { ModalBody } from './components/ModalBody';
import { ModalFooter } from './components/ModalFooter';
import { NotificationArea } from './components/NotificationArea';
import { useFocusManagement } from './hooks/useFocusManagement';
import { useAriaAnnouncements } from './hooks/useAriaAnnouncements';

export const StandardModal: React.FC<StandardModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  showCloseButton = true,
  preventBackdropClose = false,
  className = '',
  size = 'lg',
  maxHeight = '90vh',
  headerGradient = 'from-gray-50 to-gray-100',
  headerIcon,
  headerIconColor = 'text-blue-600',
  footerJustify = 'end',
  customFooter,
  hideDefaultFooter = false,
  isFormValid = true,
  validationSummary
}) => {
  const [notification, setNotification] = useState<NotificationState>({
    type: 'info',
    message: '',
    show: false,
    autoHide: true,
    duration: 1500
  });

  // Use accessibility hooks
  const { modalRef } = useFocusManagement({
    isOpen,
    onClose,
    trapFocus: true,
    restoreFocus: true
  });
  const { announce } = useAriaAnnouncements({ isOpen });

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

  const handleSubmit = async () => {
    if (onSubmit) {
      try {
        await onSubmit();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        showNotification('error', errorMessage, { autoHide: false });
        announce(errorMessage, 'assertive');
      }
    }
  };

  if (!isOpen) return null;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'max-w-md';
      case 'md': return 'max-w-lg';
      case 'lg': return 'max-w-2xl';
      case 'xl': return 'max-w-4xl';
      case '2xl': return 'max-w-6xl';
      default: return 'max-w-2xl';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={preventBackdropClose ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${getSizeClasses()} flex flex-col bg-white rounded-2xl shadow-2xl text-gray-900 overflow-hidden animate-slide-in-up mx-2 sm:mx-0 ${className}`}
        style={{ maxHeight }}
      >
        {/* Modal Header */}
        <ModalHeader
          title={title}
          subtitle={subtitle}
          icon={headerIcon || icon}
          onClose={showCloseButton ? onClose : undefined}
          showCloseButton={showCloseButton}
          gradient={headerGradient}
          iconColor={headerIconColor}
        />

        {/* Modal Body */}
        <ModalBody scrollable={true}>
          {/* Notification Area */}
          <NotificationArea
            notification={notification}
            onDismiss={hideNotification}
          />

          {/* Content */}
          <div className="space-y-8">
            {/* Pass notification functions to children */}
            {typeof children === 'function' ? (
              children({ showNotification, hideNotification })
            ) : (
              children
            )}
          </div>
        </ModalBody>

        {/* Modal Footer */}
        {!hideDefaultFooter && (
          <ModalFooter justify={footerJustify} className="flex-shrink-0">
            {customFooter || (
              <>
                {/* Validation Summary */}
                {validationSummary && (
                  <div className="flex-1">
                    {validationSummary}
                  </div>
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={onClose}
                    className="btn-secondary px-3 py-2 sm:px-6 sm:py-2 text-sm"
                  >
                    <span className="sm:hidden">✕</span>
                    <span className="hidden sm:inline">{cancelLabel}</span>
                  </button>

                  {onSubmit && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !isFormValid}
                      className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 px-3 py-2 sm:px-6 sm:py-2 text-sm"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>...</span>
                        </>
                      ) : (
                        <span>{submitLabel}</span>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </ModalFooter>
        )}
        
        {/* Custom Footer */}
        {customFooter && hideDefaultFooter && (
          <div className="flex-shrink-0">
            {customFooter}
          </div>
        )}
      </div>
    </div>
  );
};