/**
 * Enhanced validation service for Gate In operations
 * Provides comprehensive validation with detailed error messages
 */

import { GateInFormData } from '../components/Gates/types';
import { GateInError } from './errorHandling';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  userMessage: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  userMessage: string;
}

export interface ContainerValidationResult {
  isValid: boolean;
  message: string;
  formattedNumber?: string;
}

export class ValidationService {
  /**
   * Validates container number format with enhanced checks and auto-capitalization
   */
  static validateContainerNumber(containerNumber: string, fieldName: string = 'containerNumber'): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!containerNumber || containerNumber.trim() === '') {
      errors.push({
        field: fieldName,
        code: 'REQUIRED',
        message: 'Container number is required',
        userMessage: 'Container number is required'
      });
      return { isValid: false, errors, warnings };
    }

    const cleanNumber = containerNumber.trim().toUpperCase();

    // Check length - must be exactly 11 characters
    if (cleanNumber.length !== 11) {
      errors.push({
        field: fieldName,
        code: 'INVALID_LENGTH',
        message: `Container number must be exactly 11 characters, got ${cleanNumber.length}`,
        userMessage: `Container number must be exactly 11 characters (currently ${cleanNumber.length})`
      });
    }

    // Check format: exactly 4 letters + exactly 7 digits
    const letterPart = cleanNumber.substring(0, 4);
    const numberPart = cleanNumber.substring(4, 11);

    if (!/^[A-Z]{4}$/.test(letterPart)) {
      errors.push({
        field: fieldName,
        code: 'INVALID_LETTER_FORMAT',
        message: 'First 4 characters must be letters',
        userMessage: 'First 4 characters must be letters (A-Z)'
      });
    }

    if (!/^[0-9]{7}$/.test(numberPart)) {
      errors.push({
        field: fieldName,
        code: 'INVALID_NUMBER_FORMAT',
        message: 'Last 7 characters must be digits',
        userMessage: 'Last 7 characters must be numbers (0-9)'
      });
    }

    // Check for common patterns that might indicate errors
    if (cleanNumber === cleanNumber.charAt(0).repeat(11)) {
      warnings.push({
        field: fieldName,
        code: 'SUSPICIOUS_PATTERN',
        message: 'Container number appears to be all the same character',
        userMessage: 'Container number appears to be all the same character - please verify'
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates and formats container number with auto-capitalization
   * Returns validation result with formatted number for UI updates
   */
  static validateAndFormatContainerNumber(containerNumber: string): ContainerValidationResult {
    if (!containerNumber || containerNumber.trim() === '') {
      return { isValid: false, message: 'Container number is required' };
    }

    // Auto-capitalize and clean the input
    const formattedNumber = containerNumber.trim().toUpperCase();

    // Check length - must be exactly 11 characters
    if (formattedNumber.length !== 11) {
      return { 
        isValid: false, 
        message: `Must be exactly 11 characters (currently ${formattedNumber.length})`,
        formattedNumber 
      };
    }

    // Check format: exactly 4 letters + exactly 7 digits
    const letterPart = formattedNumber.substring(0, 4);
    const numberPart = formattedNumber.substring(4, 11);

    if (!/^[A-Z]{4}$/.test(letterPart)) {
      return { 
        isValid: false, 
        message: 'First 4 characters must be letters (A-Z)',
        formattedNumber 
      };
    }

    if (!/^[0-9]{7}$/.test(numberPart)) {
      return { 
        isValid: false, 
        message: 'Last 7 characters must be numbers (0-9)',
        formattedNumber 
      };
    }

    return { 
      isValid: true, 
      message: 'Valid format',
      formattedNumber 
    };
  }

  /**
   * Validates Gate In form data comprehensively
   */
  static validateGateInForm(formData: GateInFormData, step?: number, hasTimeTrackingAccess?: boolean): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Step 1 validations
    if (!step || step === 1) {
      // Container number validation
      const containerValidation = this.validateContainerNumber(formData.containerNumber);
      errors.push(...containerValidation.errors);
      warnings.push(...containerValidation.warnings);

      // Container number confirmation validation
      if (!formData.containerNumberConfirmation || formData.containerNumberConfirmation.trim() === '') {
        errors.push({
          field: 'containerNumberConfirmation',
          code: 'REQUIRED',
          message: 'Container number confirmation is required',
          userMessage: 'Please confirm the container number'
        });
      } else {
        const confirmationValidation = this.validateContainerNumber(
          formData.containerNumberConfirmation, 
          'containerNumberConfirmation'
        );
        errors.push(...confirmationValidation.errors);
        warnings.push(...confirmationValidation.warnings);

        // Check if container numbers match
        if (formData.containerNumber.trim().toUpperCase() !== formData.containerNumberConfirmation.trim().toUpperCase()) {
          errors.push({
            field: 'containerNumberConfirmation',
            code: 'CONTAINER_NUMBER_MISMATCH',
            message: 'Container number confirmation does not match',
            userMessage: 'Container numbers must match exactly'
          });
        }
      }

      // Second container number validation (if applicable)
      if (formData.containerQuantity === 2) {
        if (!formData.secondContainerNumber || formData.secondContainerNumber.trim() === '') {
          errors.push({
            field: 'secondContainerNumber',
            code: 'REQUIRED',
            message: 'Second container number is required when quantity is 2',
            userMessage: 'Second container number is required for double containers'
          });
        } else {
          const secondContainerValidation = this.validateContainerNumber(
            formData.secondContainerNumber, 
            'secondContainerNumber'
          );
          errors.push(...secondContainerValidation.errors);
          warnings.push(...secondContainerValidation.warnings);

          // Check for duplicate container numbers
          if (formData.containerNumber.trim().toUpperCase() === formData.secondContainerNumber.trim().toUpperCase()) {
            errors.push({
              field: 'secondContainerNumber',
              code: 'DUPLICATE_CONTAINER_NUMBER',
              message: 'Second container number cannot be the same as first container number',
              userMessage: 'Container numbers must be different'
            });
          }
        }

        // Second container number confirmation validation
        if (!formData.secondContainerNumberConfirmation || formData.secondContainerNumberConfirmation.trim() === '') {
          errors.push({
            field: 'secondContainerNumberConfirmation',
            code: 'REQUIRED',
            message: 'Second container number confirmation is required',
            userMessage: 'Please confirm the second container number'
          });
        } else {
          const secondConfirmationValidation = this.validateContainerNumber(
            formData.secondContainerNumberConfirmation, 
            'secondContainerNumberConfirmation'
          );
          errors.push(...secondConfirmationValidation.errors);
          warnings.push(...secondConfirmationValidation.warnings);

          // Check if second container numbers match
          if (formData.secondContainerNumber.trim().toUpperCase() !== formData.secondContainerNumberConfirmation.trim().toUpperCase()) {
            errors.push({
              field: 'secondContainerNumberConfirmation',
              code: 'SECOND_CONTAINER_NUMBER_MISMATCH',
              message: 'Second container number confirmation does not match',
              userMessage: 'Second container numbers must match exactly'
            });
          }
        }
      }

      // Client validation
      if (!formData.clientId || formData.clientId.trim() === '') {
        errors.push({
          field: 'clientId',
          code: 'REQUIRED',
          message: 'Client selection is required',
          userMessage: 'Please select a client'
        });
      }

      // Booking reference validation (required for FULL containers)
      if (formData.status === 'FULL') {
        if (!formData.bookingReference || formData.bookingReference.trim() === '') {
          errors.push({
            field: 'bookingReference',
            code: 'REQUIRED',
            message: 'Booking reference is required for FULL containers',
            userMessage: 'Booking reference is required for full containers'
          });
        } else if (formData.bookingReference.length < 3) {
          warnings.push({
            field: 'bookingReference',
            code: 'SHORT_BOOKING_REFERENCE',
            message: 'Booking reference appears to be very short',
            userMessage: 'Booking reference appears to be very short - please verify'
          });
        }
      }

      // Container type validation
      if (!formData.containerType || formData.containerType.trim() === '') {
        errors.push({
          field: 'containerType',
          code: 'REQUIRED',
          message: 'Container type is required',
          userMessage: 'Please select a container type'
        });
      } else {
        // Validate container type and size combinations
        if (formData.containerType === 'high_cube' && formData.containerSize === '20ft') {
          errors.push({
            field: 'containerType',
            code: 'INVALID_COMBINATION',
            message: 'High-Cube containers are only available in 40ft size',
            userMessage: 'High-Cube containers are only available in 40ft size. Please select 40ft container size or choose a different container type.'
          });
        }
      }

      // Container size validation
      if (!formData.containerSize) {
        errors.push({
          field: 'containerSize',
          code: 'REQUIRED',
          message: 'Container size is required',
          userMessage: 'Please select a container size'
        });
      }

      // Quantity validation for 40ft containers
      if (formData.containerSize === '40ft' && formData.containerQuantity === 2) {
        errors.push({
          field: 'containerQuantity',
          code: 'INVALID_QUANTITY_FOR_SIZE',
          message: '40ft containers cannot have quantity of 2',
          userMessage: '40ft containers are limited to single quantity'
        });
      }
    }

    // Step 2 validations
    if (!step || step === 2) {
      // Driver name validation
      if (!formData.driverName || formData.driverName.trim() === '') {
        errors.push({
          field: 'driverName',
          code: 'REQUIRED',
          message: 'Driver name is required',
          userMessage: 'Driver name is required'
        });
      } else if (formData.driverName.trim().length < 2) {
        warnings.push({
          field: 'driverName',
          code: 'SHORT_DRIVER_NAME',
          message: 'Driver name appears to be very short',
          userMessage: 'Driver name appears to be very short - please verify'
        });
      }

      // Truck number validation
      if (!formData.truckNumber || formData.truckNumber.trim() === '') {
        errors.push({
          field: 'truckNumber',
          code: 'REQUIRED',
          message: 'Truck number is required',
          userMessage: 'Truck number is required'
        });
      }

      // Transport company validation
      if (!formData.transportCompany || formData.transportCompany.trim() === '') {
        errors.push({
          field: 'transportCompany',
          code: 'REQUIRED',
          message: 'Transport company is required',
          userMessage: 'Transport company is required'
        });
      }

      // Date/time validation (only for users with Time Tracking access)
      if (hasTimeTrackingAccess && formData.truckArrivalDate) {
        const arrivalDate = new Date(formData.truckArrivalDate);
        const today = new Date();
        const futureLimit = new Date();
        futureLimit.setDate(today.getDate() + 7); // Allow up to 7 days in future

        if (arrivalDate > futureLimit) {
          warnings.push({
            field: 'truckArrivalDate',
            code: 'FUTURE_DATE',
            message: 'Arrival date is more than 7 days in the future',
            userMessage: 'Arrival date is quite far in the future - please verify'
          });
        }

        const pastLimit = new Date();
        pastLimit.setDate(today.getDate() - 30); // Allow up to 30 days in past

        if (arrivalDate < pastLimit) {
          warnings.push({
            field: 'truckArrivalDate',
            code: 'OLD_DATE',
            message: 'Arrival date is more than 30 days in the past',
            userMessage: 'Arrival date is quite old - please verify'
          });
        }
      }
    }

    // Step 3 validations (Final Review - No Stack Selection Required)
    if (!step || step === 3) {
      // Stack assignment is now handled in pending operations, not during initial Gate In
      // No stack validation required for Step 3
      
      // Final validation - ensure all previous steps are still valid
      const step1Validation = this.validateGateInForm(formData, 1, hasTimeTrackingAccess);
      const step2Validation = this.validateGateInForm(formData, 2, hasTimeTrackingAccess);
      
      errors.push(...step1Validation.errors);
      errors.push(...step2Validation.errors);
      warnings.push(...step1Validation.warnings);
      warnings.push(...step2Validation.warnings);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates business rules for Gate In operation
   */
  static validateBusinessRules(formData: GateInFormData, existingContainers: string[] = []): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for duplicate containers in system
    if (existingContainers.includes(formData.containerNumber.trim().toUpperCase())) {
      errors.push({
        field: 'containerNumber',
        code: 'DUPLICATE_IN_SYSTEM',
        message: 'Container already exists in system',
        userMessage: 'This container is already registered in the system'
      });
    }

    if (formData.containerQuantity === 2 && formData.secondContainerNumber) {
      if (existingContainers.includes(formData.secondContainerNumber.trim().toUpperCase())) {
        errors.push({
          field: 'secondContainerNumber',
          code: 'DUPLICATE_IN_SYSTEM',
          message: 'Second container already exists in system',
          userMessage: 'This container is already registered in the system'
        });
      }
    }



    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates step-specific requirements
   */
  static validateStep(step: number, formData: GateInFormData, hasTimeTrackingAccess?: boolean): ValidationResult {
    return this.validateGateInForm(formData, step, hasTimeTrackingAccess);
  }

  /**
   * Creates a validation error for throwing
   */
  static createValidationError(validationResult: ValidationResult): GateInError {
    const firstError = validationResult.errors[0];
    return new GateInError({
      code: firstError?.code || 'VALIDATION_ERROR',
      message: firstError?.message || 'Validation failed',
      severity: 'error',
      retryable: false,
      userMessage: firstError?.userMessage || 'Please check the form and try again',
      technicalDetails: validationResult.errors.map(e => `${e.field}: ${e.message}`).join('; ')
    });
  }

  /**
   * Formats validation errors for display
   */
  static formatValidationErrors(validationResult: ValidationResult): string[] {
    return validationResult.errors.map(error => error.userMessage);
  }

  /**
   * Formats validation warnings for display
   */
  static formatValidationWarnings(validationResult: ValidationResult): string[] {
    return validationResult.warnings.map(warning => warning.userMessage);
  }
}