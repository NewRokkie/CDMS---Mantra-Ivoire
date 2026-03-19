import React from 'react';
import { Save, Loader } from 'lucide-react';
import { FormModalProps } from './types';
import { StandardModal } from './StandardModal';
import { ModalFooter } from './components/ModalFooter';
import { useToast } from '../../../hooks/useToast';

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
  showCloseButton = true,
  preventBackdropClose = false,
  className = '',
  isNested = false
}) => {
  const { success, error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validationErrors.length > 0) {
      error(`Please fix the following errors: ${validationErrors.join(', ')}`);
      return;
    }

    try {
      await onSubmit({});
      success('Form submitted successfully!');
      
      setTimeout(() => {
        if (isOpen) {
          onClose();
        }
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      error(`Submission failed: ${errorMessage}`);
    }
  };

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
      isNested={isNested}
    >
      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {children}

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
