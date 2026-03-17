import React from 'react';
import { ModalBodyProps } from '../types';

export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className = '',
  scrollable = true
}) => {
  // 1. Style de la barre de défilement (Scrollbar) pour un look minimaliste
  const scrollbarStyles = `
    scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 
    scrollbar-track-transparent hover:scrollbar-thumb-gray-300
  `;

  return (
    <div 
      className={`
        flex-1 
        px-4 sm:px-8 
        py-4
        dark:text-gray-200 
        leading-relaxed
        ${scrollable ? `overflow-y-auto ${scrollbarStyles}` : 'overflow-hidden'}
        /* Animation d'entrée coordonnée avec le header */
        animate-in fade-in zoom-in-95 duration-500 delay-100 fill-mode-both
        ${className}
      `}
    >
      {children}
    </div>
  );
};