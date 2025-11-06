import React from 'react';
import { ModalFooterProps } from '../types';

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = '',
  justify = 'between'
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between'
  };

  return (
    <div className={`px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex items-center ${justifyClasses[justify]} ${className}`}>
      {children}
    </div>
  );
};