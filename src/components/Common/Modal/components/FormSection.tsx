import React from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  backgroundColor?: string;
  borderColor?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  icon: Icon,
  backgroundColor = 'bg-blue-50',
  borderColor = 'border-blue-200',
  children,
  className = ''
}) => {
  return (
    <div className={`${backgroundColor} rounded-xl p-6 border ${borderColor} ${className}`}>
      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
        {Icon && <Icon className="h-5 w-5 mr-2 text-blue-600" />}
        {title}
      </h4>
      {description && (
        <p className="text-sm text-gray-600 mb-4">{description}</p>
      )}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

// Pre-configured form sections with consistent colors
export const BasicInfoSection: React.FC<Omit<FormSectionProps, 'backgroundColor' | 'borderColor'>> = (props) => (
  <FormSection {...props} backgroundColor="bg-blue-50" borderColor="border-blue-200" />
);

export const ContactSection: React.FC<Omit<FormSectionProps, 'backgroundColor' | 'borderColor'>> = (props) => (
  <FormSection {...props} backgroundColor="bg-green-50" borderColor="border-green-200" />
);

export const LocationSection: React.FC<Omit<FormSectionProps, 'backgroundColor' | 'borderColor'>> = (props) => (
  <FormSection {...props} backgroundColor="bg-purple-50" borderColor="border-purple-200" />
);

export const SecuritySection: React.FC<Omit<FormSectionProps, 'backgroundColor' | 'borderColor'>> = (props) => (
  <FormSection {...props} backgroundColor="bg-orange-50" borderColor="border-orange-200" />
);

export const DangerSection: React.FC<Omit<FormSectionProps, 'backgroundColor' | 'borderColor'>> = (props) => (
  <FormSection {...props} backgroundColor="bg-red-50" borderColor="border-red-200" />
);