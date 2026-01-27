import React from 'react';
import { ProgressBarProps } from '../types';

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  stepLabels = [],
  showLabels = true,
  className = ''
}) => {
  const progressPercentage = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div className={className}>
      <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden w-full">
        <div
          className="absolute h-1 bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium w-full">
          {stepLabels.map((label, index) => (
            <span 
              key={index}
              className={currentStep >= index + 1 ? 'text-blue-600' : ''}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};