import React from 'react';
import { X } from 'lucide-react';
import { ModalHeaderProps } from '../types';

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  onClose,
  showCloseButton = true,
  iconColor = 'text-white bg-blue-600 shadow-lg shadow-blue-500/30',
  children
}) => {
  return (
    <div className="relative flex-shrink-0 border-b border-gray-100 dark:border-gray-800 rounded-t-3xl overflow-hidden">
      {/* Decorative glows inspired by Stitch */}
      <div className="absolute -top-16 -left-16 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl" />

      <div className="relative px-6 sm:px-8 pt-6 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {/* Optimized icon container */}
            {Icon && (
              <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:scale-105 ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            )}

            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate font-inter antialiased">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-inter antialiased truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Close button with micro-interactions */}
          {showCloseButton && onClose && (
            <div className="flex items-center">
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="shrink-0 text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 active:scale-90"
              >
                <X className="h-5 w-5 transition-transform hover:rotate-90 duration-300" />
              </button>
            </div>
          )}
        </div>

        {/* Additional content area (ProgressBar for MultiStepModal or custom items) */}
        {children && (
          <div className="mt-6 mb-2 animate-in fade-in slide-in-from-top-2 duration-700 delay-100">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};