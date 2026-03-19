import React, { useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { MultiStepModalProps } from './types';

import { ModalHeader } from './components/ModalHeader';
import { ModalBody } from './components/ModalBody';
import { ModalFooter } from './components/ModalFooter';
import { ProgressBar } from './components/ProgressBar';
import { useFocusManagement } from './hooks/useFocusManagement';
import { useAriaAnnouncements } from './hooks/useAriaAnnouncements';
import { useToast } from '../../../hooks/useToast';

export const MultiStepModal: React.FC<MultiStepModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  currentStep,
  totalSteps,
  stepLabels,
  onNextStep,
  onPrevStep,
  isStepValid = true,
  showProgressBar = true,

  showCloseButton = true,
  preventBackdropClose = false,
  className = ''
}) => {
  const { error } = useToast();

  const { modalRef } = useFocusManagement({
    isOpen,
    onClose,
    trapFocus: true,
    restoreFocus: true
  });
  const { announce } = useAriaAnnouncements({ isOpen });

  const handleNextStep = () => {
    if (!isStepValid) {
      error('Please complete all required fields before proceeding.');
      announce('Please complete all required fields before proceeding.', 'assertive');
      return;
    }

    if (onNextStep) {
      onNextStep();
      const nextStepNumber = Math.min(currentStep + 1, totalSteps);
      const stepLabel = stepLabels[nextStepNumber - 1] || `Step ${nextStepNumber}`;
      announce(`Moved to ${stepLabel}`, 'polite');
    }
  };

  const handlePrevStep = () => {
    if (onPrevStep) {
      onPrevStep();
      const prevStepNumber = Math.max(currentStep - 1, 1);
      const stepLabel = stepLabels[prevStepNumber - 1] || `Step ${prevStepNumber}`;
      announce(`Moved to ${stepLabel}`, 'polite');
    }
  };

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        if (event.key === 'ArrowRight' && !isLastStep && isStepValid) {
          event.preventDefault();
          handleNextStep();
        } else if (event.key === 'ArrowLeft' && !isFirstStep) {
          event.preventDefault();
          handlePrevStep();
        }
      }

      if (event.altKey && /^[1-9]$/.test(event.key)) {
        const stepNumber = parseInt(event.key);
        if (stepNumber <= totalSteps) {
          event.preventDefault();
          announce(`Attempting to navigate to step ${stepNumber}`, 'polite');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep, isStepValid, handleNextStep, handlePrevStep, totalSteps, announce]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={preventBackdropClose ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] text-gray-900 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 ${className}`}
      >
        {/* Modal Header */}
        <ModalHeader
          title={title}
          subtitle={`Étape ${currentStep} sur ${totalSteps}`}
          icon={icon}
          onClose={showCloseButton ? onClose : undefined}
          showCloseButton={showCloseButton}
          gradient="from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/20"
        >
          {showProgressBar && (
            <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-700 delay-100">
              <ProgressBar
                currentStep={currentStep}
                totalSteps={totalSteps}
                stepLabels={stepLabels}
                showLabels={true}
              />
            </div>
          )}
        </ModalHeader>

        {/* Modal Body */}
        <ModalBody scrollable={true}>
          {/* Animation de transition par étape */}
          <div key={currentStep} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {children}
          </div>
        </ModalBody>

        {/* Modal Footer */}
        <ModalFooter justify="between" className="bg-gray-50/50 dark:bg-gray-800/10 backdrop-blur-md">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={isFirstStep}
            className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all disabled:opacity-0 disabled:pointer-events-none active:scale-95 flex items-center"
          >
            Précédent
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className={`
                relative group px-7 py-2.5 text-white text-sm font-bold rounded-xl transition-all active:scale-95 flex items-center space-x-2 shadow-lg
                ${!isStepValid ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed grayscale' : 
                  isLastStep ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-500' : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-500'
                }
              `}
            >
              <span className="relative z-10">{isLastStep ? 'Terminer' : 'Suivant'}</span>
              <div className="relative z-10 transition-transform group-hover:translate-x-1">
                {isLastStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
              {isStepValid && (
                <div className={`absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity ${isLastStep ? 'bg-emerald-400' : 'bg-blue-400'}`} />
              )}
            </button>
          </div>
        </ModalFooter>
      </div>
    </div>
  );
};
