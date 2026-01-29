import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { userService } from '../../services/api/userService';
import { logger } from '../../utils/logger';

interface InitialAdminSetupProps {
  onAdminCreated: () => void;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const IMAGE_PATHS = {
  LOGO_MANTRA: '/assets/logo_mantra.png'
} as const;

export const InitialAdminSetup: React.FC<InitialAdminSetupProps> = ({ onAdminCreated }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name cannot exceed 100 characters';
    } else if (!/^[a-zA-Z\s\-'\.]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      } else if (formData.email.trim().length > 254) {
        newErrors.email = 'Email address cannot exceed 254 characters';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (formData.password.length > 128) {
      newErrors.password = 'Password cannot exceed 128 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Clear general error when user makes changes
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Clear previous errors
    setErrors({});
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      logger.info('Creating initial admin user', 'InitialAdminSetup', {
        email: formData.email,
        name: formData.name
      });

      const result = await userService.createInitialAdmin({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      }, {
        ipAddress: 'unknown', // Could be enhanced to get real IP
        userAgent: navigator.userAgent
      });

      logger.info('Initial admin user created successfully', 'InitialAdminSetup', {
        userId: result.user.id,
        email: result.user.email
      });

      setIsSuccess(true);
      
      // Wait a moment to show success message, then redirect to depot management
      setTimeout(() => {
        onAdminCreated();
        // Navigate to depot management to create yards
        navigate('/depot-management');
      }, 2000);

    } catch (error) {
      logger.error('Failed to create initial admin user', 'InitialAdminSetup', error);
      
      let errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Check for specific error types and provide helpful instructions
      if (errorMessage.includes('Insufficient privileges') || errorMessage.includes('row-level security policy')) {
        errorMessage = 'Database setup required. Please run the initial admin migration first.';
      } else if (errorMessage.includes('User already registered') || errorMessage.includes('already exists')) {
        errorMessage = 'This email is already registered. There may be an orphaned authentication account that needs cleanup.';
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2E2E2E] to-[#3A3A3A] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center animate-scale-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Setup Complete!</h1>
          <p className="text-gray-600 mb-6">
            Your admin account has been created successfully. You'll be redirected to create your first yard.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-700">
              <strong>Email:</strong> {formData.email}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs text-blue-700">
              <strong>Next Steps:</strong> You'll be redirected to Depot Management to create your first yard. 
              A yard is required to use the container management system.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2E2E2E] to-[#3A3A3A] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={IMAGE_PATHS.LOGO_MANTRA} alt="Logo" className="mx-auto mb-4 h-16" />
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Initial Setup</h1>
          <p className="text-gray-600">Create your first administrator account</p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">No administrators found</p>
              <p>Create the first admin account to access the system. This account will have full access to all modules.</p>
            </div>
          </div>
        </div>

        {/* Debug Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-2">🔍 Debug Information</p>
            <p className="mb-2">If you already have admin users and this screen shouldn't appear:</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  console.log('=== MANUAL ADMIN CHECK ===');
                  const hasAdmins = await userService.hasAdminUsers();
                  console.log('hasAdminUsers result:', hasAdmins);
                  alert(`Admin check result: ${hasAdmins ? 'Admins found' : 'No admins found'}`);
                  if (hasAdmins) {
                    onAdminCreated(); // This should hide the setup screen
                  }
                } catch (error) {
                  console.error('Manual admin check error:', error);
                  alert(`Error checking admins: ${error.message}`);
                }
              }}
              className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700 mr-2"
            >
              Check for Admins
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  console.log('=== DIRECT SUPABASE TEST ===');
                  // Import supabase directly
                  const { supabase } = await import('../../services/api/supabaseClient');
                  
                  // Test the exact query
                  const { data, error } = await supabase
                    .from('users')
                    .select('id, name, email, role, active, is_deleted')
                    .eq('role', 'admin')
                    .eq('active', true)
                    .eq('is_deleted', false);
                  
                  console.log('Direct Supabase query result:', { data, error });
                  
                  if (error) {
                    alert(`Direct query error: ${error.message}`);
                  } else {
                    alert(`Direct query found ${data?.length || 0} admin users`);
                  }
                } catch (error) {
                  console.error('Direct query error:', error);
                  alert(`Direct query failed: ${error.message}`);
                }
              }}
              className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 mr-2"
            >
              Direct Query Test
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700"
            >
              Refresh Page
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-700 font-medium">{errors.general}</p>
              </div>
              
              {/* Show migration instructions for RLS policy errors */}
              {errors.general.includes('Database setup required') && (
                <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                  <p className="text-xs text-red-800 font-medium mb-2">Required Migration:</p>
                  <p className="text-xs text-red-700 mb-2">
                    Run this migration in your Supabase SQL editor:
                  </p>
                  <div className="bg-red-900 text-red-100 p-2 rounded text-xs font-mono overflow-x-auto">
                    <pre>{`-- Run this in Supabase SQL Editor
CREATE OR REPLACE FUNCTION public.has_admin_users()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
DECLARE admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.users
  WHERE role = 'admin' AND active = true 
    AND (is_deleted = false OR is_deleted IS NULL);
  RETURN admin_count > 0;
END; $$;

GRANT EXECUTE ON FUNCTION public.has_admin_users() TO authenticated;

CREATE POLICY "Allow initial admin creation" ON public.users
FOR INSERT TO authenticated WITH CHECK (
  NOT public.has_admin_users() AND role = 'admin'
);`}</pre>
                  </div>
                  <p className="text-xs text-red-700 mt-2">
                    After running this migration, refresh the page and try again.
                  </p>
                </div>
              )}

              {/* Show cleanup instructions for orphaned auth users */}
              {errors.general.includes('orphaned authentication account') && (
                <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                  <p className="text-xs text-red-800 font-medium mb-2">Cleanup Required:</p>
                  <p className="text-xs text-red-700 mb-2">
                    There's an orphaned authentication account. Run this cleanup in Supabase SQL editor:
                  </p>
                  <div className="bg-red-900 text-red-100 p-2 rounded text-xs font-mono overflow-x-auto">
                    <pre>{`-- Check for orphaned auth users
SELECT au.email, au.id, u.id as db_user_id
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.auth_user_id
WHERE u.id IS NULL;

-- Clean up orphaned auth users (CAREFUL!)
DELETE FROM auth.users 
WHERE id IN (
  SELECT au.id FROM auth.users au
  LEFT JOIN public.users u ON au.id = u.auth_user_id
  WHERE u.id IS NULL
);`}</pre>
                  </div>
                  <p className="text-xs text-red-700 mt-2">
                    After cleanup, refresh the page and try again with the same or different email.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange('name')}
                className={`w-full border rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  errors.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
                disabled={isSubmitting}
                autoComplete="name"
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
            </div>
            {errors.name && (
              <p id="name-error" className="text-xs text-red-600 mt-1" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                className={`w-full border rounded-xl pl-12 pr-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
                disabled={isSubmitting}
                autoComplete="email"
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
            </div>
            {errors.email && (
              <p id="email-error" className="text-xs text-red-600 mt-1" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleInputChange('password')}
                className={`w-full border rounded-xl pl-12 pr-12 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="Create a strong password"
                disabled={isSubmitting}
                autoComplete="new-password"
                aria-describedby={errors.password ? 'password-error' : 'password-help'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="text-xs text-red-600 mt-1" role="alert">
                {errors.password}
              </p>
            )}
            <p id="password-help" className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                className={`w-full border rounded-xl pl-12 pr-12 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  errors.confirmPassword ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
                disabled={isSubmitting}
                autoComplete="new-password"
                aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="text-xs text-red-600 mt-1" role="alert">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Creating Admin Account...
              </>
            ) : (
              <>
                <Shield className="w-5 h-5 mr-2" />
                Create Admin Account
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            This account will have full administrative privileges
          </p>
        </div>
      </div>
    </div>
  );
};