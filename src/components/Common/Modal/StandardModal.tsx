import React from 'react';
import ReactDOM from 'react-dom';
import { StandardModalProps } from './types';
import { ModalHeader } from './components/ModalHeader';
import { ModalBody } from './components/ModalBody';
import { ModalFooter } from './components/ModalFooter';
import { useFocusManagement } from './hooks/useFocusManagement';
import { useAriaAnnouncements } from './hooks/useAriaAnnouncements';
import { useToast } from '../../../hooks/useToast';

export const StandardModal: React.FC<StandardModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  onSubmit,
  submitLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  isSubmitting = false,
  showCloseButton = true,
  preventBackdropClose = false,
  className = '',
  size = 'md',
  maxHeight = '90vh',
  headerGradient = 'from-white/70 to-gray-50/50 dark:from-gray-800/70 dark:to-gray-900/50',
  headerIcon,
  headerIconColor,
  footerJustify = 'end',
  customFooter,
  hideDefaultFooter = false,
  isFormValid = true,
  validationSummary,
  isNested = false
}) => {
  const { error } = useToast();

  const { modalRef } = useFocusManagement({
    isOpen,
    onClose,
    trapFocus: true,
    restoreFocus: true
  });
  const { announce } = useAriaAnnouncements({ isOpen });

  const handleSubmit = async () => {
    if (onSubmit && !isSubmitting && isFormValid) {
      try {
        await onSubmit();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
        error(errorMessage);
        announce(errorMessage, 'assertive');
      }
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl'
  }[size] || 'max-w-lg';

  const zIndexClass = isNested ? 'z-[60]' : 'z-50';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-2 sm:p-4 overflow-hidden`}
    >
      {/* Overlay avec flou et fondu */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300"
        onClick={preventBackdropClose ? undefined : onClose}
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`
          relative w-full ${sizeClasses}
          flex flex-col
          bg-white dark:bg-gray-900
          rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]
          overflow-hidden
          animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-400
          ${className}
        `}
        style={{ maxHeight }}
      >
        <ModalHeader
          title={title}
          subtitle={subtitle}
          icon={headerIcon || icon}
          onClose={showCloseButton ? onClose : undefined}
          showCloseButton={showCloseButton}
          gradient={headerGradient}
          iconColor={headerIconColor}
        />

        <ModalBody scrollable={true} className="relative min-h-0 flex-1">
          <div className="animate-in fade-in slide-in-from-left-2 duration-500 delay-150 fill-mode-both">
            {children}
          </div>
        </ModalBody>

        {(!hideDefaultFooter || customFooter) && (
          <ModalFooter justify={footerJustify}>
            {customFooter || (
              <>
                {validationSummary && (
                  <div className="flex-1 text-sm text-red-500 animate-in fade-in">
                    {validationSummary}
                  </div>
                )}

                <div className="flex items-center gap-3 ml-auto">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
                  >
                    {cancelLabel}
                  </button>

                  {onSubmit && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting || !isFormValid}
                      className={`
                        relative group
                        px-6 py-2 rounded-xl
                        bg-blue-600 text-white text-sm font-bold
                        shadow-md shadow-blue-500/20
                        transition-all active:scale-95
                        disabled:opacity-50 disabled:grayscale disabled:scale-100
                        flex items-center justify-center gap-2
                      `}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Traitement...</span>
                        </>
                      ) : (
                        <>
                          <span>{submitLabel}</span>
                          <div className="absolute inset-0 rounded-xl bg-blue-400 blur-lg opacity-0 group-hover:opacity-20 transition-opacity" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </ModalFooter>
        )}
      </div>
    </div>
  );

  if (isNested) {
    return ReactDOM.createPortal(modalContent, document.body);
  }

  return modalContent;
};
