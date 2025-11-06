# Implementation Plan

- [x] 1. Create standardized modal component library







  - Create base modal components with consistent styling and behavior
  - Implement reusable modal variants (Standard, Form, Multi-step, Data Display)
  - Add loading states, skeleton components, and notification system
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 1.1 Create base StandardModal component


  - Implement modal container with backdrop overlay and consistent dimensions
  - Add modal header with title, subtitle, icon, and close button
  - Create scrollable modal body and fixed footer structure
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_



- [x] 1.2 Create FormModal component extending StandardModal

  - Add form submission handling and validation error display
  - Implement consistent form section styling with icons and colors
  - Add auto-save functionality and loading states for form submission

  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 1.3 Create MultiStepModal component with progress tracking



  - Implement step navigation with progress bar and step indicators
  - Add step validation and navigation controls (Previous/Next buttons)
  - Create step transition animations and progress percentage calculation
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 1.4 Create notification and status messaging system

  - Implement NotificationArea component with success, error, warning, and info states
  - Add auto-dismiss functionality for success notifications
  - Create consistent notification styling with appropriate icons and colors
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 1.5 Create loading states and skeleton components


  - Implement LoadingOverlay component for data fetching states
  - Create skeleton components for form fields, sections, and data displays
  - Add smooth transitions between loading and loaded states
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 1.6 Write unit tests for modal components
  - Test modal opening, closing, and keyboard navigation
  - Test form validation, submission, and error handling
  - Test multi-step navigation and progress tracking
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 2. Migrate high-priority modal components to new standard




  - Update UserFormModal, DepotFormModal, and ContainerEditModal
  - Migrate GateInModal and GateOutModal to use standardized components
  - Update BookingDetailsModal and other data display modals
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2.1 Migrate UserFormModal to use new FormModal component


  - Replace existing modal structure with standardized FormModal
  - Update form sections to use consistent styling and validation
  - Implement loading states for user data fetching and submission
  - _Requirements: 1.1, 3.1, 6.1, 8.1, 9.1_



- [x] 2.2 Update DepotFormModal to use new MultiStepModal component

  - Migrate existing multi-step structure to standardized MultiStepModal
  - Update progress bar and step navigation to use new components
  - Ensure form validation and submission work with new structure


  - _Requirements: 2.1, 2.2, 2.3, 5.1, 6.1_

- [x] 2.3 Migrate ContainerEditModal to use new FormModal component

  - Replace existing modal structure with standardized FormModal


  - Update form sections for container details, location, client, and damage
  - Implement consistent dropdown and search field styling
  - _Requirements: 1.1, 6.1, 6.2, 8.1, 8.3_


- [x] 2.4 Update GateInModal to use new MultiStepModal component

  - Migrate existing 3-step structure to standardized MultiStepModal
  - Update step validation and navigation controls
  - Implement consistent form field styling across all steps
  - _Requirements: 2.1, 2.2, 5.1, 6.1, 8.1_

- [x] 2.5 Migrate BookingDetailsModal to use new DataDisplayModal component

  - Replace existing modal structure with standardized DataDisplayModal
  - Update data sections to use consistent styling and layout
  - Implement loading states for booking data fetching
  - _Requirements: 1.1, 6.1, 6.2, 9.1_

- [x] 2.6 Write integration tests for migrated modals
  - Test data flow and form submission in migrated modals
  - Test multi-step navigation and validation in complex modals
  - Test loading states and error handling in data display modals
  - _Requirements: 2.1, 3.1, 4.1, 9.1_

- [x] 3. Migrate remaining modal components




  - Update StackFormModal, StackClientAssignmentModal, and other yard management modals
  - Migrate ClientFormModal and other client management modals
  - Update AuditLogModal, ContainerViewModal, and other display modals
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 3.1 Migrate yard management modals (StackFormModal, StackClientAssignmentModal)


  - Update StackFormModal to use new FormModal component
  - Migrate StackClientAssignmentModal to use standardized components
  - Implement consistent form validation and submission handling
  - _Requirements: 1.1, 3.1, 6.1, 8.1_



- [x] 3.2 Migrate client management modals (ClientFormModal)




  - Update ClientFormModal to use new FormModal component
  - Implement consistent form sections and validation
  - Add loading states for client data operations


  - _Requirements: 1.1, 3.1, 6.1, 9.1_

- [x] 3.3 Migrate container and audit modals (ContainerViewModal, AuditLogModal)





  - Update ContainerViewModal to use new DataDisplayModal component


  - Migrate AuditLogModal to use standardized modal structure
  - Implement consistent data display sections and styling
  - _Requirements: 1.1, 6.1, 6.2_



- [x] 3.4 Migrate gate operation modals (GateOutModal, DamageAssessmentModal, StackSelectionModal)





  - Update GateOutModal to use new FormModal or MultiStepModal as appropriate
  - Migrate specialized modals to use standardized components
  - Implement consistent form validation and submission

  - _Requirements: 1.1, 2.1, 3.1, 6.1_

- [x] 3.5 Update depot management modals (DepotDetailModal, DepotAssignmentModal)




  - Migrate DepotDetailModal to use new DataDisplayModal component
  - Update DepotAssignmentModal to use new FormModal component
  - Implement consistent styling and behavior across depot modals
  - _Requirements: 1.1, 6.1, 6.2_

- [ ] 3.6 Write comprehensive tests for all migrated modals
  - Test modal behavior consistency across all components
  - Test responsive design and accessibility features
  - Test error handling and loading states
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Standardize all modals to exact DepotFormModal patterns





  - Update all existing modals to use exact DepotFormModal styling patterns
  - Implement consistent section styling, input patterns, toggle switches, and color schemes
  - Ensure all modals use the MultiStepModal component where appropriate
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.3, 8.4, 8.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6.1 Create DepotFormModal CSS class standards


  - Extract exact CSS patterns from DepotFormModal into reusable classes
  - Create depot-section, depot-input, depot-toggle, and depot-form-grid classes
  - Update index.css with standardized DepotFormModal patterns
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 8.1, 8.2, 13.1, 13.2, 13.5_

- [x] 6.2 Implement formatPhoneNumber utility function


  - Create reusable formatPhoneNumber function matching DepotFormModal implementation
  - Add handlePhoneChange pattern for consistent phone field handling
  - Ensure +225 prefix and space formatting (XX XX XX XX) pattern
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 6.3 Update all form modals to use DepotFormModal section patterns


  - Apply bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md styling
  - Use font-semibold text-gray-800 mb-5 flex items-center for section headers
  - Implement consistent icon colors (text-blue-500, text-green-500) and spacing (h-5 w-5 mr-2)
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 13.1, 13.2_

- [x] 6.4 Standardize all input fields to DepotFormModal patterns


  - Apply consistent input class with border-red-400 focus:ring-red-500 error states
  - Use input-icon class for left-positioned icons with pl-10 padding
  - Implement consistent dropdown styling with appearance-none pr-10 and ChevronDown positioning
  - _Requirements: 8.1, 8.3, 8.5, 10.5_

- [x] 6.5 Standardize all toggle switches to DepotFormModal patterns


  - Apply w-11 h-6 rounded-full container with bg-blue-600/bg-gray-300 states
  - Use w-4 h-4 bg-white rounded-full thumb with translate-x-6/translate-x-1 positioning
  - Implement consistent label styling with text-gray-800/text-gray-400 active/inactive states
  - _Requirements: 8.2, 13.2, 13.3_

- [x] 6.6 Update all multi-step modals to use consistent stepper design


  - Ensure all multi-step modals use MultiStepModal component with showProgressBar={true}
  - Apply consistent step labels in French format matching DepotFormModal
  - Maintain existing ProgressBar component styling with w-6 h-6 rounded-full indicators
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6.7 Apply consistent spacing and layout patterns


  - Use space-y-8 between sections and transition-all duration-300 for step transitions
  - Apply grid-cols-1 md:grid-cols-2 gap-6 for form field layouts
  - Implement md:col-span-2 pt-4 border-t border-gray-100 for field separators
  - _Requirements: 1.5, 6.3, 6.4, 6.5_

- [x] 6.8 Test DepotFormModal pattern consistency across all modals


  - Verify all modals use exact DepotFormModal styling patterns
  - Test toggle switches, input fields, section headers, and color schemes
  - Ensure phone formatting and validation work consistently
  - _Requirements: 1.1, 2.1, 6.1, 8.1, 10.1, 13.1_

- [x] 4. Implement responsive design and accessibility features


  - Add responsive breakpoints and mobile optimizations
  - Implement ARIA labels, focus management, and keyboard navigation
  - Add screen reader support and semantic HTML structure
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4.1 Implement responsive design system for all modals


  - Add mobile-first responsive breakpoints and sizing
  - Implement touch-friendly interface elements for mobile devices
  - Optimize modal layouts for tablet and desktop screen sizes
  - _Requirements: 7.1, 7.2_

- [x] 4.2 Add comprehensive accessibility features


  - Implement ARIA labels, roles, and properties for screen readers
  - Add focus management and keyboard navigation support
  - Ensure sufficient color contrast ratios for all text and elements
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 4.3 Implement keyboard navigation and focus management


  - Add Escape key functionality to close modals
  - Implement Tab navigation and focus trapping within modals
  - Return focus to triggering element when modal closes
  - _Requirements: 5.4, 5.5, 7.4_


- [x] 4.4 Write accessibility and responsive design tests
  - Test keyboard navigation and screen reader compatibility
  - Test modal behavior across different screen sizes and devices
  - Test color contrast and visual accessibility requirements
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 5 Create design system documentation
  - Document color palette, typography, and spacing systems
  - Create component library with visual examples and code snippets
  - Add guidelines for creating new modal variants
  - _Requirements: 6.1, 6.2, 6.3, 8.1, 8.2_