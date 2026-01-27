/**
 * Composant Alert réutilisable
 */

import React from 'react';

interface AlertProps {
  className?: string;
  variant?: 'default' | 'destructive';
  children: React.ReactNode;
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ 
  className = '', 
  variant = 'default', 
  children 
}) => {
  const baseClasses = 'relative w-full rounded-lg border p-4';
  
  const variantClasses = {
    default: 'border-gray-200 bg-white text-gray-950',
    destructive: 'border-red-200 bg-red-50 text-red-900',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={`text-sm [&_p]:leading-relaxed ${className}`}>
      {children}
    </div>
  );
};