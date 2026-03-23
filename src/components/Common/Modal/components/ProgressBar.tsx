import React from 'react';
import { Check } from 'lucide-react';
import { ProgressBarProps } from '../types';

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  stepLabels = [],
  showLabels = true,
  className = ''
}) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Container for the steps and lines */}
      <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;

          return (
            <React.Fragment key={stepNumber}>
              {/* Step indicator — Inline Style */}
              <div className="flex items-center gap-2 sm:gap-3 relative z-10 shrink-0">
                <div
                  className={`
                    w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300
                    ${isCompleted
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 ring-4 ring-blue-100 dark:ring-blue-900/40 scale-110'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 border border-gray-200 dark:border-gray-600'
                    }
                  `}
                >
                  {isCompleted ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : stepNumber}
                </div>
                {showLabels && stepLabels[index] && (
                  <span
                    className={`
                      hidden md:inline-block text-sm font-bold whitespace-nowrap transition-colors duration-300 font-inter antialiased
                      ${isActive
                        ? 'text-gray-900 dark:text-white'
                        : isCompleted
                          ? 'text-gray-700 dark:text-gray-300 font-semibold'
                          : 'text-gray-400 dark:text-gray-500'
                      }
                    `}
                  >
                    {stepLabels[index]}
                  </span>
                )}
              </div>

              {/* Connector line — centered vertically with icons */}
              {stepNumber < totalSteps && (
                <div className="flex-1 h-[2px] rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
                    style={{ width: isCompleted ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile Label — Show only the current step label on small screens */}
      {showLabels && stepLabels[currentStep - 1] && (
        <div className="md:hidden mt-3 text-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 font-inter antialiased">
            Étape {currentStep} : {stepLabels[currentStep - 1]}
          </span>
        </div>
      )}
    </div>
  );
};