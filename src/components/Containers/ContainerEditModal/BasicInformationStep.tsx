import React, { useState } from 'react';
import { Package, AlertTriangle } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Container Details
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Container Number *
            </label>
            <input
              type="text"
              required
              value={formData.number}
              onChange={(e) => handleContainerNumberChange(e.target.value)}
              className={`form-input w-full ${containerValidationError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
              placeholder="e.g., MSKU1234567"
              maxLength={11}
            />
            {containerValidationError && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                <span>{containerValidationError}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Container Type *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => updateFormData({ type: e.target.value as any })}
              className="form-input w-full"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Container Size *
            </label>
            <select
              required
              value={formData.size}
              onChange={(e) => updateFormData({ size: e.target.value as any })}
              className="form-input w-full"
            >
              <option value="20ft">20 Feet</option>
              <option value="40ft">40 Feet</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => updateFormData({ status: e.target.value as any })}
              className="form-input w-full"
            >
              <option value="gate_in">Gate In</option>
              <option value="in_depot">In Depot</option>
              <option value="gate_out">Gate Out</option>
              <option value="out_depot">Out Depot</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Package className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h5 className="text-sm font-medium text-blue-900 mb-1">Container Number Format</h5>
            <p className="text-xs text-blue-700">
              Container numbers follow the ISO 6346 standard: 4 uppercase letters (owner code) 
              followed by 7 digits (serial number and check digit).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
