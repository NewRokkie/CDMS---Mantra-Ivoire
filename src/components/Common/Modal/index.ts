// Main exports for the standardized modal system
export { StandardModal } from './StandardModal';
export { FormModal } from './FormModal';
export { MultiStepModal } from './MultiStepModal';
export { DataDisplayModal } from './DataDisplayModal';

// Component exports
export { ModalHeader } from './components/ModalHeader';
export { ModalBody } from './components/ModalBody';
export { ModalFooter } from './components/ModalFooter';
export { ProgressBar } from './components/ProgressBar';
export { NotificationArea } from './components/NotificationArea';
export { LoadingOverlay } from './components/LoadingOverlay';
export { FormSection, BasicInfoSection, ContactSection, LocationSection, SecuritySection, DangerSection } from './components/FormSection';

// Skeleton component exports
export {
  Skeleton,
  SkeletonText,
  SkeletonInput,
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
  SkeletonFormSection,
  SkeletonMultiStepForm,
  SkeletonDataSection,
  SkeletonModalHeader,
  SkeletonModalFooter,
  SkeletonStandardModal,
  SkeletonFormModal,
  SkeletonDataDisplayModal
} from './components/SkeletonComponents';

// Hook exports
export { useModal } from './hooks/useModal';
export { useFormModal } from './hooks/useFormModal';
export { useMultiStep } from './hooks/useMultiStep';

// Type exports
export type {
  StandardModalProps,
  FormModalProps,
  MultiStepModalProps,
  DataDisplayModalProps,
  NotificationState,
  LoadingStateProps,
  SkeletonProps,
  ModalConfig,
  StepConfig,
  FormSection as FormSectionType,
  FormField,
  ModalAction,
  DataSection
} from './types';