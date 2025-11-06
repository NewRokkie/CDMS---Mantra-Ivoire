import { useState, useCallback } from 'react';
import { NotificationState } from '../types';

interface FormValidationState {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
}

export const useFormModal = <T extends Record<string, any>>(
  initialData: T,
  validationRules?: Record<keyof T, (value: any) => string>
) => {
  const [formData, setFormData] = useState<T>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validation, setValidation] = useState<FormValidationState>({
    errors: {},
    touched: {},
    isValid: true
  });
  const [notification, setNotification] = useState<NotificationState>({
    type: 'info',
    message: '',
    show: false,
    autoHide: true,
    duration: 1500
  });

  const validateField = useCallback((field: keyof T, value: any): string => {
    if (validationRules && validationRules[field]) {
      return validationRules[field](value);
    }
    return '';
  }, [validationRules]);

  const validateForm = useCallback((): boolean => {
    if (!validationRules) return true;

    const errors: Record<string, string> = {};
    let isValid = true;

    Object.keys(validationRules).forEach((field) => {
      const error = validateField(field as keyof T, formData[field]);
      if (error) {
        errors[field] = error;
        isValid = false;
      }
    });

    setValidation(prev => ({
      ...prev,
      errors,
      isValid
    }));

    return isValid;
  }, [formData, validationRules, validateField]);

  const handleInputChange = useCallback((field: keyof T, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Real-time validation for touched fields
    if (validation.touched[field as string]) {
      const error = validateField(field, value);
      setValidation(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field as string]: error
        }
      }));
    }
  }, [validation.touched, validateField]);

  const handleFieldBlur = useCallback((field: keyof T) => {
    const error = validateField(field, formData[field]);
    setValidation(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field as string]: true
      },
      errors: {
        ...prev.errors,
        [field as string]: error
      }
    }));
  }, [formData, validateField]);

  const showNotification = useCallback((
    type: NotificationState['type'],
    message: string,
    options?: { autoHide?: boolean; duration?: number }
  ) => {
    setNotification({
      type,
      message,
      show: true,
      autoHide: options?.autoHide ?? (type === 'success'),
      duration: options?.duration ?? 1500
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setValidation({
      errors: {},
      touched: {},
      isValid: true
    });
    hideNotification();
  }, [initialData, hideNotification]);

  const submitForm = useCallback(async (
    onSubmit: (data: T) => Promise<void>
  ) => {
    if (!validateForm()) {
      const errorFields = Object.keys(validation.errors);
      showNotification('error', `Please fix the following fields: ${errorFields.join(', ')}`, { autoHide: false });
      return false;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      showNotification('success', 'Form submitted successfully!');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      showNotification('error', `Submission failed: ${errorMessage}`, { autoHide: false });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, validation.errors, showNotification]);

  const getValidationErrors = useCallback((): string[] => {
    return Object.values(validation.errors).filter(error => error !== '');
  }, [validation.errors]);

  return {
    formData,
    isSubmitting,
    validation,
    notification,
    handleInputChange,
    handleFieldBlur,
    showNotification,
    hideNotification,
    resetForm,
    submitForm,
    validateForm,
    getValidationErrors
  };
};