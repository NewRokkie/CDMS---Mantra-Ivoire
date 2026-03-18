import React from 'react';
import { ModalFooterProps } from '../types';

export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className = '',
  justify = 'end' // "end" est souvent plus standard pour les actions principales
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
      px-4 sm:px-8 py-4 
      border-t border-gray-100 dark:border-gray-800 
      bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm
      rounded-b-2xl 
      flex items-center gap-3
      ${justifyClasses[justify]} 
      ${className}
      /* Animation d'entrée coordonnée */
      animate-in fade-in slide-in-from-top-1 duration-500
    `}>
      {children}
    </div>
  );
};