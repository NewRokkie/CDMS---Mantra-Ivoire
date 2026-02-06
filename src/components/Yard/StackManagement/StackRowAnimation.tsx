import React, { useEffect, useState } from 'react';

interface StackRowAnimationProps {
  children: React.ReactNode;
  isNew?: boolean;
  delay?: number;
}

export const StackRowAnimation: React.FC<StackRowAnimationProps> = ({ 
  children, 
  isNew = false, 
  delay = 0 
}) => {
  const [isVisible, setIsVisible] = useState(!isNew);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isNew, delay]);

  return (
    <div 
      className={`transition-all duration-500 ease-in-out ${
        isVisible 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform translate-y-2'
      } ${isNew ? 'bg-green-50 border-l-4 border-green-400' : ''}`}
      style={{
        transitionDelay: isNew ? `${delay}ms` : '0ms'
      }}
    >
      {children}
    </div>
  );
};