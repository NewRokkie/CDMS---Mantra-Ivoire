import React, { useState } from 'react';
import { MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { StackSelectionModal } from './StackSelectionModal';

export interface StackSelectionButtonProps {
  selectedStack?: string;
  onStackSelect: (stackId: string, formattedLocation: string) => void;
  containerSize: '20ft' | '40ft';
  containerQuantity: 1 | 2;
  yardId: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  clientCode?: string;
}

export const StackSelectionButton: React.FC<StackSelectionButtonProps> = ({
  selectedStack,
  onStackSelect,
  containerSize,
  containerQuantity,
  yardId,
  disabled = false,
  required = false,
  error,
  clientCode
}) => {
  const [showModal, setShowModal] = useState(false);

  const handleStackSelect = (stackId: string, formattedLocation: string) => {
    onStackSelect(stackId, formattedLocation);
    setShowModal(false);
  };

  const getButtonText = () => {
    if (selectedStack) {
      return selectedStack;
    }
    return 'Select Stack Location';
  };

  const getButtonIcon = () => {
    if (selectedStack) {
      return <CheckCircle className="h-4 w-4" />;
    }
    return <MapPin className="h-4 w-4" />;
  };

  const getButtonStyle = () => {
    if (error) {
      return 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100';
    }
    if (selectedStack) {
      return 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100';
    }
    return 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
  };

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stack Location {required && '*'}
        </label>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={disabled}
          className={`
            w-full px-4 py-3 border-2 rounded-lg text-left font-mono transition-colors
            flex items-center justify-between
            disabled:opacity-50 disabled:cursor-not-allowed
            ${getButtonStyle()}
          `}
        >
          <span className="flex items-center">
            {getButtonIcon()}
            <span className="ml-2">{getButtonText()}</span>
          </span>
          {!disabled && (
            <span className="text-xs text-gray-500">Click to select</span>
          )}
        </button>
        
        {error && (
          <div className="mt-2 flex items-center text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </div>
        )}
        
        {selectedStack && !error && (
          <div className="mt-2 text-sm text-gray-600">
            Selected for {containerSize} container{containerQuantity === 2 ? 's (double)' : ''}
          </div>
        )}
      </div>

      <StackSelectionModal
        isVisible={showModal}
        onClose={() => setShowModal(false)}
        onStackSelect={handleStackSelect}
        containerSize={containerSize}
        containerQuantity={containerQuantity}
        yardId={yardId}
        selectedStackId={selectedStack}
        clientCode={clientCode}
      />
    </>
  );
};