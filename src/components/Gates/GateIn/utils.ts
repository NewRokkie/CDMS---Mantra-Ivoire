import { ContainerValidation } from './types';

/**
 * Validates container number format
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
    return { isValid: false, message: 'First 4 characters must be letters (A-Z)' };
  }
  
  if (!/^[0-9]{7}$/.test(numbers)) {
    return { isValid: false, message: 'Last 7 characters must be numbers (0-9)' };
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