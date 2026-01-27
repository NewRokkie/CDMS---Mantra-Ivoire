/**
 * Phone number formatting utilities for consistent phone field handling
 * Based on DepotFormModal implementation patterns
 */

/**
 * Formats phone numbers with +225 prefix and space separation pattern (+225 XX XX XX XX)
 * Preserves existing formatting when users edit pre-formatted fields using includes(' ') check
 * 
 * @param value - The input phone number value
 * @returns Formatted phone number string
 */
export const formatPhoneNumber = (value: string): string => {
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

  // Format as Côte d'Ivoire number: +225 XX XX XX XX XX
  // Take first 8 digits after +225
  const digits = cleaned.substring(0, 10);
  const formatted = digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();

  return `+225 ${formatted}`;
};

/**
 * Creates a phone change handler that applies consistent formatting
 * 
 * @param handleInputChange - The form input change handler function
 * @param fieldName - The name of the phone field (e.g., 'contactPhone')
 * @returns Phone change handler function
 */
export const createPhoneChangeHandler = (
  handleInputChange: (field: any, value: any) => void,
  fieldName: any = 'contactPhone'
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const formatted = formatPhoneNumber(inputValue);
    handleInputChange(fieldName, formatted);
  };
};

/**
 * Validates if a phone number is properly formatted
 * 
 * @param phoneNumber - The phone number to validate
 * @returns True if the phone number is valid, false otherwise
 */
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber) return false;
  
  // Check if it matches the expected format: +225 XX XX XX XX XX
  const phoneRegex = /^\+225 \d{2} \d{2} \d{2} \d{2} \d{2}$/;
  return phoneRegex.test(phoneNumber);
};

/**
 * Extracts just the digits from a formatted phone number
 * 
 * @param formattedPhone - The formatted phone number
 * @returns Just the numeric digits
 */
export const extractPhoneDigits = (formattedPhone: string): string => {
  return formattedPhone.replace(/[^\d]/g, '');
};