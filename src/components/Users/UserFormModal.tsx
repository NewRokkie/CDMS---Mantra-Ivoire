import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Phone, Building, Shield, AlertCircle } from 'lucide-react';
import type { User } from '../../types';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { useUserManagementRetry } from '../../hooks/useRetry';
import { FormModal } from '../Common/Modal/FormModal';
import { logger } from '../../utils/logger';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedUser?: User | null;
  onSubmit: (userData: any) => void;
  loading?: boolean;
}

interface FormValidationState {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
}

// Remove NotificationState interface as it's now handled by FormModal

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  selectedUser,
  onSubmit,
  loading = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    company: '',
    role: 'operator' as User['role'],
    isActive: true,
    password: ''
  });

  const [validation, setValidation] = useState<FormValidationState>({
    errors: {},
    touched: {},
    isValid: false
  });

  // Validation rules
  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length === 0) return 'Full name is required';
        if (value.trim().length < 2) return 'Name must be at least 2 characters';
        if (value.trim().length > 100) return 'Name must be less than 100 characters';
        return '';
      
      case 'email':
        if (!value || value.trim().length === 0) return 'Email address is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      
      case 'phone':
        if (value && value.trim().length > 0) {
          const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,20}$/;
          if (!phoneRegex.test(value)) return 'Please enter a valid phone number';
        }
        return '';
      
      case 'password':
        if (!selectedUser) { // Only validate password for new users
          if (!value || value.length === 0) return 'Password is required for new users';
          if (value.length < 6) return 'Password must be at least 6 characters';
          if (value.length > 128) return 'Password must be less than 128 characters';
        }
        return '';
      
      case 'department':
        if (value && value.trim().length > 100) return 'Department must be less than 100 characters';
        return '';
      
      case 'company':
        if (value && value.trim().length > 100) return 'Company must be less than 100 characters';
        return '';
      
      default:
        return '';
    }
  };

  const validateForm = (): FormValidationState => {
    const errors: Record<string, string> = {};
    
    // Validate all fields
    Object.keys(formData).forEach(field => {
      if (field !== 'isActive' && field !== 'role') {
        const error = validateField(field, formData[field as keyof typeof formData]);
        if (error) {
          errors[field] = error;
        }
      }
    });

    return {
      errors,
      touched: validation.touched,
      isValid: Object.keys(errors).length === 0
    };
  };

  // showNotification is now handled by FormModal

  // Initialize form data when editing
  useEffect(() => {
    if (selectedUser) {
      setFormData({
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone || '',
        department: selectedUser.department || '',
        company: selectedUser.company || '',
        role: selectedUser.role,
        isActive: selectedUser.isActive,
        password: '' // Never pre-fill password
      });
    } else {
      // Reset form for new user
      setFormData({
        name: '',
        email: '',
        phone: '',
        department: '',
        company: '',
        role: 'operator',
        isActive: true,
        password: ''
      });
    }
    
    // Reset validation state
    setValidation({
      errors: {},
      touched: {},
      isValid: false
    });
    
    // Notifications are now handled by FormModal
  }, [selectedUser, isOpen]);

  const handleInputChange = (field: string, value: any, triggerAutoSave?: () => void) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Real-time validation for touched fields
    if (validation.touched[field]) {
      const error = validateField(field, value);
      setValidation(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [field]: error
        }
      }));
    }
    
    if (triggerAutoSave) {
      triggerAutoSave();
    }
  };

  const handleFieldBlur = (field: string) => {
    const error = validateField(field, formData[field as keyof typeof formData]);
    setValidation(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: true
      },
      errors: {
        ...prev.errors,
        [field]: error
      }
    }));
  };

  // Use retry mechanism for form submission
  const {
    execute: submitWithRetry
  } = useUserManagementRetry(async (formData: any) => {
    return await onSubmit(formData);
  }, 'write');

  const handleFormSubmit = async () => {
    // Validate entire form
    const formValidation = validateForm();
    
    // Mark all fields as touched to show validation errors
    const allTouched = Object.keys(formData).reduce((acc, field) => {
      acc[field] = true;
      return acc;
    }, {} as Record<string, boolean>);
    
    setValidation({
      ...formValidation,
      touched: allTouched
    });

    if (!formValidation.isValid) {
      const errorFields = Object.keys(formValidation.errors);
      throw new Error(`Please fix the following fields: ${errorFields.join(', ')}`);
    }

    setIsSubmitting(true);
    try {
      await submitWithRetry(formData);
      // FormModal will handle success notification and modal closing
    } catch (error) {
      setIsSubmitting(false);
      throw error; // Re-throw to let FormModal handle error display
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get validation errors as string array for FormModal
  const getValidationErrors = (): string[] => {
    const formValidation = validateForm();
    return Object.values(formValidation.errors).filter(error => error !== '');
  };

  const getRoleDescription = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'Full system access across all modules';
      case 'supervisor': return 'Operations oversight and management';
      case 'operator': return 'Daily operations and container handling';
      case 'client': return 'View containers and create release orders';
      default: return '';
    }
  };

  return (
    <ErrorBoundary
      context={`User Form Modal - ${selectedUser ? 'Edit' : 'Create'} User`}
      onError={(error, errorInfo) => {
        logger.error('User Form Modal component error', 'UserFormModal', {
          error: error.message,
          isEditing: !!selectedUser,
          userId: selectedUser?.id,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <FormModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleFormSubmit}
        title={selectedUser ? 'Edit User' : 'Create New User'}
        subtitle={selectedUser ? 'Update user information and permissions' : 'Add a new user to the system'}
        icon={UserIcon}
        size="lg"
        submitLabel={selectedUser ? 'Update User' : 'Create User'}
        isSubmitting={isSubmitting || loading}
        validationErrors={getValidationErrors()}
        autoSave={true}
        onAutoSave={() => {
          // Auto-save logic can be implemented here if needed
        }}
      >
        {/* Pass triggerAutoSave and showNotification as props to form sections */}
        <UserFormContent
          formData={formData}
          validation={validation}
          selectedUser={selectedUser}
          onInputChange={handleInputChange}
          onFieldBlur={handleFieldBlur}
          getRoleDescription={getRoleDescription}
        />
      </FormModal>
    </ErrorBoundary>
  );
};

// Extract form content into a separate component for better organization
interface UserFormContentProps {
  formData: any;
  validation: FormValidationState;
  selectedUser?: User | null;
  onInputChange: (field: string, value: any, triggerAutoSave?: () => void) => void;
  onFieldBlur: (field: string) => void;
  getRoleDescription: (role: User['role']) => string;
  triggerAutoSave?: () => void;
  showNotification?: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const UserFormContent: React.FC<UserFormContentProps> = ({
  formData,
  validation,
  selectedUser,
  onInputChange,
  onFieldBlur,
  getRoleDescription,
  triggerAutoSave
}) => {
  return (
    <div className="depot-step-spacing">

      {/* Basic Information */}
      <div className="depot-section">
        <h4 className="depot-section-header">
          <UserIcon className="depot-section-icon text-blue-500" />
          Basic Information
        </h4>

        <div className="depot-form-grid">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => onInputChange('name', e.target.value, triggerAutoSave)}
              onBlur={() => onFieldBlur('name')}
              className={`depot-input ${
                validation.touched.name && validation.errors.name ? 'error' : ''
              }`}
              placeholder="John Doe"
            />
            {validation.touched.name && validation.errors.name && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validation.errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="depot-input-icon text-blue-500" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => onInputChange('email', e.target.value, triggerAutoSave)}
                onBlur={() => onFieldBlur('email')}
                className={`depot-input-with-icon ${
                  validation.touched.email && validation.errors.email ? 'error' : ''
                }`}
                placeholder="john.doe@company.com"
              />
            </div>
            {validation.touched.email && validation.errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validation.errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="depot-input-icon text-green-500" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => onInputChange('phone', e.target.value, triggerAutoSave)}
                onBlur={() => onFieldBlur('phone')}
                className={`depot-input-with-icon ${
                  validation.touched.phone && validation.errors.phone ? 'error' : ''
                }`}
                placeholder="+225 XX XX XX XX XX"
              />
            </div>
            {validation.touched.phone && validation.errors.phone && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validation.errors.phone}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => onInputChange('department', e.target.value, triggerAutoSave)}
              onBlur={() => onFieldBlur('department')}
              className={`depot-input ${
                validation.touched.department && validation.errors.department ? 'error' : ''
              }`}
              placeholder="Operations, Administration, etc."
            />
            {validation.touched.department && validation.errors.department && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validation.errors.department}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Company
            </label>
            <div className="relative">
              <Building className="depot-input-icon text-blue-500" />
              <input
                type="text"
                value={formData.company}
                onChange={(e) => onInputChange('company', e.target.value, triggerAutoSave)}
                onBlur={() => onFieldBlur('company')}
                className={`depot-input-with-icon ${
                  validation.touched.company && validation.errors.company ? 'error' : ''
                }`}
                placeholder="Container Depot Ltd"
              />
            </div>
            {validation.touched.company && validation.errors.company && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {validation.errors.company}
              </p>
            )}
          </div>

          {!selectedUser && (
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-2">
                Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => onInputChange('password', e.target.value, triggerAutoSave)}
                onBlur={() => onFieldBlur('password')}
                className={`depot-input ${
                  validation.touched.password && validation.errors.password ? 'error' : ''
                }`}
                placeholder="Enter secure password"
                minLength={6}
              />
              {validation.touched.password && validation.errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {validation.errors.password}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role & Permissions */}
      <div className="depot-section">
        <h4 className="depot-section-header">
          <Shield className="depot-section-icon text-green-500" />
          Role & Permissions
        </h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-purple-800 mb-2">
              User Role *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) => onInputChange('role', e.target.value, triggerAutoSave)}
              className="depot-select"
            >
              <option value="operator">Operator</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Administrator</option>
              <option value="client">Client</option>
            </select>
            <p className="text-xs text-purple-600 mt-1">
              {getRoleDescription(formData.role)}
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="depot-section">
        <h4 className="depot-section-header">
          <UserIcon className="depot-section-icon text-blue-500" />
          User Status
        </h4>
        <div className="depot-toggle-container">
          <span className={`depot-toggle-label ${!formData.isActive ? 'inactive' : 'active'}`}>
            Inactive
          </span>
          <button
            type="button"
            onClick={() => onInputChange('isActive', !formData.isActive, triggerAutoSave)}
            className={`depot-toggle ${formData.isActive ? 'active' : 'inactive'}`}
          >
            <span
              className={`depot-toggle-thumb ${formData.isActive ? 'active' : 'inactive'}`}
            />
          </button>
          <span className={`depot-toggle-label ${formData.isActive ? 'active' : 'inactive'}`}>
            Active
          </span>
        </div>
      </div>
    </div>
  );
};
