import { useState, useCallback } from 'react';

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
  const [validation, setValidation] = useState<FormValidationState>({
    errors: {},
    touched: {},
    isValid: true
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

  const resetForm = useCallback(() => {
    setFormData(initialData);
    setValidation({
      errors: {},
      touched: {},
      isValid: true
    });
  }, [initialData]);

  const getValidationErrors = useCallback((): string[] => {
    return Object.values(validation.errors).filter(error => error !== '');
  }, [validation.errors]);

  return {
    formData,
    validation,
    handleInputChange,
    handleFieldBlur,
    resetForm,
    validateForm,
    getValidationErrors
  };
};
