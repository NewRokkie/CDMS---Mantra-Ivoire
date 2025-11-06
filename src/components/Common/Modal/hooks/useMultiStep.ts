import { useState, useCallback } from 'react';
import { StepConfig } from '../types';

export const useMultiStep = (
  steps: StepConfig[],
  initialStep = 1,
  onStepChange?: (step: number) => void
) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const totalSteps = steps.length;
  const currentStepConfig = steps[currentStep - 1];
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  const validateStep = useCallback((step: number, data?: any): boolean => {
    const stepConfig = steps[step - 1];
    if (!stepConfig) return false;

    if (stepConfig.validation) {
      const isValid = stepConfig.validation(data);
      setStepValidation(prev => ({ ...prev, [step]: isValid }));
      return isValid;
    }

    // If no validation function, consider step valid
    setStepValidation(prev => ({ ...prev, [step]: true }));
    return true;
  }, [steps]);

  const goToStep = useCallback((step: number) => {
    if (step < 1 || step > totalSteps) return false;

    setCurrentStep(step);
    if (onStepChange) {
      onStepChange(step);
    }
    return true;
  }, [totalSteps, onStepChange]);

  const nextStep = useCallback((data?: any) => {
    if (isLastStep) return false;

    // Validate current step before proceeding
    const isCurrentStepValid = validateStep(currentStep, data);
    if (!isCurrentStepValid) return false;

    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]));

    // Move to next step
    const nextStepNumber = currentStep + 1;
    return goToStep(nextStepNumber);
  }, [currentStep, isLastStep, validateStep, goToStep]);

  const prevStep = useCallback(() => {
    if (isFirstStep) return false;

    const prevStepNumber = currentStep - 1;
    return goToStep(prevStepNumber);
  }, [currentStep, isFirstStep, goToStep]);

  const resetSteps = useCallback(() => {
    setCurrentStep(initialStep);
    setStepValidation({});
    setCompletedSteps(new Set());
    if (onStepChange) {
      onStepChange(initialStep);
    }
  }, [initialStep, onStepChange]);

  const isStepValid = useCallback((step?: number): boolean => {
    const stepToCheck = step ?? currentStep;
    return stepValidation[stepToCheck] ?? false;
  }, [currentStep, stepValidation]);

  const isStepCompleted = useCallback((step: number): boolean => {
    return completedSteps.has(step);
  }, [completedSteps]);

  const canProceedToStep = useCallback((targetStep: number): boolean => {
    // Can always go back to previous steps
    if (targetStep <= currentStep) return true;

    // Can only proceed if all previous steps are completed
    for (let step = 1; step < targetStep; step++) {
      if (!isStepCompleted(step) && !isStepValid(step)) {
        return false;
      }
    }
    return true;
  }, [currentStep, isStepCompleted, isStepValid]);

  const getStepLabels = useCallback((): string[] => {
    return steps.map(step => step.label);
  }, [steps]);

  const getProgressPercentage = useCallback(): number => {
    return ((currentStep - 1) / (totalSteps - 1)) * 100;
  }, [currentStep, totalSteps]);

  const getAllStepsValid = useCallback((data?: any): boolean => {
    return steps.every((_, index) => {
      const stepNumber = index + 1;
      return validateStep(stepNumber, data);
    });
  }, [steps, validateStep]);

  return {
    currentStep,
    totalSteps,
    currentStepConfig,
    isFirstStep,
    isLastStep,
    stepValidation,
    completedSteps,

    // Actions
    goToStep,
    nextStep,
    prevStep,
    resetSteps,
    validateStep,

    // Queries
    isStepValid,
    isStepCompleted,
    canProceedToStep,
    getStepLabels,
    getProgressPercentage,
    getAllStepsValid
  };
};
