# Design Document

## Overview

This design document outlines the standardization of all modal components in the container depot management application to follow the DepotFormModal design pattern. The standardization will create a unified, consistent user experience across all modal dialogs while maintaining accessibility, responsiveness, and modern UI/UX principles.

## Architecture

### Modal Component Structure

All modals will follow a consistent three-part structure:

1. **Modal Header** - Fixed header with title, progress indicators, and controls
2. **Modal Body** - Scrollable content area with form sections and data
3. **Modal Footer** - Fixed footer with navigation and action buttons

### Component Hierarchy

```
Modal Container
├── Backdrop Overlay
└── Modal Dialog
    ├── Modal Header
    │   ├── Title Section
    │   ├── Progress Indicators (for multi-step)
    │   └── Control Buttons
    ├── Modal Body (Scrollable)
    │   ├── Notification Area
    │   ├── Loading States
    │   └── Content Sections
    └── Modal Footer
        ├── Navigation Controls
        └── Action Buttons
```

## Components and Interfaces

### Core Modal Interface

```typescript
interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType;
  isLoading?: boolean;
  loadingMessage?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  preventBackdropClose?: boolean;
}

interface MultiStepModalProps extends StandardModalProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
  onNextStep?: () => void;
  onPrevStep?: () => void;
  isStepValid?: boolean;
}

interface FormModalProps extends StandardModalProps {
  onSubmit: (data: any) => Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  validationErrors?: string[];
}
```

### Notification System Interface

```typescript
interface NotificationState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  show: boolean;
  autoHide?: boolean;
  duration?: number;
}

interface NotificationProps {
  notification: NotificationState;
  onDismiss: () => void;
}
```

### Loading State Interface

```typescript
interface LoadingStateProps {
  isLoading: boolean;
  message?: string;
  skeleton?: boolean;
  overlay?: boolean;
}

interface SkeletonProps {
  type: 'text' | 'input' | 'button' | 'card' | 'table';
  count?: number;
  height?: string;
  width?: string;
}
```

## Data Models

### Modal Configuration

```typescript
interface ModalConfig {
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
}

interface StepConfig {
  id: string;
  label: string;
  description?: string;
  icon?: React.ComponentType;
  validation?: (data: any) => boolean;
  optional?: boolean;
}
```

### Form Section Configuration (DepotFormModal Standard)

```typescript
interface FormSection {
  id: string;
  title: string;
  icon: React.ComponentType;
  iconColor: 'text-blue-500' | 'text-green-500' | 'text-orange-500' | 'text-purple-500';
  fields: FormField[];
  hasSeparator?: boolean; // for border-t border-gray-100 sections
  className?: string; // additional section styling
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'toggle' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  validation?: ValidationRule[];
  options?: SelectOption[];
  icon?: React.ComponentType;
  iconColor?: string; // for input icons (text-blue-500, text-green-500)
  colSpan?: 'md:col-span-2' | 'md:col-span-1'; // grid column span
  formatFunction?: (value: string) => string; // for phone formatting
}

interface ToggleField extends FormField {
  type: 'toggle';
  activeLabel: string;
  inactiveLabel: string;
  toggleSize: 'w-11 h-6'; // standard toggle size
  thumbSize: 'w-4 h-4'; // standard thumb size
}
```

## DepotFormModal CSS Class Standards

### Section Styling

```css
/* Main section container */
.depot-section {
  @apply bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition;
}

/* Section header */
.depot-section-header {
  @apply font-semibold text-gray-800 mb-5 flex items-center;
}

/* Section icon */
.depot-section-icon {
  @apply h-5 w-5 mr-2;
}

/* Form grid layout */
.depot-form-grid {
  @apply grid grid-cols-1 md:grid-cols-2 gap-6;
}

/* Field separator */
.depot-field-separator {
  @apply md:col-span-2 pt-4 border-t border-gray-100;
}
```

### Input Field Styling

```css
/* Standard input with error state support */
.depot-input {
  @apply input;
}

.depot-input.error {
  @apply border-red-400 focus:ring-red-500;
}

/* Input with icon */
.depot-input-with-icon {
  @apply input pl-10;
}

/* Input icon positioning */
.depot-input-icon {
  @apply input-icon;
}

/* Select dropdown */
.depot-select {
  @apply input appearance-none pr-10;
}

/* Select chevron icon */
.depot-select-chevron {
  @apply absolute right-3 top-1/2 -translate-y-1/2 text-gray-400;
}
```

### Toggle Switch Styling

```css
/* Toggle container */
.depot-toggle-container {
  @apply flex items-center space-x-3 mt-1;
}

/* Toggle switch */
.depot-toggle {
  @apply w-11 h-6 rounded-full flex items-center transition-colors;
}

.depot-toggle.active {
  @apply bg-blue-600;
}

.depot-toggle.inactive {
  @apply bg-gray-300;
}

/* Toggle thumb */
.depot-toggle-thumb {
  @apply w-4 h-4 bg-white rounded-full transform transition-transform;
}

.depot-toggle-thumb.active {
  @apply translate-x-6;
}

.depot-toggle-thumb.inactive {
  @apply translate-x-1;
}

/* Toggle labels */
.depot-toggle-label {
  @apply text-sm;
}

.depot-toggle-label.active {
  @apply text-gray-800;
}

.depot-toggle-label.inactive {
  @apply text-gray-400;
}
```

## Design System

### Color Palette (DepotFormModal Standard)

```css
/* Section Background */
--section-background: #ffffff; /* bg-white */
--section-border: #f3f4f6; /* border-gray-100 */
--section-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
--section-shadow-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.1); /* hover:shadow-md */

/* Icon Colors */
--icon-primary: #3b82f6; /* text-blue-500 */
--icon-secondary: #10b981; /* text-green-500 */
--icon-input: #6b7280; /* text-gray-400 for input-icon */

/* Text Colors */
--text-primary: #1f2937; /* text-gray-800 */
--text-secondary: #9ca3af; /* text-gray-400 */
--text-label: #374151; /* text-gray-700 for labels */

/* Toggle Switch Colors */
--toggle-active: #2563eb; /* bg-blue-600 */
--toggle-inactive: #d1d5db; /* bg-gray-300 */
--toggle-thumb: #ffffff; /* bg-white */

/* Error States */
--error-border: #f87171; /* border-red-400 */
--error-ring: #ef4444; /* focus:ring-red-500 */
--error-text: #dc2626; /* text-red-600 */

/* Input States */
--input-border: #e5e7eb; /* border-gray-200 */
--input-focus-border: #60a5fa; /* focus:border-blue-400 */
--input-focus-ring: rgba(59, 130, 246, 0.3); /* focus:ring-blue-500/30 */
```

### Typography Scale

```css
/* Modal Titles */
--title-large: 1.25rem; /* text-xl */
--title-medium: 1.125rem; /* text-lg */
--title-small: 1rem; /* text-base */

/* Section Headers */
--section-header: 1rem; /* text-base font-semibold */

/* Body Text */
--body-text: 0.875rem; /* text-sm */
--caption-text: 0.75rem; /* text-xs */

/* Font Weights */
--weight-semibold: 600;
--weight-medium: 500;
--weight-normal: 400;
```

### Spacing System (DepotFormModal Standard)

```css
/* Section Spacing */
--section-spacing: 2rem; /* space-y-8 between sections */
--section-padding: 1.5rem; /* p-6 inside sections */
--section-header-margin: 1.25rem; /* mb-5 for section headers */

/* Grid Spacing */
--field-grid-gap: 1.5rem; /* gap-6 for form grids */
--field-columns: grid-cols-1 md:grid-cols-2; /* responsive grid */

/* Icon Spacing */
--icon-margin: 0.5rem; /* mr-2 for header icons */
--icon-size: 1.25rem; /* h-5 w-5 for section icons */
--input-icon-padding: 2.5rem; /* pl-10 for inputs with icons */

/* Toggle Switch Dimensions */
--toggle-width: 2.75rem; /* w-11 */
--toggle-height: 1.5rem; /* h-6 */
--toggle-thumb-size: 1rem; /* w-4 h-4 */
--toggle-spacing: 0.75rem; /* space-x-3 around toggle */

/* Transition Timing */
--transition-duration: 300ms; /* transition-all duration-300 */
--transition-easing: ease-out;
```

### Border Radius (DepotFormModal Standard)

```css
--radius-section: 1rem; /* rounded-2xl for sections */
--radius-input: 0.75rem; /* rounded-xl for inputs */
--radius-toggle: 9999px; /* rounded-full for toggle switches */
--radius-toggle-thumb: 9999px; /* rounded-full for toggle thumbs */
```

## Modal Variants

### 1. Standard Modal

**Use Case**: Simple content display, confirmations, basic forms
**Structure**: Header + Body + Footer
**Features**: Close button, backdrop close, escape key support

```typescript
<StandardModal
  isOpen={isOpen}
  onClose={onClose}
  title="Modal Title"
  subtitle="Optional subtitle"
  icon={IconComponent}
>
  <ModalContent />
</StandardModal>
```

### 2. Form Modal

**Use Case**: Data entry, editing, creation forms
**Structure**: Header + Form Body + Action Footer
**Features**: Validation, auto-save, submit handling, loading states

```typescript
<FormModal
  isOpen={isOpen}
  onClose={onClose}
  onSubmit={handleSubmit}
  title="Create New Item"
  submitLabel="Create"
  isSubmitting={isLoading}
>
  <FormSections />
</FormModal>
```

### 3. Multi-Step Modal

**Use Case**: Complex workflows, wizards, multi-part forms
**Structure**: Header with Progress + Step Content + Navigation Footer
**Features**: Step validation, progress tracking, navigation controls

```typescript
<MultiStepModal
  isOpen={isOpen}
  onClose={onClose}
  currentStep={currentStep}
  totalSteps={3}
  stepLabels={['Info', 'Details', 'Review']}
  onNextStep={handleNext}
  onPrevStep={handlePrev}
>
  <StepContent />
</MultiStepModal>
```

### 4. Data Display Modal

**Use Case**: Viewing detailed information, reports, summaries
**Structure**: Header + Scrollable Content + Action Footer
**Features**: Data sections, status indicators, action buttons

```typescript
<DataDisplayModal
  isOpen={isOpen}
  onClose={onClose}
  title="Item Details"
  data={itemData}
  actions={[
    { label: 'Edit', onClick: handleEdit },
    { label: 'Delete', onClick: handleDelete, variant: 'danger' }
  ]}
>
  <DataSections />
</DataDisplayModal>
```

## Loading States and Skeletons

### Loading Overlay

For modals that need to fetch data before displaying content:

```typescript
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

// Usage
<Modal isOpen={isOpen}>
  <LoadingOverlay 
    isLoading={isLoadingData} 
    message="Loading container details..."
  />
  {!isLoadingData && <ModalContent />}
</Modal>
```

### Skeleton Components

For progressive loading of modal content:

```typescript
// Form Field Skeleton
<SkeletonField type="input" />
<SkeletonField type="select" />
<SkeletonField type="textarea" rows={3} />

// Section Skeleton
<SkeletonSection 
  title="Loading section..."
  fieldCount={4}
  layout="grid"
/>

// Data Display Skeleton
<SkeletonDataCard 
  rows={6}
  hasActions={true}
/>
```

## Responsive Design

### Breakpoint Strategy

```css
/* Mobile First Approach */
.modal-container {
  /* Mobile: Full screen with padding */
  @apply w-full h-full p-4;
  
  /* Tablet: Constrained width */
  @screen md {
    @apply max-w-2xl max-h-[90vh];
  }
  
  /* Desktop: Larger sizes available */
  @screen lg {
    @apply max-w-4xl;
  }
  
  /* Large Desktop: Maximum size */
  @screen xl {
    @apply max-w-6xl;
  }
}
```

### Mobile Optimizations

1. **Touch Targets**: Minimum 44px for all interactive elements
2. **Spacing**: Increased padding and margins for finger navigation
3. **Typography**: Larger text sizes for readability
4. **Navigation**: Simplified button layouts and larger tap areas

## Accessibility Features

### ARIA Implementation

```typescript
// Modal Container
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>

// Focus Management
useEffect(() => {
  if (isOpen) {
    // Focus first interactive element
    const firstInput = modalRef.current?.querySelector('input, button, select, textarea');
    firstInput?.focus();
  }
}, [isOpen]);

// Keyboard Navigation
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') onClose();
  if (e.key === 'Tab') handleTabNavigation(e);
};
```

### Screen Reader Support

1. **Semantic HTML**: Proper heading hierarchy, form labels, button descriptions
2. **Live Regions**: Announce status changes and validation errors
3. **Focus Management**: Trap focus within modal, return focus on close
4. **Descriptive Text**: Clear labels and instructions for all interactive elements

## Error Handling

### Validation Error Display

```typescript
interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
}

// Field-level validation
<FormField error={fieldError}>
  <input className={fieldError ? 'border-red-400' : 'border-gray-300'} />
  {fieldError && (
    <ErrorMessage>
      <AlertCircle className="h-4 w-4" />
      {fieldError.message}
    </ErrorMessage>
  )}
</FormField>

// Form-level validation
<ValidationSummary errors={formErrors} />
```

### Network Error Handling

```typescript
interface NetworkErrorState {
  hasError: boolean;
  message: string;
  retryable: boolean;
  retryCount: number;
}

// Error boundary for modals
<ErrorBoundary fallback={<ModalErrorFallback />}>
  <Modal>
    <ModalContent />
  </Modal>
</ErrorBoundary>
```

## Testing Strategy

### Unit Testing

1. **Component Rendering**: Test modal opens/closes correctly
2. **Form Validation**: Test validation rules and error display
3. **User Interactions**: Test button clicks, form submissions
4. **Accessibility**: Test keyboard navigation and screen reader support

### Integration Testing

1. **Data Flow**: Test data loading and submission
2. **Multi-step Navigation**: Test step progression and validation
3. **Error Scenarios**: Test network failures and recovery
4. **Cross-browser**: Test modal behavior across different browsers

### Visual Testing

1. **Responsive Design**: Test modal appearance across screen sizes
2. **Theme Consistency**: Test color schemes and typography
3. **Loading States**: Test skeleton and loading animations
4. **Error States**: Test error message display and styling

## Phone Number Formatting (DepotFormModal Standard)

### formatPhoneNumber Function

```typescript
const formatPhoneNumber = (value: string) => {
  if (!value) return value;

  // If it already contains spaces, return as is
  if (value.includes(' ')) {
    return value;
  }

  // Remove all non-numeric characters except +
  const cleaned = value.replace(/[^\d+]/g, '');

  // If it starts with +, format the digits after +
  if (cleaned.startsWith('+')) {
    const digits = cleaned.substring(4); // Remove +225
    const formatted = digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    return `+225 ${formatted}`;
  }

  // For Côte d'Ivoire numbers, keep the leading 0 and format
  if (cleaned.length === 0) return '';

  // Format as Côte d'Ivoire number: +225 XX XX XX XX
  // Take first 8 digits after +225
  const digits = cleaned.substring(0, 8);
  const formatted = digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();

  return `+225 ${formatted}`;
};

const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const inputValue = e.target.value;
  const formatted = formatPhoneNumber(inputValue);
  handleInputChange('contactPhone', formatted);
};
```

### Usage Pattern

```typescript
<div className="relative">
  <Phone className="input-icon text-green-500" />
  <input
    value={formData.contactPhone}
    onChange={handlePhoneChange}
    className="input pl-10"
    placeholder="+225 07 XX XX XX"
  />
</div>
```

## Implementation Guidelines

### File Structure

```
src/components/Common/Modal/
├── index.ts                    # Main exports
├── StandardModal.tsx           # Base modal component
├── FormModal.tsx              # Form-specific modal
├── MultiStepModal.tsx         # Multi-step modal
├── DataDisplayModal.tsx       # Data display modal
├── components/
│   ├── ModalHeader.tsx        # Header component
│   ├── ModalBody.tsx          # Body component
│   ├── ModalFooter.tsx        # Footer component
│   ├── ProgressBar.tsx        # Progress indicator
│   ├── NotificationArea.tsx   # Notification display
│   └── LoadingOverlay.tsx     # Loading states
├── hooks/
│   ├── useModal.ts            # Modal state management
│   ├── useFormModal.ts        # Form modal logic
│   └── useMultiStep.ts        # Multi-step logic
└── styles/
    └── modal.css              # Modal-specific styles
```

### Migration Strategy

1. **Phase 1**: Create standardized modal components
2. **Phase 2**: Migrate high-priority modals (User, Container, Gate operations)
3. **Phase 3**: Migrate remaining modals (Reports, Settings, etc.)
4. **Phase 4**: Remove legacy modal code and update documentation

### Performance Considerations

1. **Lazy Loading**: Load modal content only when needed
2. **Virtual Scrolling**: For modals with large data sets
3. **Memoization**: Prevent unnecessary re-renders
4. **Bundle Splitting**: Separate modal code from main bundle