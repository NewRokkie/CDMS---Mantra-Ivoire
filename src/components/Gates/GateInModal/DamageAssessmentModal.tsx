import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, FileText, Shield } from 'lucide-react';
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
  { value: 'structural', label: 'Dommage Structurel' },
  { value: 'surface', label: 'Dommage de Surface' },
  { value: 'door', label: 'Dommage de Porte' },
  { value: 'corner', label: 'Dommage de Coin' },
  { value: 'seal', label: 'Dommage de Joint' },
  { value: 'roof', label: 'Dommage de Toit' },
  { value: 'floor', label: 'Dommage de Plancher' },
  { value: 'other', label: 'Autre' }
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

        {/* Buffer Zone Notice (shown only if damage is detected) */}
        {hasDamage && (
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-5 w-5 text-orange-600" />
              <h4 className="font-semibold text-orange-900">Zone Tampon Automatique</h4>
            </div>
            <p className="text-sm text-orange-700">
              ⚠️ <strong>Attention :</strong> Ce conteneur sera automatiquement assigné à une <strong>zone tampon</strong> 
              car il présente des dommages. Les zones tampons sont des emplacements virtuels temporaires 
              qui n'existent pas physiquement dans le dépôt et ne font pas partie des stacks virtuels créés 
              par la fusion de stacks physiques.
            </p>
          </div>
        )}

        {/* Damage Details (shown only if damage is detected) */}
        {hasDamage && (
          <div className="bg-red-50 rounded-xl p-4 border border-red-200 space-y-4">
            <h4 className="font-semibold text-red-900 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Détails des Dommages
            </h4>

            {/* Damage Type */}
            <div>
              <label className="block text-sm font-medium text-red-800 mb-2">
                Type de Dommage *
              </label>
              <select
                value={damageType}
                onChange={(e) => setDamageType(e.target.value)}
                className="form-select w-full text-base py-3"
                required={hasDamage}
              >
                <option value="">Sélectionner le type de dommage...</option>
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
                Description des Dommages *
              </label>
              <textarea
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                rows={3}
                className="form-input w-full text-base py-3 resize-none"
                placeholder="Décrivez les dommages en détail..."
                required={hasDamage}
              />
              <p className="text-xs text-red-600 mt-1">
                Veuillez fournir des détails précis sur l'emplacement et l'étendue des dommages
              </p>
            </div>
          </div>
        )}

        {/* Assessment Info */}
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
          <p><strong>Évalué par :</strong> {operatorName}</p>
          <p><strong>Étape d'évaluation :</strong> Assignation</p>
          <p><strong>Date :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
          {hasDamage && (
            <p className="text-orange-600 font-medium mt-2">
              <Shield className="h-4 w-4 inline mr-1" />
              Assignation automatique en zone tampon
            </p>
          )}
        </div>
      </div>
    </FormModal>
  );
};