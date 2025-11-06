import React, { useRef, useState } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { getContainerValidationStatus } from '../utils';

interface ContainerNumberInputProps {
  label: string;
  value: string;
  confirmationValue: string;
  onChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const ContainerNumberInput: React.FC<ContainerNumberInputProps> = ({
  label,
  value,
  confirmationValue,
  onChange,
  onConfirmationChange,
  placeholder = "e.g., MSKU1234567",
  required = false,
  className = ""
}) => {
  const confirmationInputRef = useRef<HTMLInputElement>(null);
  const [isPasswordMode, setIsPasswordMode] = useState(false);

  const validation = getContainerValidationStatus(value);
  const confirmationValidation = getContainerValidationStatus(confirmationValue);
  const isMatching = value && confirmationValue && value === confirmationValue;
  const hasConfirmationError = confirmationValue && (!confirmationValidation.isValid || !isMatching);

  // Handle input with smart validation for letters vs numbers
  const handleInputChange = (inputValue: string, isConfirmation: boolean = false) => {
    // Convert to uppercase and remove non-alphanumeric characters
    let cleanValue = inputValue.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Limit to 11 characters maximum
    if (cleanValue.length > 11) {
      cleanValue = cleanValue.substring(0, 11);
    }
    
    // If we have 4 characters and they're all letters, only allow digits for the rest
    if (cleanValue.length >= 4) {
      const letters = cleanValue.substring(0, 4);
      const numbers = cleanValue.substring(4);
      
      // Ensure first 4 are letters
      if (!/^[A-Z]{4}$/.test(letters)) {
        // If first 4 aren't all letters, allow letters until we have 4
        const letterPart = cleanValue.replace(/[^A-Z]/g, '').substring(0, 4);
        cleanValue = letterPart;
      } else {
        // After 4 letters, only allow digits (max 7)
        const digitPart = numbers.replace(/[^0-9]/g, '').substring(0, 7);
        cleanValue = letters + digitPart;
      }
    } else {
      // For first 4 characters, only allow letters
      cleanValue = cleanValue.replace(/[^A-Z]/g, '').substring(0, 4);
    }
    
    if (isConfirmation) {
      onConfirmationChange(cleanValue);
    } else {
      onChange(cleanValue);
    }
  };

  // Handle confirmation field focus - permanent password mode
  const handleConfirmationFocus = () => {
    setIsPasswordMode(true); // Once set to password mode, it stays that way
  };

  return (
    <div className={className}>
      {/* Container Number and Confirmation - Side by Side */}
      <div className="flex flex-col lg:flex-row lg:space-x-4 space-y-4 lg:space-y-0">
        {/* Original Container Number Field */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label} {required && '*'}
          </label>
          <div className="relative">
            <input
              type={isPasswordMode ? "password" : "text"}
              required={required}
              value={value}
              onChange={(e) => handleInputChange(e.target.value)}
              className={`form-input w-full ${
                value && !validation.isValid
                  ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                  : value && validation.isValid
                  ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                  : ''
              } text-base py-4`}
              placeholder={placeholder}
              maxLength={11}
            />
          </div>
          
          {/* Validation Messages Outside Input */}
          <div className="mt-2 space-y-1">
            {value && (
              <div className={`flex items-center space-x-1 text-xs font-medium ${
                validation.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {validation.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <span>{validation.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Field */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm {label} {required && '*'}
          </label>
          <div className="relative">
            <input
              ref={confirmationInputRef}
              type="text"
              required={required}
              value={confirmationValue}
              onChange={(e) => handleInputChange(e.target.value, true)}
              onFocus={handleConfirmationFocus}
              className={`form-input w-full ${
                hasConfirmationError
                  ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                  : confirmationValue && isMatching && confirmationValidation.isValid
                  ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                  : ''
              } text-base py-4`}
              placeholder="Re-enter container number"
              maxLength={11}
            />
          </div>
          
          {/* Validation Messages Outside Input */}
          <div className="mt-2">
            {confirmationValue && (
              <div className={`flex items-center space-x-1 text-xs font-medium ${
                isMatching && confirmationValidation.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {isMatching && confirmationValidation.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <span>
                  {!confirmationValidation.isValid 
                    ? confirmationValidation.message 
                    : !isMatching 
                    ? 'Numbers must match' 
                    : 'Match confirmed'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};