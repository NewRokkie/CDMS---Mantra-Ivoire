import React from 'react';
import { X } from 'lucide-react';
import { ModalHeaderProps } from '../types';

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  onClose,
  showCloseButton = true,
  gradient = 'from-gray-50 to-gray-100',
  iconColor = 'text-blue-600',
  children
}) => {
  return (
    <div className={`bg-gradient-to-r ${gradient} rounded-t-2xl`}>
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className={`p-2 ${iconColor} rounded-lg`}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-600">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Additional Header Content */}
      {children && (
        <div className="px-4 sm:px-6 pb-4 border-b border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};