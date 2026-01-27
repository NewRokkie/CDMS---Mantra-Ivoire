import React, { useState, useCallback, useEffect } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { MultiStepModalProps, NotificationState } from './types';

import { ModalHeader } from './components/ModalHeader';
import { ModalBody } from './components/ModalBody';
import { ModalFooter } from './components/ModalFooter';
import { ProgressBar } from './components/ProgressBar';
import { NotificationArea } from './components/NotificationArea';
import { useFocusManagement } from './hooks/useFocusManagement';
import { useAriaAnnouncements } from './hooks/useAriaAnnouncements';

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
  const [notification, setNotification] = useState<NotificationState>({
    type: 'info',
    message: '',
    show: false,
    autoHide: true,
    duration: 1500
  });

  // Use accessibility hooks with custom keyboard handling for steps
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

  const handleNextStep = () => {
    if (!isStepValid) {
      showNotification('error', 'Please complete all required fields before proceeding.', { autoHide: false });
      announce('Please complete all required fields before proceeding.', 'assertive');
      return;
    }

    hideNotification();
    if (onNextStep) {
      onNextStep();
      // Announce step change
      const nextStepNumber = Math.min(currentStep + 1, totalSteps);
      const stepLabel = stepLabels[nextStepNumber - 1] || `Step ${nextStepNumber}`;
      announce(`Moved to ${stepLabel}`, 'polite');
    }
  };

  const handlePrevStep = () => {
    hideNotification();
    if (onPrevStep) {
      onPrevStep();
      // Announce step change
      const prevStepNumber = Math.max(currentStep - 1, 1);
      const stepLabel = stepLabels[prevStepNumber - 1] || `Step ${prevStepNumber}`;
      announce(`Moved to ${stepLabel}`, 'polite');
    }
  };

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;



  // Enhanced keyboard navigation for multi-step modals
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Ctrl+Arrow keys for step navigation
      if (event.ctrlKey) {
        if (event.key === 'ArrowRight' && !isLastStep && isStepValid) {
          event.preventDefault();
          handleNextStep();
        } else if (event.key === 'ArrowLeft' && !isFirstStep) {
          event.preventDefault();
          handlePrevStep();
        }
      }

      // Handle Alt+Number keys to jump to specific steps
      if (event.altKey && /^[1-9]$/.test(event.key)) {
        const stepNumber = parseInt(event.key);
        if (stepNumber <= totalSteps) {
          event.preventDefault();
          // This would need to be implemented in the parent component
          announce(`Attempting to navigate to step ${stepNumber}`, 'polite');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLastStep, isFirstStep, isStepValid, handleNextStep, handlePrevStep, totalSteps, announce]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={preventBackdropClose ? undefined : onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl text-gray-900 overflow-hidden ${className}`}
      >
        {/* Modal Header with Integrated Progress Bar */}
        <ModalHeader
          title={title}
          subtitle={`Étape ${currentStep} sur ${totalSteps}`}
          icon={icon}
          onClose={showCloseButton ? onClose : undefined}
          showCloseButton={showCloseButton}
          gradient="from-gray-50 to-gray-100"
        >
          {/* Progress Bar integrated in header */}
          {showProgressBar && (
            <ProgressBar
              currentStep={currentStep}
              totalSteps={totalSteps}
              stepLabels={stepLabels}
              showLabels={true}
            />
          )}
        </ModalHeader>

        {/* Modal Body */}
        <ModalBody scrollable={true}>
          {/* Notification Area */}
          <NotificationArea
            notification={notification}
            onDismiss={hideNotification}
          />

          {/* Step Content */}
          <div className="space-y-8">
            {/* Render children - handle both function and element children */}
            {typeof children === 'function'
              ? children({
                  showNotification,
                  hideNotification
                })
              : children}
          </div>
        </ModalBody>

        {/* Modal Footer with Navigation */}
        <ModalFooter justify="between">
          {/* Previous Button */}
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={isFirstStep}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
          >
            Précédent
          </button>

          {/* Cancel and Next/Finish Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              disabled={!isStepValid}
              className={`px-4 py-2 text-white rounded-lg transition flex items-center space-x-2 disabled:opacity-50 ${
                isLastStep
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLastStep ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Terminer</span>
                </>
              ) : (
                <>
                  <span>Suivant</span>
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </ModalFooter>
      </div>
    </div>
  );
};
