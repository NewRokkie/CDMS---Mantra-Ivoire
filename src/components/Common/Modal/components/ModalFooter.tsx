import React from 'react';
import { ModalFooterProps } from '../types';

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = '',
  justify = 'end'
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between'
  };

  return (
    <div className={`
      relative shrink-0
      px-6 sm:px-8 py-4 
      border-t border-gray-100 dark:border-gray-800 
      bg-gray-50/80 dark:bg-gray-800/20 backdrop-blur-md
      rounded-b-3xl 
      flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3
      ${justifyClasses[justify]} 
      ${className}
      /* Entry animation */
      animate-in fade-in slide-in-from-top-1 duration-500
    `}>
      {children}
    </div>
  );
};