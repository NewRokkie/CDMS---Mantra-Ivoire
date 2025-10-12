import { ContainerValidation, GateInFormData } from './types';

// ========== CONTAINER UTILITIES ==========

/**
 * Validates container number format (4 letters + 7 numbers)
 */
export const validateContainerNumber = (containerNumber: string): ContainerValidation => {
  if (!containerNumber) {
    return { isValid: false, message: 'Container number is required' };
  }

  if (containerNumber.length !== 11) {
    return { isValid: false, message: `${containerNumber.length}/11 characters` };
  }

  const letters = containerNumber.substring(0, 4);
  const numbers = containerNumber.substring(4, 11);

  if (!/^[A-Z]{4}$/.test(letters)) {
    return { isValid: false, message: 'First 4 must be letters' };
  }

  if (!/^[0-9]{7}$/.test(numbers)) {
    return { isValid: false, message: 'Last 7 must be numbers' };
  }

  return { isValid: true, message: 'Valid format' };
};

/**
 * Formats container number for display (adds hyphens)
 */
export const formatContainerNumberForDisplay = (containerNumber: string): string => {
  if (containerNumber.length === 11) {
    const letters = containerNumber.substring(0, 4);
    const numbers1 = containerNumber.substring(4, 10);
    const numbers2 = containerNumber.substring(10, 11);
    return `${letters}-${numbers1}-${numbers2}`;
  }
  return containerNumber;
};

/**
 * Gets container validation status for display in UI
 */
export const getContainerValidationStatus = (containerNumber: string) => {
  if (!containerNumber) return { isValid: false, message: '' };

  if (containerNumber.length !== 11) {
    return {
      isValid: false,
      message: `${containerNumber.length}/11 characters`
    };
  }

  const letters = containerNumber.substring(0, 4);
  const numbers = containerNumber.substring(4, 11);

  if (!/^[A-Z]{4}$/.test(letters)) {
    return { isValid: false, message: 'First 4 must be letters' };
  }

  if (!/^[0-9]{7}$/.test(numbers)) {
    return { isValid: false, message: 'Last 7 must be numbers' };
  }

  return { isValid: true, message: 'Valid format' };
};

// ========== FORM UTILITIES ==========

/**
 * Validates a step in the Gate In form
 */
export const validateGateInStep = (step: number, formData: GateInFormData): boolean => {
  switch (step) {
    case 1:
      const hasContainerNumber = formData.containerNumber.trim() !== '';
      const isValidFirstContainer = hasContainerNumber && validateContainerNumber(formData.containerNumber).isValid;
      const hasSecondContainer = formData.containerQuantity === 1 || formData.secondContainerNumber.trim() !== '';
      const isValidSecondContainer = formData.containerQuantity === 1 || validateContainerNumber(formData.secondContainerNumber).isValid;
      const hasClient = formData.clientId !== '';
      const hasBookingRef = formData.status === 'EMPTY' || formData.bookingReference.trim() !== '';
      return isValidFirstContainer && hasSecondContainer && isValidSecondContainer && hasClient && hasBookingRef;
    case 2:
      return formData.driverName !== '' && formData.truckNumber !== '' && formData.transportCompany !== '';
    default:
      return true;
  }
};

// ========== OPERATION UTILITIES ==========

/**
 * Gets status badge configuration for operations
 */
export const getStatusBadgeConfig = (status: string) => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
    in_process: { color: 'bg-blue-100 text-blue-800', label: 'In Process' }
  };

  return statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', label: status };
};

/**
 * Gets status color classes for different operation statuses
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in_process':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// ========== DATE/TIME UTILITIES ==========

/**
 * Formats date for display
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Gets current date in ISO format (YYYY-MM-DD)
 */
export const getCurrentDateISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Gets current time in HH:MM format
 */
export const getCurrentTime = (): string => {
  return new Date().toTimeString().slice(0, 5);
};

// ========== STRING UTILITIES ==========

/**
 * Capitalizes first letter of a string
 */
export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Formats container type for display
 */
export const formatContainerType = (containerType: string): string => {
  return containerType.split('_').map(word => capitalizeFirst(word)).join(' ');
};

// ========== VALIDATION UTILITIES ==========

/**
 * Validates required fields
 */
export const validateRequired = (value: string, fieldName: string): { isValid: boolean; message?: string } => {
  if (!value || value.trim() === '') {
    return { isValid: false, message: `${fieldName} is required` };
  }
  return { isValid: true };
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return { isValid: true }; // Optional field
  if (!emailRegex.test(email)) {
    return { isValid: false, message: 'Invalid email format' };
  }
  return { isValid: true };
};
