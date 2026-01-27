// ========== CONTAINER TYPE OPTIONS ==========

export const containerTypeOptions = [
    { value: 'dry', label: "Dry", code20: '22G1', code40: '42G1', code40HC: '45G1', availableSizes: ['20ft', '40ft'], availableSizesHC: ['40ft'] },
    { value: 'reefer', label: "Reefer", code20: '22R1', code40: '42R1', code40HC: '45R1', availableSizes: ['20ft', '40ft'], availableSizesHC: ['40ft'] },
    { value: 'open_top', label: "Open Top", code20: '22U1', code40: '42U1', code40HC: '45U1', availableSizes: ['20ft', '40ft'], availableSizesHC: ['40ft'] },
    { value: 'flat_rack', label: "Flat Rack", code20: ['22P1','22P9'] , code40: ['42P1', '42P9'], availableSizes: ['20ft', '40ft'], availableSizesHC: ['40ft'] },
    { value: 'tank', label: "Tank", code20: '22T1', code40: '42T1', availableSizes: ['20ft', '40ft'], availableSizesHC: ['40ft'] },
    { value: 'open_side', label: "Open Side", code20: '22G3', code40: '42G3', availableSizes: ['20ft', '40ft'], availableSizesHC: ['40ft'] },
    { value: 'ventilated', label: "Ventilated", code20: '22V1', code40: '42V1', availableSizes: ['20ft', '40ft'], availableSizesHC: ['40ft'] },
    { value: 'hard_top', label: "Hard Top", code20: '22U6', code40: '42U6', code40HC: '45U6', availableSizes: ['20ft', '40ft'], availableSizesHC: ['40ft'] }
] as const;

// ========== FORM CONSTANTS ==========

export const GATE_IN_FORM_STEPS = {
  CONTAINER_INFO: 1,
  TRANSPORT_DETAILS: 2
} as const;

export const GATE_OUT_FORM_STEPS = {
  BOOKING_SELECTION: 1,
  TRANSPORT_DETAILS: 2
} as const;

export const CONTAINER_SIZES = {
  TWENTY_FOOT: '20ft',
  FORTY_FOOT: '40ft'
} as const;

export const CONTAINER_QUANTITIES = {
  SINGLE: 1,
  DOUBLE: 2
} as const;

export const CONTAINER_STATUS = {
  FULL: 'FULL',
  EMPTY: 'EMPTY'
} as const;

export const OPERATION_STATUS = {
  PENDING: 'pending',
  IN_PROCESS: 'in_process',
  COMPLETED: 'completed',
} as const;

// ========== VALIDATION CONSTANTS ==========

export const VALIDATION_MESSAGES = {
  CONTAINER_NUMBER_REQUIRED: 'Container number is required',
  CONTAINER_NUMBER_INVALID_LENGTH: 'Container number must be exactly 11 characters',
  CONTAINER_NUMBER_INVALID_FORMAT: 'Container number must be 4 letters followed by 7 numbers',
  BOOKING_REQUIRED: 'Please select a booking',
  DRIVER_NAME_REQUIRED: 'Driver name is required',
  VEHICLE_NUMBER_REQUIRED: 'Vehicle number is required',
  TRANSPORT_COMPANY_REQUIRED: 'Transport company is required',
  CLIENT_REQUIRED: 'Please select a client'
} as const;

// ========== UI CONSTANTS ==========

export const ANIMATION_CLASSES = {
  FADE_IN: 'animate-fade-in',
  SLIDE_IN_UP: 'animate-slide-in-up',
  SLIDE_IN_RIGHT: 'animate-slide-in-right',
  SPIN: 'animate-spin',
  BOUNCE: 'animate-bounce'
} as const;

export const COMMON_STYLES = {
  MODAL_BACKDROP: 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50',
  MODAL_CONTAINER: 'bg-white rounded-2xl w-full max-w-2xl shadow-strong animate-slide-in-up max-h-[90vh] overflow-hidden flex flex-col',
  CARD_CONTAINER: 'bg-white rounded-xl border border-gray-200 shadow-sm p-6',
  BUTTON_PRIMARY: 'btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 sm:px-6 sm:py-2 text-sm',
  BUTTON_SECONDARY: 'btn-secondary px-3 py-2 sm:px-6 sm:py-2 text-sm',
  INPUT_FIELD: 'form-input w-full text-base py-4'
} as const;
