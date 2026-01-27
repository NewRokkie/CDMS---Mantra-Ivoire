import React from 'react';
import { ModalBodyProps } from '../types';

export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className = '',
  scrollable = true
}) => {
  const baseClasses = 'flex-1 px-4 sm:px-6 py-4 sm:py-6';
  const scrollClasses = scrollable ? 'overflow-y-auto' : 'overflow-hidden';
  
  return (
    <div className={`${baseClasses} ${scrollClasses} ${className}`}>
      {children}
    </div>
  );
};