import React, { useState } from 'react';
import { AlertTriangle, Plus, Trash2, Calendar, User } from 'lucide-react';
import { ContainerFormData } from '../ContainerEditModal';

interface DamageAssessmentStepProps {
  formData: ContainerFormData;
  updateFormData: (updates: Partial<ContainerFormData>) => void;
}

export const DamageAssessmentStep: React.FC<DamageAssessmentStepProps> = ({
  formData,
  updateFormData
}) => {
  const [newDamage, setNewDamage] = useState('');

  const handleAddDamage = () => {
    if (newDamage.trim()) {
      updateFormData({
        damage: [...formData.damage, newDamage.trim()],
        damageAssessment: {
          ...formData.damageAssessment,
          hasDamage: true
        }
      });
      setNewDamage('');
    }
  };

  const handleRemoveDamage = (index: number) => {
    const newDamageList = formData.damage.filter((_, i) => i !== index);
    updateFormData({
      damage: newDamageList,
      damageAssessment: {
        ...formData.damageAssessment,
        hasDamage: newDamageList.length > 0
      }
    });
  };

  const handleDamageToggle = (hasDamage: boolean) => {
    updateFormData({
      damageAssessment: {
        ...formData.damageAssessment,
        hasDamage,
        severity: hasDamage ? formData.damageAssessment?.severity : undefined
      },
      damage: hasDamage ? formData.damage : []
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <h4 className="font-semibold text-red-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Damage Assessment
        </h4>

        {/* Damage Status Toggle */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-red-800 mb-3">
            Does this container have any damage?
          </label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => handleDamageToggle(false)}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                !formData.damageAssessment?.hasDamage
                  ? 'border-green-500 bg-green-50 text-green-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">✅</div>
                <div className="font-medium">No Damage</div>
                <div className="text-xs mt-1">Container is in good condition</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleDamageToggle(true)}
              className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                formData.damageAssessment?.hasDamage
                  ? 'border-red-500 bg-red-50 text-red-900'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">⚠️</div>
                <div className="font-medium">Has Damage</div>
                <div className="text-xs mt-1">Container requires inspection</div>
              </div>
            </button>
          </div>
        </div>

        {/* Damage Details (shown only if has damage) */}
        {formData.damageAssessment?.hasDamage && (
          <>
            {/* Damage List */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-red-800 mb-2">
                Damage Descriptions *
              </label>
              
              {formData.damage.length > 0 && (
                <div className="space-y-2 mb-3">
                  {formData.damage.map((damage, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-200">
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                        <span className="text-sm text-gray-900">{damage}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDamage(index)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100 transition-colors"
                        title="Remove damage"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Damage */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newDamage}
                  onChange={(e) => setNewDamage(e.target.value)}
                  className="form-input flex-1"
                  placeholder="Describe the damage (e.g., Dent on left side panel)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddDamage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddDamage}
                  disabled={!newDamage.trim()}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>

              {formData.damage.length === 0 && (
                <div className="text-center py-4 text-gray-500 bg-white rounded-lg border border-red-200 mt-3">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No damage descriptions added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add at least one damage description</p>
                </div>
              )}
            </div>

            {/* Damage Severity */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-red-800 mb-2">
                Damage Severity
              </label>
              <select
                value={formData.damageAssessment?.severity || ''}
                onChange={(e) => updateFormData({
                  damageAssessment: {
                    ...formData.damageAssessment,
                    hasDamage: true,
                    severity: e.target.value as any
                  }
                })}
                className="form-input w-full"
              >
                <option value="">Select severity...</option>
                <option value="minor">Minor - Cosmetic damage only</option>
                <option value="moderate">Moderate - Functional impact</option>
                <option value="severe">Severe - Major structural damage</option>
              </select>
            </div>

            {/* Additional Assessment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-red-800 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Inspection Date
                </label>
                <input
                  type="date"
                  value={formData.damageAssessment?.inspectionDate ? 
                    new Date(formData.damageAssessment.inspectionDate).toISOString().split('T')[0] : 
                    new Date().toISOString().split('T')[0]
                  }
                  onChange={(e) => updateFormData({
                    damageAssessment: {
                      ...formData.damageAssessment,
                      hasDamage: true,
                      inspectionDate: new Date(e.target.value)
                    }
                  })}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-red-800 mb-2 flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  Inspector Name
                </label>
                <input
                  type="text"
                  value={formData.damageAssessment?.inspectorName || ''}
                  onChange={(e) => updateFormData({
                    damageAssessment: {
                      ...formData.damageAssessment,
                      hasDamage: true,
                      inspectorName: e.target.value
                    }
                  })}
                  className="form-input w-full"
                  placeholder="Enter inspector name"
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h5 className="text-sm font-medium text-red-900 mb-1">Damage Assessment Guidelines</h5>
            <p className="text-xs text-red-700">
              Document all visible damage to the container. Include specific locations, 
              types of damage, and severity. This information is critical for insurance claims 
              and maintenance scheduling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
