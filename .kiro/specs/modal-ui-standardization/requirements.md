# Requirements Document

## Introduction

This specification defines the standardization of all modal components across the container depot management application to follow a consistent UI/UX design pattern based on the DepotFormModal component. The goal is to create a unified user experience with consistent visual design, interaction patterns, and accessibility features across all modal dialogs in the system.

## Glossary

- **Modal_System**: The collection of all modal dialog components in the application
- **DepotFormModal_Pattern**: The reference design pattern established by the DepotFormModal component
- **Modal_Component**: Any dialog component that overlays the main application interface
- **Step_Navigation**: Multi-step form progression within modals
- **Form_Validation**: Real-time and submission validation within modal forms
- **Notification_System**: Success, error, and warning message display within modals
- **Progress_Indicator**: Visual representation of completion status in multi-step modals

## Requirements

### Requirement 1

**User Story:** As a user, I want all modal dialogs to have a consistent visual appearance matching the DepotFormModal design, so that I can easily recognize and navigate modal interfaces throughout the application.

#### Acceptance Criteria

1. THE Modal_System SHALL apply consistent section styling with bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition
2. THE Modal_System SHALL display section headers with font-semibold text-gray-800 mb-5 flex items-center styling
3. THE Modal_System SHALL include consistent icon placement in section headers with h-5 w-5 mr-2 and appropriate color (text-blue-500, text-green-500, etc.)
4. THE Modal_System SHALL apply consistent modal dimensions with size="xl" and appropriate responsive behavior
5. THE Modal_System SHALL use consistent spacing with space-y-8 between sections and transition-all duration-300 for step transitions

### Requirement 2

**User Story:** As a user, I want all multi-step modals to show clear progress indication using the exact DepotFormModal stepper design, so that I understand my current position and remaining steps in the process.

#### Acceptance Criteria

1. WHEN a modal contains multiple steps, THE Modal_System SHALL use the MultiStepModal component with showProgressBar={true}
2. THE Modal_System SHALL display step labels in French format matching DepotFormModal pattern (e.g., ['Informations', 'Contact & Adresse'])
3. THE Modal_System SHALL use the existing ProgressBar component with w-6 h-6 rounded-full step indicators
4. THE Modal_System SHALL highlight completed steps with bg-blue-600 text-white and pending steps with bg-white text-gray-500 border border-gray-300
5. THE Modal_System SHALL maintain the current progress line animation with duration-500 ease-out timing

### Requirement 3

**User Story:** As a user, I want consistent form validation and error handling across all modals, so that I receive clear feedback about input requirements and errors.

#### Acceptance Criteria

1. THE Modal_System SHALL display validation errors with consistent red-400 border and red-600 text styling
2. THE Modal_System SHALL show field-level validation messages immediately below input fields
3. THE Modal_System SHALL prevent form submission when validation errors exist
4. THE Modal_System SHALL highlight required fields with asterisk (*) notation
5. THE Modal_System SHALL provide real-time validation feedback as users interact with form fields

### Requirement 4

**User Story:** As a user, I want consistent notification and status messaging in modals, so that I understand the outcome of my actions clearly.

#### Acceptance Criteria

1. WHEN form submission succeeds, THE Modal_System SHALL display success notifications with green-600 color and CheckCircle icon
2. WHEN form submission fails, THE Modal_System SHALL display error notifications with red-600 color and AlertCircle icon
3. THE Modal_System SHALL auto-dismiss success notifications after 1500 milliseconds
4. THE Modal_System SHALL persist error notifications until user acknowledgment
5. THE Modal_System SHALL display loading states with consistent Loader icon and animation

### Requirement 5

**User Story:** As a user, I want consistent navigation controls in all modals, so that I can easily move between steps and complete or cancel operations.

#### Acceptance Criteria

1. THE Modal_System SHALL provide consistent "Précédent" and "Suivant" buttons for multi-step navigation
2. THE Modal_System SHALL disable navigation buttons when current step validation fails
3. THE Modal_System SHALL display consistent "Annuler" and primary action buttons in modal footers
4. THE Modal_System SHALL support Escape key functionality to close modals
5. THE Modal_System SHALL prevent accidental closure by stopping event propagation on modal content clicks

### Requirement 6

**User Story:** As a user, I want all modal forms to be organized into logical sections with clear visual hierarchy exactly matching the DepotFormModal layout, so that I can easily understand and complete complex forms.

#### Acceptance Criteria

1. THE Modal_System SHALL group related form fields into sections with consistent bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition styling
2. THE Modal_System SHALL use consistent section headers with font-semibold text-gray-800 mb-5 flex items-center and appropriate colored icons (text-blue-500, text-green-500)
3. THE Modal_System SHALL apply consistent spacing between form sections using space-y-8 and transition-all duration-300 for step changes
4. THE Modal_System SHALL use consistent grid layouts with grid-cols-1 md:grid-cols-2 gap-6 for form fields
5. THE Modal_System SHALL provide consistent field separators using md:col-span-2 pt-4 border-t border-gray-100 for address sections

### Requirement 7

**User Story:** As a user, I want all modals to be responsive and accessible on different screen sizes, so that I can use the application effectively on various devices.

#### Acceptance Criteria

1. THE Modal_System SHALL adapt modal dimensions for mobile devices with appropriate padding and sizing
2. THE Modal_System SHALL ensure all interactive elements meet minimum touch target sizes on mobile
3. THE Modal_System SHALL provide proper ARIA labels and roles for screen reader accessibility
4. THE Modal_System SHALL maintain keyboard navigation support throughout all modal interactions
5. THE Modal_System SHALL ensure sufficient color contrast ratios for all text and interactive elements

### Requirement 8

**User Story:** As a user, I want consistent styling for form inputs and controls exactly matching the DepotFormModal patterns, so that I have a familiar interaction experience.

#### Acceptance Criteria

1. THE Modal_System SHALL apply consistent input field styling using the "input" CSS class with border-red-400 focus:ring-red-500 for error states
2. THE Modal_System SHALL use consistent toggle switches with w-11 h-6 rounded-full bg-blue-600/bg-gray-300 container and w-4 h-4 bg-white rounded-full thumb
3. THE Modal_System SHALL provide consistent dropdown styling with "input appearance-none pr-10" and ChevronDown positioned "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
4. THE Modal_System SHALL apply consistent label styling using the "label" CSS class
5. THE Modal_System SHALL use consistent icon placement with "input-icon" class for left-positioned icons with pl-10 input padding

### Requirement 9

**User Story:** As a user, I want to see loading states when modals are fetching data from the database, so that I understand the system is processing my request and know when data is being loaded.

#### Acceptance Criteria

1. WHEN a modal requires data from Supabase, THE Modal_System SHALL display skeleton loading states for form fields and content areas
2. THE Modal_System SHALL show consistent loading animations with Loader icons and appropriate messaging
3. THE Modal_System SHALL disable interactive elements during data loading to prevent user confusion
4. THE Modal_System SHALL provide loading state indicators for both initial modal load and form submission processes
5. THE Modal_System SHALL transition smoothly from loading states to populated content when data arrives

### Requirement 10

**User Story:** As a user, I want consistent input field formatting and validation patterns exactly matching the DepotFormModal implementation, so that I have predictable behavior when entering data.

#### Acceptance Criteria

1. THE Modal_System SHALL apply consistent phone number formatting with +225 prefix and space separation pattern (+225 XX XX XX XX)
2. THE Modal_System SHALL use the exact formatPhoneNumber function logic from DepotFormModal for phone field handling
3. THE Modal_System SHALL preserve existing formatting when users edit pre-formatted fields using includes(' ') check
4. THE Modal_System SHALL apply consistent email validation with border-red-400 error styling and error-text class for messages
5. THE Modal_System SHALL use consistent input field icons with input-icon class and appropriate colors (text-blue-500, text-green-500)

### Requirement 11

**User Story:** As a user, I want enhanced keyboard navigation and accessibility features in all modals, so that I can efficiently navigate using keyboard shortcuts and assistive technologies.

#### Acceptance Criteria

1. THE Modal_System SHALL support Ctrl+Arrow key navigation for multi-step modal progression
2. THE Modal_System SHALL provide Alt+Number key shortcuts to jump to specific steps in multi-step modals
3. THE Modal_System SHALL announce step changes and validation errors to screen readers using ARIA live regions
4. THE Modal_System SHALL trap focus within modal boundaries and restore focus to triggering element on close
5. THE Modal_System SHALL provide clear visual focus indicators with 2px blue outline and 2px offset

### Requirement 12

**User Story:** As a user, I want consistent mobile-optimized interactions across all modals, so that I can effectively use the application on touch devices.

#### Acceptance Criteria

1. THE Modal_System SHALL provide touch-friendly button sizes with minimum 44px height and width
2. THE Modal_System SHALL use mobile-optimized padding and spacing with mobile-button and mobile-input classes
3. THE Modal_System SHALL adapt modal layouts for full-screen presentation on mobile devices
4. THE Modal_System SHALL provide appropriate touch feedback with scale transforms on button press
5. THE Modal_System SHALL optimize form field layouts for mobile keyboard interaction

### Requirement 13

**User Story:** As a user, I want consistent color schemes and theming across all modals matching the DepotFormModal design, so that the application has a cohesive visual identity.

#### Acceptance Criteria

1. THE Modal_System SHALL use consistent section icon colors with text-blue-500 for primary sections and text-green-500 for contact/secondary sections
2. THE Modal_System SHALL apply consistent toggle switch colors with bg-blue-600 for active state and bg-gray-300 for inactive state
3. THE Modal_System SHALL use consistent text colors with text-gray-800 for active labels and text-gray-400 for inactive labels
4. THE Modal_System SHALL apply consistent error colors with border-red-400 and focus:ring-red-500 for input fields and error-text class for messages
5. THE Modal_System SHALL maintain consistent background colors with bg-white for sections and border-gray-100 for section borders