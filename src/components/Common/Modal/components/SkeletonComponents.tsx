import React from 'react';
import { SkeletonProps } from '../types';

// Base Skeleton Component
export const Skeleton: React.FC<SkeletonProps> = ({
  type,
  count = 1,
  height,
  width,
  className = ''
}) => {
  const getSkeletonClasses = () => {
    const baseClasses = 'animate-pulse bg-gray-200 rounded';
    
    switch (type) {
      case 'text':
        return `${baseClasses} h-4`;
      case 'input':
        return `${baseClasses} h-10`;
      case 'button':
        return `${baseClasses} h-10 w-24`;
      case 'card':
        return `${baseClasses} h-32`;
      case 'table':
        return `${baseClasses} h-8`;
      default:
        return baseClasses;
    }
  };

  const skeletonStyle = {
    height: height || undefined,
    width: width || undefined
  };

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`${getSkeletonClasses()} ${className}`}
          style={skeletonStyle}
        />
      ))}
    </>
  );
};

// Specialized Skeleton Components

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 1, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }, (_, index) => (
      <div
        key={index}
        className={`animate-pulse bg-gray-200 rounded h-4 ${
          index === lines - 1 ? 'w-3/4' : 'w-full'
        }`}
      />
    ))}
  </div>
);

export const SkeletonInput: React.FC<{
  label?: boolean;
  className?: string;
}> = ({ label = true, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {label && <div className="animate-pulse bg-gray-200 rounded h-4 w-24" />}
    <div className="animate-pulse bg-gray-200 rounded h-10 w-full" />
  </div>
);

export const SkeletonButton: React.FC<{
  variant?: 'primary' | 'secondary' | 'small';
  className?: string;
}> = ({ variant = 'primary', className = '' }) => {
  const widthClass = {
    primary: 'w-24',
    secondary: 'w-20',
    small: 'w-16'
  }[variant];

  return (
    <div className={`animate-pulse bg-gray-200 rounded h-10 ${widthClass} ${className}`} />
  );
};

export const SkeletonCard: React.FC<{
  hasHeader?: boolean;
  hasFooter?: boolean;
  contentLines?: number;
  className?: string;
}> = ({ hasHeader = true, hasFooter = false, contentLines = 3, className = '' }) => (
  <div className={`animate-pulse bg-gray-100 rounded-xl p-6 space-y-4 ${className}`}>
    {hasHeader && (
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-32" />
          <div className="h-3 bg-gray-200 rounded w-48" />
        </div>
      </div>
    )}
    
    <div className="space-y-3">
      {Array.from({ length: contentLines }, (_, index) => (
        <div key={index} className="h-4 bg-gray-200 rounded w-full" />
      ))}
    </div>

    {hasFooter && (
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <SkeletonButton variant="secondary" />
        <SkeletonButton variant="primary" />
      </div>
    )}
  </div>
);

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
  className?: string;
}> = ({ rows = 5, columns = 4, hasHeader = true, className = '' }) => (
  <div className={`animate-pulse space-y-3 ${className}`}>
    {hasHeader && (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }, (_, index) => (
          <div key={index} className="h-6 bg-gray-300 rounded w-full" />
        ))}
      </div>
    )}
    
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <div key={colIndex} className="h-8 bg-gray-200 rounded w-full" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Form-specific skeletons

export const SkeletonFormSection: React.FC<{
  title?: boolean;
  fields?: number;
  layout?: 'single' | 'double';
  className?: string;
}> = ({ title = true, fields = 4, layout = 'double', className = '' }) => (
  <div className={`animate-pulse bg-gray-100 rounded-xl p-6 space-y-4 ${className}`}>
    {title && (
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
    )}
    
    <div className={`grid gap-6 ${layout === 'double' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
      {Array.from({ length: fields }, (_, index) => (
        <SkeletonInput key={index} />
      ))}
    </div>
  </div>
);

export const SkeletonMultiStepForm: React.FC<{
  steps?: number;
  currentStep?: number;
  className?: string;
}> = ({ steps = 3, currentStep = 1, className = '' }) => (
  <div className={`animate-pulse space-y-6 ${className}`}>
    {/* Progress Bar Skeleton */}
    <div className="space-y-4">
      <div className="flex justify-between">
        {Array.from({ length: steps }, (_, index) => (
          <div key={index} className="flex flex-col items-center space-y-2">
            <div className={`w-6 h-6 rounded-full ${
              index + 1 <= currentStep ? 'bg-blue-200' : 'bg-gray-200'
            }`} />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="h-0.5 bg-gray-200 rounded">
        <div 
          className="h-full bg-blue-200 rounded transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps - 1)) * 100}%` }}
        />
      </div>
    </div>

    {/* Form Content Skeleton */}
    <SkeletonFormSection fields={6} />
  </div>
);

// Data display skeletons

export const SkeletonDataSection: React.FC<{
  title?: boolean;
  items?: number;
  layout?: 'grid' | 'list' | 'table';
  className?: string;
}> = ({ title = true, items = 6, layout = 'grid', className = '' }) => (
  <div className={`animate-pulse bg-white rounded-xl p-6 border border-gray-200 space-y-4 ${className}`}>
    {title && (
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
    )}

    {layout === 'grid' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: items }, (_, index) => (
          <div key={index} className="space-y-1">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        ))}
      </div>
    )}

    {layout === 'list' && (
      <div className="space-y-3">
        {Array.from({ length: items }, (_, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
            <div className="h-3 bg-gray-200 rounded w-24" />
            <div className="h-4 bg-gray-200 rounded w-32" />
          </div>
        ))}
      </div>
    )}

    {layout === 'table' && (
      <SkeletonTable rows={items} columns={2} hasHeader={false} />
    )}
  </div>
);

// Loading states for specific modal types

export const SkeletonModalHeader: React.FC<{
  hasIcon?: boolean;
  hasSubtitle?: boolean;
  className?: string;
}> = ({ hasIcon = true, hasSubtitle = true, className = '' }) => (
  <div className={`animate-pulse flex items-center justify-between p-6 ${className}`}>
    <div className="flex items-center space-x-3">
      {hasIcon && <div className="w-10 h-10 bg-gray-200 rounded-xl" />}
      <div className="space-y-2">
        <div className="h-5 bg-gray-200 rounded w-48" />
        {hasSubtitle && <div className="h-3 bg-gray-200 rounded w-64" />}
      </div>
    </div>
    <div className="w-8 h-8 bg-gray-200 rounded-lg" />
  </div>
);

export const SkeletonModalFooter: React.FC<{
  buttonCount?: number;
  className?: string;
}> = ({ buttonCount = 2, className = '' }) => (
  <div className={`animate-pulse flex justify-end space-x-3 p-6 border-t border-gray-200 ${className}`}>
    {Array.from({ length: buttonCount }, (_, index) => (
      <SkeletonButton key={index} variant={index === buttonCount - 1 ? 'primary' : 'secondary'} />
    ))}
  </div>
);

// Complete modal skeletons

export const SkeletonStandardModal: React.FC<{
  hasIcon?: boolean;
  hasSubtitle?: boolean;
  contentSections?: number;
  hasFooter?: boolean;
  className?: string;
}> = ({ 
  hasIcon = true, 
  hasSubtitle = true, 
  contentSections = 2, 
  hasFooter = true,
  className = '' 
}) => (
  <div className={`bg-white rounded-2xl shadow-strong max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}>
    <SkeletonModalHeader hasIcon={hasIcon} hasSubtitle={hasSubtitle} />
    
    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      {Array.from({ length: contentSections }, (_, index) => (
        <SkeletonCard key={index} hasHeader={true} contentLines={4} />
      ))}
    </div>

    {hasFooter && <SkeletonModalFooter />}
  </div>
);

export const SkeletonFormModal: React.FC<{
  sections?: number;
  fieldsPerSection?: number;
  className?: string;
}> = ({ sections = 2, fieldsPerSection = 4, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-strong max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}>
    <SkeletonModalHeader hasIcon={true} hasSubtitle={true} />
    
    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      {Array.from({ length: sections }, (_, index) => (
        <SkeletonFormSection key={index} fields={fieldsPerSection} />
      ))}
    </div>

    <SkeletonModalFooter buttonCount={2} />
  </div>
);

export const SkeletonDataDisplayModal: React.FC<{
  sections?: number;
  itemsPerSection?: number;
  hasActions?: boolean;
  className?: string;
}> = ({ sections = 3, itemsPerSection = 6, hasActions = true, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-strong max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}>
    <SkeletonModalHeader hasIcon={true} hasSubtitle={true} />
    
    <div className="p-6 space-y-6 flex-1 overflow-y-auto">
      {Array.from({ length: sections }, (_, index) => (
        <SkeletonDataSection key={index} items={itemsPerSection} />
      ))}
    </div>

    {hasActions && <SkeletonModalFooter buttonCount={3} />}
  </div>
);