/**
 * Composant Label réutilisable
 */

import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  className?: string;
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({ className = '', children, ...props }) => {
  return (
    <label
      className={`
        label peer-disabled:cursor-not-allowed 
        peer-disabled:opacity-70 ${className}
      `}
      {...props}
    >
      {children}
    </label>
  );
};