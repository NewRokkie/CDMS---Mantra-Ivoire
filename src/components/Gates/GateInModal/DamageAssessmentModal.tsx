import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { DamageAssessment } from '../types';
import { FormModal } from '../../Common/Modal/FormModal';

export interface DamageAssessmentModalProps {
  isVisible: boolean;
  containerNumber: string;
  operatorName: string;
  onAssessmentComplete: (assessment: DamageAssessment) => void;
  onCancel: () => void;
}

const damageTypeOptions = [
  { value: 'structural', label: 'Structural Damage' },
  { value: 'surface', label: 'Surface Damage' },
  { value: 'door', label: 'Door Damage' },
  { value: 'corner', label: 'Corner Damage' },
  { value: 'seal', label: 'Seal Damage' },
  { value: 'other', label: 'Other' }
];

export const DamageAssessmentModal: React.FC<DamageAssessmentModalProps> = ({
  isVisible,
  containerNumber,
  operatorName,
  onAssessmentComplete,
  onCancel
}) => {
  const [hasDamage, setHasDamage] = useState<boolean>(false);
  const [damageType, setDamageType] = useState<string>('');
  const [damageDescription, setDamageDescription] = useState<string>('');

  const handleSubmit = async () => {
    const assessment: DamageAssessment = {
      hasDamage,
      damageType: hasDamage ? damageType : undefined,
      damageDescription: hasDamage ? damageDescription : undefined,
      assessmentStage: 'assignment',
      assessedBy: operatorName,
      assessedAt: new Date()
    };

    onAssessmentComplete(assessment);
  };

  const handleCancel = () => {
    setHasDamage(false);
    setDamageType('');
    setDamageDescription('');
    onCancel();
  };

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (hasDamage && !damageType) {
      errors.push('Damage type is required when damage is detected');
    }
    if (hasDamage && !damageDescription.trim()) {
      errors.push('Damage description is required when damage is detected');
    }
    return errors;
  };

  return (
    <FormModal
      isOpen={isVisible}
      onClose={handleCancel}
      onSubmit={handleSubmit}
      title="Damage Assessment"
      subtitle={`Container: ${containerNumber}`}
      icon={AlertTriangle}
      submitLabel="Complete Assessment"
      cancelLabel="Cancel"
      validationErrors={getValidationErrors()}
      size="md"
    >
      <div className="space-y-6">
        {/* Damage Status Question */}
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <h4 className="font-semibold text-orange-900 mb-3">Container Condition Assessment</h4>
          <p className="text-sm text-orange-700 mb-4">
            Please assess the container condition before completing the assignment.
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="damageStatus"
                value="no-damage"
                checked={!hasDamage}
                onChange={() => {
                  setHasDamage(false);
                  setDamageType('');
                  setDamageDescription('');
                }}
                className="form-radio text-green-600"
              />
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">No Damage</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="damageStatus"
                value="has-damage"
                checked={hasDamage}
                onChange={() => setHasDamage(true)}
                className="form-radio text-red-600"
              />
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-gray-900">Damage Detected</span>
              </div>
            </label>
          </div>
        </div>

        {/* Damage Details (shown only if damage is detected) */}
        {hasDamage && (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200 space-y-4">
            <h4 className="font-semibold text-red-900 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Damage Details
            </h4>

            {/* Damage Type */}
            <div>
              <label className="block text-sm font-medium text-red-800 mb-2">
                Damage Type *
              </label>
              <select
                value={damageType}
                onChange={(e) => setDamageType(e.target.value)}
                className="form-select w-full text-base py-3"
                required={hasDamage}
              >
                <option value="">Select damage type...</option>
                {damageTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Damage Description */}
            <div>
              <label className="block text-sm font-medium text-red-800 mb-2">
                Damage Description *
              </label>
              <textarea
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                rows={3}
                className="form-input w-full text-base py-3 resize-none"
                placeholder="Describe the damage in detail..."
                required={hasDamage}
              />
              <p className="text-xs text-red-600 mt-1">
                Please provide specific details about the location and extent of damage
              </p>
            </div>
          </div>
        )}

        {/* Assessment Info */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <p><strong>Assessed by:</strong> {operatorName}</p>
          <p><strong>Assessment stage:</strong> Assignment</p>
          <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </FormModal>
  );
};