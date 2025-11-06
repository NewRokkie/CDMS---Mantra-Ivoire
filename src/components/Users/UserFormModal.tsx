import React, { useState, useEffect } from 'react';
import { User as UserIcon, Mail, Phone, Building, Shield, MapPin, Check, AlertCircle } from 'lucide-react';
import type { User } from '../../types';
import { useYard } from '../../hooks/useYard';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { useUserManagementRetry } from '../../hooks/useRetry';
import { FormModal } from '../Common/Modal/FormModal';

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
  const { availableYards } = useYard();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    company: '',
    role: 'operator' as User['role'],
    yardAssignments: [] as string[],
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
      if (field !== 'yardAssignments' && field !== 'isActive' && field !== 'role') {
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
        yardAssignments: selectedUser.yardAssignments || [],
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
        yardAssignments: [],
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

  const handleYardAssignmentToggle = (yardId: string, triggerAutoSave?: () => void) => {
    setFormData(prev => ({
      ...prev,
      yardAssignments: prev.yardAssignments.includes(yardId)
        ? prev.yardAssignments.filter(id => id !== yardId)
        : [...prev.yardAssignments, yardId]
    }));
    if (triggerAutoSave) {
      triggerAutoSave();
    }
  };

  const handleSelectAllYards = (triggerAutoSave?: () => void) => {
    const allYardIds = availableYards.map(yard => yard.id);
    setFormData(prev => ({
      ...prev,
      yardAssignments: prev.yardAssignments.length === allYardIds.length ? [] : allYardIds
    }));
    if (triggerAutoSave) {
      triggerAutoSave();
    }
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
        console.error('🚨 [USER_FORM_MODAL] Component error:', {
          error: error.message,
          isEditing: !!selectedUser,
          userId: selectedUser?.id,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString()
        });
      }}
    >
      <FormModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleFormSubmit}
        title={selectedUser ? 'Edit User' : 'Create New User'}
        subtitle={selectedUser ? 'Update user information and yard assignments' : 'Add a new user to the system'}
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
          availableYards={availableYards}
          selectedUser={selectedUser}
          onInputChange={handleInputChange}
          onFieldBlur={handleFieldBlur}
          onYardAssignmentToggle={handleYardAssignmentToggle}
          onSelectAllYards={handleSelectAllYards}
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
  availableYards: any[];
  selectedUser?: User | null;
  onInputChange: (field: string, value: any, triggerAutoSave?: () => void) => void;
  onFieldBlur: (field: string) => void;
  onYardAssignmentToggle: (yardId: string, triggerAutoSave?: () => void) => void;
  onSelectAllYards: (triggerAutoSave?: () => void) => void;
  getRoleDescription: (role: User['role']) => string;
  triggerAutoSave?: () => void;
  showNotification?: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const UserFormContent: React.FC<UserFormContentProps> = ({
  formData,
  validation,
  availableYards,
  selectedUser,
  onInputChange,
  onFieldBlur,
  onYardAssignmentToggle,
  onSelectAllYards,
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

      {/* Yard Assignments */}
      <div className="depot-section">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-600 text-white rounded-lg">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-green-900">Yard Assignments (Optional)</h4>
              <p className="text-sm text-green-700">
                Select which yards this user can access ({formData.yardAssignments.length} selected). You can assign yards later if needed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectAllYards(triggerAutoSave)}
            className="text-sm font-medium text-green-600 hover:text-green-800 px-3 py-1 hover:bg-green-100 rounded-md transition-colors"
          >
            {formData.yardAssignments.length === availableYards.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {availableYards.map((yard) => {
            const isSelected = formData.yardAssignments.includes(yard.id);
            const occupancyRate = (yard.currentOccupancy / yard.totalCapacity) * 100;

            return (
              <div
                key={yard.id}
                onClick={() => onYardAssignmentToggle(yard.id, triggerAutoSave)}
                className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'border-green-500 bg-green-100 shadow-md'
                    : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg transition-all duration-200 ${
                      isSelected
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Building className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{yard.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {yard.code}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{yard.location}</div>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="text-xs text-gray-500">
                          {yard.currentOccupancy}/{yard.totalCapacity} containers
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          occupancyRate >= 90 ? 'bg-red-100 text-red-600' :
                          occupancyRate >= 75 ? 'bg-orange-100 text-orange-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {occupancyRate.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="bg-green-500 text-white rounded-full p-1 animate-scale-in">
                        <Check className="h-3 w-3" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {availableYards.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No yards available</p>
            <p className="text-xs">Contact administrator to set up yards</p>
          </div>
        )}
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
