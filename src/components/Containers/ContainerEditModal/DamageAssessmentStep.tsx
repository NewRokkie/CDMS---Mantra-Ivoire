import React, { useState } from 'react';
import { AlertTriangle, Plus, Trash2, Calendar, User, Shield, CheckCircle2 } from 'lucide-react';
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

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'minor': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'severe': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityLabel = (severity?: string) => {
    switch (severity) {
      case 'minor': return 'Minor Damage';
      case 'moderate': return 'Moderate Damage';
      case 'severe': return 'Severe Damage';
      default: return 'Not Specified';
    }
  };

  return (
    <div className="depot-step-spacing">
      {/* Main Assessment Section */}
      <div className="depot-section">
        <h4 className="depot-section-header">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3">
            <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <span className="text-lg">Damage Assessment</span>
            <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-0.5">
              Record any damage to the container
            </p>
          </div>
        </h4>

        {/* Damage Status Toggle */}
        <div className="mb-6">
          <label className="label mb-4">Container Condition</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleDamageToggle(false)}
              className={`p-5 rounded-xl border-2 transition-all duration-300 flex flex-col items-center space-y-3 ${
                !formData.damageAssessment?.hasDamage
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-900 dark:text-green-100 shadow-lg shadow-green-500/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${
                !formData.damageAssessment?.hasDamage ? 'bg-green-100 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                ✅
              </div>
              <div className="text-center">
                <div className="font-semibold text-base">No Damage</div>
                <div className="text-xs mt-1 opacity-75">Container in good condition</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleDamageToggle(true)}
              className={`p-5 rounded-xl border-2 transition-all duration-300 flex flex-col items-center space-y-3 ${
                formData.damageAssessment?.hasDamage
                  ? 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 text-red-900 dark:text-red-100 shadow-lg shadow-red-500/10'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${
                formData.damageAssessment?.hasDamage ? 'bg-red-100 dark:bg-red-800' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                ⚠️
              </div>
              <div className="text-center">
                <div className="font-semibold text-base">Has Damage</div>
                <div className="text-xs mt-1 opacity-75">Requires inspection</div>
              </div>
            </button>
          </div>
        </div>

        {/* Damage Details Section */}
        {formData.damageAssessment?.hasDamage && (
          <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            {/* Damage List */}
            <div>
              <label className="label flex items-center justify-between">
                <span>Damage Descriptions <span className="text-red-500">*</span></span>
                <span className="text-xs text-gray-400 font-normal">{formData.damage.length} recorded</span>
              </label>

              {formData.damage.length > 0 && (
                <div className="space-y-2 mb-4">
                  {formData.damage.map((damage, index) => (
                    <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm group hover:shadow-md transition-all">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{damage}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDamage(index)}
                        className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Remove damage"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Damage */}
              <div className="flex items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newDamage}
                    onChange={(e) => setNewDamage(e.target.value)}
                    className="depot-input w-full pr-4"
                    placeholder="Describe the damage (e.g., Dent on left side panel)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDamage();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddDamage}
                  disabled={!newDamage.trim()}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center space-x-2 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>

              {formData.damage.length === 0 && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 mt-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No damage descriptions added yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add at least one damage description to continue</p>
                </div>
              )}
            </div>

            {/* Damage Severity & Assessment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Damage Severity */}
              <div className="space-y-2">
                <label className="label">Damage Severity</label>
                <select
                  value={formData.damageAssessment?.severity || ''}
                  onChange={(e) => updateFormData({
                    damageAssessment: {
                      ...formData.damageAssessment,
                      hasDamage: true,
                      severity: e.target.value as any
                    }
                  })}
                  className="depot-select w-full"
                >
                  <option value="">Select severity...</option>
                  <option value="minor">🟡 Minor - Cosmetic damage only</option>
                  <option value="moderate">🟠 Moderate - Functional impact</option>
                  <option value="severe">🔴 Severe - Major structural damage</option>
                </select>
                {formData.damageAssessment?.severity && (
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(formData.damageAssessment.severity)}`}>
                    {getSeverityLabel(formData.damageAssessment.severity)}
                  </div>
                )}
              </div>

              {/* Inspection Date */}
              <div className="space-y-2">
                <label className="label flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
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
                  className="depot-input w-full"
                />
              </div>

              {/* Inspector Name */}
              <div className="space-y-2 md:col-span-2">
                <label className="label flex items-center">
                  <User className="h-4 w-4 mr-2" />
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
                  className="depot-input w-full"
                  placeholder="Enter inspector name"
                />
              </div>
            </div>
          </div>
        )}

        {/* No Damage Confirmation */}
        {!formData.damageAssessment?.hasDamage && (
          <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h5 className="font-semibold text-green-900 dark:text-green-100">Container Verified</h5>
                <p className="text-sm text-green-700 dark:text-green-300">
                  This container has been marked as having no damage. No further action required.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guidelines Card */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-5">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Damage Assessment Guidelines</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
