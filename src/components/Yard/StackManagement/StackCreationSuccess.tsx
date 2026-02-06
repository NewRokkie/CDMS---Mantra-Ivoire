import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface StackCreationSuccessProps {
  show: boolean;
  stackNumber: number;
  onClose: () => void;
}

export const StackCreationSuccess: React.FC<StackCreationSuccessProps> = ({
  show,
  stackNumber,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out ${
      isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-2'
    }`}>
      <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <CheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-green-800">
              Stack Created Successfully!
            </p>
            <p className="text-sm text-green-700 mt-1">
              Stack S{String(stackNumber).padStart(2, '0')} has been added to the configuration.
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className="inline-flex text-green-400 hover:text-green-600 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};