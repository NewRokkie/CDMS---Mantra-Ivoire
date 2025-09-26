import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Grid3x3 as Grid3X3, Package, MapPin, Settings, AlertTriangle, CheckCircle, Ruler, Layers } from 'lucide-react';
import { Stack, StackFormData, StackValidation } from '../../types/stack';
import { Yard } from '../../types/yard';
import { stackService } from '../../services/stackService';

interface StackFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StackFormData) => void;
  selectedStack?: Stack | null;
  yard: Yard;
  isLoading?: boolean;
}

export const StackFormModal: React.FC<StackFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedStack,
  yard,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<StackFormData>({
    stackNumber: 1,
    sectionId: '',
    rows: 4,
    maxTiers: 5,
    positionX: 50,
    positionY: 50,
    positionZ: 0,
    width: 100,
    length: 60,
    containerSize: 'both',
    isSpecialStack: false,
    assignedClientCode: '',
    notes: ''
  });

  const [validation, setValidation] = useState<StackValidation>({
    isValid: true,
    errors: [],
    warnings: []
  });
  const [autoSaving, setAutoSaving] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (selectedStack) {
      setFormData({
        stackNumber: selectedStack.stackNumber,
        sectionId: selectedStack.sectionId,
        rows: selectedStack.rows,
        maxTiers: selectedStack.maxTiers,
        positionX: selectedStack.position.x,
        positionY: selectedStack.position.y,
        positionZ: selectedStack.position.z,
        width: selectedStack.dimensions.width,
        length: selectedStack.dimensions.length,
        containerSize: selectedStack.containerSize,
        isSpecialStack: selectedStack.isSpecialStack,
        assignedClientCode: selectedStack.assignedClientCode || '',
        notes: selectedStack.notes || ''
      });
    } else {
      // Reset for new stack
      const initializeNewStack = async () => {
        const nextNumber = await stackService.getNextStackNumber(yard.id);
        const optimalPosition = yard.sections.length > 0 
          ? await stackService.getOptimalPosition(yard.id, yard.sections[0].id)
          : { x: 50, y: 50, z: 0 };

        setFormData({
          stackNumber: nextNumber,
          sectionId: yard.sections.length > 0 ? yard.sections[0].id : '',
          rows: 4,
          maxTiers: 5,
          positionX: optimalPosition.x,
          positionY: optimalPosition.y,
          positionZ: optimalPosition.z,
          width: 100,
          length: 60,
          containerSize: 'both',
          isSpecialStack: false,
          assignedClientCode: '',
          notes: ''
        });
      };

      if (isOpen) {
        initializeNewStack();
      }
    }
  }, [selectedStack, yard, isOpen]);

  // Validate form data when it changes
  useEffect(() => {
    const validateForm = async () => {
      if (formData.stackNumber && formData.sectionId) {
        const result = await stackService.validateStackData(
          yard.id,
          formData,
          selectedStack?.id
        );
        setValidation(result);
      }
    };

    const debounceTimer = setTimeout(validateForm, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData, yard.id, selectedStack?.id]);

  const handleInputChange = (field: keyof StackFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validation.isValid) {
      alert(`Please fix the following errors:\n${validation.errors.join('\n')}`);
      return;
    }

    onSubmit(formData);
  };

  const calculateCapacity = () => {
    return formData.rows * formData.maxTiers;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <Grid3X3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedStack ? 'Edit Stack' : 'Create New Stack'}
                </h3>
                <p className="text-sm text-gray-600">
                  {yard.name} ({yard.code})
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <Grid3X3 className="h-5 w-5 mr-2" />
                Basic Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Stack Number *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="999"
                    value={formData.stackNumber}
                    onChange={(e) => handleInputChange('stackNumber', parseInt(e.target.value) || 1)}
                    className="form-input w-full"
                    placeholder="e.g., 1, 3, 5..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Section *
                  </label>
                  <select
                    required
                    value={formData.sectionId}
                    onChange={(e) => handleInputChange('sectionId', e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="">Select section</option>
                    {yard.sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Container Size Support *
                  </label>
                  <select
                    required
                    value={formData.containerSize}
                    onChange={(e) => handleInputChange('containerSize', e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="20ft">20ft Only</option>
                    <option value="40ft">40ft Only</option>
                    <option value="both">Both Sizes</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isSpecialStack}
                    onChange={(e) => handleInputChange('isSpecialStack', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-blue-800">Special Stack</span>
                  <span className="text-xs text-blue-600">(Limited to 20ft containers only)</span>
                </label>
              </div>
            </div>

            {/* Dimensions */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Stack Dimensions
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-2">
                      Rows (Width) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="10"
                      value={formData.rows}
                      onChange={(e) => handleInputChange('rows', parseInt(e.target.value) || 1)}
                      className="form-input w-full"
                      placeholder="4"
                    />
                    <p className="text-xs text-green-600 mt-1">Number of container rows (1-10)</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-2">
                      Max Tiers (Height) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="8"
                      value={formData.maxTiers}
                      onChange={(e) => handleInputChange('maxTiers', parseInt(e.target.value) || 1)}
                      className="form-input w-full"
                      placeholder="5"
                    />
                    <p className="text-xs text-green-600 mt-1">Maximum stacking height (1-8)</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-2">
                      Physical Width (meters) *
                    </label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="200"
                      value={formData.width}
                      onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 10)}
                      className="form-input w-full"
                      placeholder="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-green-800 mb-2">
                      Physical Length (meters) *
                    </label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="100"
                      value={formData.length}
                      onChange={(e) => handleInputChange('length', parseInt(e.target.value) || 10)}
                      className="form-input w-full"
                      placeholder="60"
                    />
                  </div>
                </div>
              </div>

              {/* Capacity Calculation */}
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">Calculated Capacity:</span>
                  <span className="text-lg font-bold text-green-900">
                    {calculateCapacity()} containers
                  </span>
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {formData.rows} rows × {formData.maxTiers} tiers = {calculateCapacity()} total positions
                </div>
              </div>
            </div>

            {/* Position */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Position Coordinates
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    X Position *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.positionX}
                    onChange={(e) => handleInputChange('positionX', parseInt(e.target.value) || 0)}
                    className="form-input w-full"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Y Position *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.positionY}
                    onChange={(e) => handleInputChange('positionY', parseInt(e.target.value) || 0)}
                    className="form-input w-full"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Z Position
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.positionZ}
                    onChange={(e) => handleInputChange('positionZ', parseInt(e.target.value) || 0)}
                    className="form-input w-full"
                    placeholder="0"
                  />
                  <p className="text-xs text-purple-600 mt-1">Ground level = 0</p>
                </div>
              </div>
            </div>

            {/* Additional Settings */}
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Additional Settings
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    Assigned Client Code
                  </label>
                  <input
                    type="text"
                    value={formData.assignedClientCode}
                    onChange={(e) => handleInputChange('assignedClientCode', e.target.value.toUpperCase())}
                    className="form-input w-full"
                    placeholder="e.g., MAEU, MSCU (optional)"
                    maxLength={10}
                  />
                  <p className="text-xs text-orange-600 mt-1">Leave empty for unassigned stack</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="form-input w-full resize-none"
                    placeholder="Additional notes about this stack..."
                  />
                </div>
              </div>
            </div>

            {/* Validation Results */}
            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div className="space-y-3">
                {validation.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-800">Validation Errors</span>
                    </div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-800">Warnings</span>
                    </div>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {validation.isValid ? (
                <span className="text-green-600 font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Ready to save
                </span>
              ) : (
                <span className="text-red-600 font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''} to fix
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading || !validation.isValid}
                className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>{selectedStack ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{selectedStack ? 'Update Stack' : 'Create Stack'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};