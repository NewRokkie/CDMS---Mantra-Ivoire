import React, { useState } from 'react';
import { AlertTriangle, Info, Container } from 'lucide-react';
import { ContainerFormData } from '../ContainerEditModal';

interface BasicInformationStepProps {
  formData: ContainerFormData;
  updateFormData: (updates: Partial<ContainerFormData>) => void;
}

export const BasicInformationStep: React.FC<BasicInformationStepProps> = ({
  formData,
  updateFormData
}) => {
  const [containerValidationError, setContainerValidationError] = useState('');

  const validateContainerNumber = (containerNumber: string): { isValid: boolean; message?: string } => {
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

    return { isValid: true };
  };

  const handleContainerNumberChange = (value: string) => {
    let cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (cleanValue.length <= 11) {
      const letters = cleanValue.substring(0, 4).replace(/[^A-Z]/g, '');
      const numbers = cleanValue.substring(4, 11).replace(/[^0-9]/g, '');
      const validValue = letters + numbers;

      updateFormData({ number: validValue });

      const validation = validateContainerNumber(validValue);
      setContainerValidationError(validation.isValid ? '' : validation.message || '');
    }
  };

  const getContainerTypeIcon = (type: string) => {
    switch (type) {
      case 'reefer':
        return '❄️';
      case 'tank':
        return '🛢️';
      case 'flat_rack':
        return '📦';
      case 'open_top':
        return '📤';
      default:
        return '📦';
    }
  };

  return (
    <div className="depot-step-spacing">
      {/* Main Form Section */}
      <div className="depot-section">
        <h4 className="depot-section-header">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3">
            <Container className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <span className="text-lg">Container Details</span>
            <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-0.5">
              Enter the basic container identification information
            </p>
          </div>
        </h4>

        <div className="depot-form-grid">
          {/* Container Number */}
          <div className="space-y-2">
            <label className="label flex items-center justify-between">
              <span>Container Number <span className="text-red-500">*</span></span>
              <span className="text-xs text-gray-400 font-normal">ISO 6346 Format</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.number}
                onChange={(e) => handleContainerNumberChange(e.target.value)}
                className={`depot-input font-mono text-lg tracking-wider ${containerValidationError ? 'border-red-400 focus:ring-red-500/30 focus:border-red-400' : ''}`}
                placeholder="MSKU1234567"
                maxLength={11}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <span className={`text-xs font-mono ${formData.number.length === 11 ? 'text-green-500' : 'text-gray-400'}`}>
                  {formData.number.length}/11
                </span>
              </div>
            </div>
            {containerValidationError && (
              <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{containerValidationError}</span>
              </div>
            )}
          </div>

          {/* Container Type */}
          <div className="space-y-2">
            <label className="label">
              Container Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={formData.type}
                onChange={(e) => updateFormData({ type: e.target.value as any })}
                className="depot-select w-full"
              >
                <option value="dry">Dry Container</option>
                <option value="high_cube">High-Cube Container</option>
                <option value="hard_top">Hard Top Container</option>
                <option value="ventilated">Ventilated Container</option>
                <option value="reefer">Reefer Container</option>
                <option value="tank">Tank Container</option>
                <option value="flat_rack">Flat Rack</option>
                <option value="open_top">Open Top</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xl">
                {getContainerTypeIcon(formData.type)}
              </div>
            </div>
          </div>

          {/* Container Size */}
          <div className="space-y-2">
            <label className="label">
              Container Size <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateFormData({ size: '20ft' })}
                className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                  formData.size === '20ft'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">🚛</span>
                <span className="font-medium text-sm">20 Feet</span>
              </button>
              <button
                type="button"
                onClick={() => updateFormData({ size: '40ft' })}
                className={`p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center space-y-1 ${
                  formData.size === '40ft'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-2xl">🚚</span>
                <span className="font-medium text-sm">40 Feet</span>
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="label">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => updateFormData({ status: e.target.value as any })}
              className="depot-select w-full"
            >
              <option value="gate_in">🚪 Gate In</option>
              <option value="in_depot">🏭 In Depot</option>
              <option value="gate_out">🚪 Gate Out</option>
              <option value="out_depot">📦 Out Depot</option>
              <option value="maintenance">🔧 Maintenance</option>
              <option value="cleaning">🧹 Cleaning</option>
            </select>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-5">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Container Number Format (ISO 6346)
            </h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Container numbers follow the international standard: 4 uppercase letters (owner code) 
              followed by 7 digits (serial number and check digit). Example: <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded">MSKU1234567</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
