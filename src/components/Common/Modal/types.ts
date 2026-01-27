import React from 'react';

// Base modal interfaces
export interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode | ((props: { showNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string, options?: { autoHide?: boolean; duration?: number }) => void; hideNotification: () => void }) => React.ReactNode);
  onSubmit?: () => Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  showCloseButton?: boolean;
  preventBackdropClose?: boolean;
  className?: string;
  // Size and layout options
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  maxHeight?: string;
  // Header customization
  headerGradient?: string;
  headerIcon?: React.ComponentType<{ className?: string }>;
  headerIconColor?: string;
  // Footer customization
  footerJustify?: 'start' | 'center' | 'end' | 'between';
  customFooter?: React.ReactNode;
  hideDefaultFooter?: boolean;
  // Validation
  isFormValid?: boolean;
  validationSummary?: React.ReactNode;
  // Accessibility props
  ariaLabel?: string;
  ariaDescribedBy?: string;
  role?: string;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  announceStateChanges?: boolean;
}

export interface MultiStepModalProps extends StandardModalProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  onNextStep?: () => void;
  onPrevStep?: () => void;
  isStepValid?: boolean;
  showProgressBar?: boolean;
}

export interface FormModalProps extends StandardModalProps {
  onSubmit: (data: any) => Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  validationErrors?: string[];
  autoSave?: boolean;
  onAutoSave?: () => void;
}

export interface DataDisplayModalProps extends StandardModalProps {
  data?: any;
  actions?: ModalAction[];
  sections?: DataSection[];
}

// Notification system
export interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  show: boolean;
  autoHide?: boolean;
  duration?: number;
}

export interface NotificationProps {
  notification: NotificationState;
  onDismiss: () => void;
}

// Loading states
export interface LoadingStateProps {
  isLoading: boolean;
  message?: string;
  skeleton?: boolean;
  overlay?: boolean;
}

export interface SkeletonProps {
  type: 'text' | 'input' | 'button' | 'card' | 'table';
  count?: number;
  height?: string;
  width?: string;
  className?: string;
}

// Modal configuration
export interface ModalConfig {
  // Visual Configuration
  size: 'sm' | 'md' | 'lg' | 'xl';
  headerGradient: string;
  iconColor: string;
  
  // Behavior Configuration
  closeOnBackdrop: boolean;
  closeOnEscape: boolean;
  showProgressBar: boolean;
  autoSave: boolean;
  
  // Accessibility Configuration
  ariaLabel: string;
  ariaDescribedBy?: string;
  focusTrap: boolean;
  announceStateChanges: boolean;
  validateContrast: boolean;
  enforceMinTouchTargets: boolean;
}

export interface StepConfig {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  validation?: (data: any) => boolean;
  optional?: boolean;
}

// Form configuration
export interface FormSection {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  backgroundColor: string;
  borderColor: string;
  fields: FormField[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'toggle' | 'checkbox' | 'date' | 'time';
  required?: boolean;
  placeholder?: string;
  validation?: ValidationRule[];
  options?: SelectOption[];
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern';
  value?: any;
  message: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Data display
export interface DataSection {
  id: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  data: Record<string, any>;
  layout?: 'grid' | 'list' | 'table';
}

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

// Component props
export interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClose?: () => void;
  showCloseButton?: boolean;
  gradient?: string;
  iconColor?: string;
  children?: React.ReactNode;
}

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
  justify?: 'start' | 'center' | 'end' | 'between';
}

export interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  showLabels?: boolean;
  className?: string;
}