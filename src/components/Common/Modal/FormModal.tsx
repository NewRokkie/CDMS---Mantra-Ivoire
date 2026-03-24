import React from 'react';
import { FormModalProps } from './types';
import { StandardModal } from './StandardModal';

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
      isNested={isNested}
      onSubmit={() => onSubmit({})}
      submitLabel={submitLabel}
      cancelLabel={cancelLabel}
      isSubmitting={isSubmitting}
      isFormValid={validationErrors.length === 0}
      validationSummary={validationErrors.length > 0 ? (
        <span className="text-red-600 font-medium">
          {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''} found
        </span>
      ) : null}
    >
      <div className="space-y-6">
        {children}
      </div>
    </StandardModal>
  );
};
