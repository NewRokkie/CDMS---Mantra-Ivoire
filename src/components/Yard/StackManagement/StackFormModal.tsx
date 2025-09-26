import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Package, MapPin, Grid3x3 as Grid3X3, Ruler, AlertTriangle, CheckCircle } from 'lucide-react';
import { YardStack, YardSection } from '../../../types/yard';
import { StackFormData, StackValidationResult } from '../../../services/stackService';
import { useAuth } from '../../../hooks/useAuth';

interface StackFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stackData: StackFormData) => void;
  selectedStack?: YardStack | null;
  sections: YardSection[];
  yardId: string;
  isLoading?: boolean;
  validation?: StackValidationResult;
}

export const StackFormModal: React.FC<StackFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedStack,
  sections,
  yardId,
  isLoading = false,
  validation
}) => {
  const { user } = useAuth();
  const [autoSaving, setAutoSaving] = useState(false);
  
  const [formData, setFormData] = useState<StackFormData>({
    stackNumber: 1,
    sectionId: '',
    rows: 4,
    maxTiers: 5,
    position: { x: 0, y: 0, z: 0 },
    dimensions: { width: 12, length: 6 },
    isOddStack: false
  });

  // Initialize form data
  useEffect(() => {
    if (selectedStack) {
      setFormData({
        stackNumber: selectedStack.stackNumber,
        sectionId: selectedStack.sectionId,
        rows: selectedStack.rows,
        maxTiers: selectedStack.maxTiers,
        position: selectedStack.position,
        dimensions: selectedStack.dimensions,
        isOddStack: selectedStack.isOddStack || false
      });
    } else {
      // Reset for new stack
      setFormData({
        stackNumber: 1,
        sectionId: sections.length > 0 ? sections[0].id : '',
        rows: 4,
        maxTiers: 5,
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 12, length: 6 },
        isOddStack: false
      });
    }
  }, [selectedStack, sections, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      // Handle nested fields like position.x
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof StackFormData] as any,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Recalculate capacity
    const updatedFormData = {
      ...formData,
      capacity: formData.rows * formData.maxTiers
    };
    
    onSubmit(updatedFormData);
  };

  const isFormValid = formData.stackNumber > 0 && 
                     formData.sectionId && 
                     formData.rows > 0 && 
                     formData.maxTiers > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedStack ? 'Edit Stack' : 'Create New Stack'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedStack ? `Modify stack ${selectedStack.stackNumber}` : 'Add a new stack to the yard'}
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

            {/* Validation Messages */}
            {validation && (
              <div className="space-y-3">
                {validation.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
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
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
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

            {/* Basic Stack Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Basic Stack Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="1"
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
                    <option value="">Select section...</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Number of Rows *
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
                  <p className="text-xs text-blue-600 mt-1">
                    Number of container rows (width of stack)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Maximum Tiers *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="6"
                    value={formData.maxTiers}
                    onChange={(e) => handleInputChange('maxTiers', parseInt(e.target.value) || 1)}
                    className="form-input w-full"
                    placeholder="5"
                  />
                  <p className="text-xs text-blue-600 mt-1">
                    Maximum stacking height (containers high)
                  </p>
                </div>
              </div>

              {/* Capacity Calculation */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">Calculated Capacity:</span>
                  <span className="font-bold text-blue-900">
                    {formData.rows} × {formData.maxTiers} = {formData.rows * formData.maxTiers} containers
                  </span>
                </div>
              </div>
            </div>

            {/* Position Information */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Position & Layout
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    X Position
                  </label>
                  <input
                    type="number"
                    value={formData.position.x}
                    onChange={(e) => handleInputChange('position.x', parseInt(e.target.value) || 0)}
                    className="form-input w-full"
                    placeholder="0"
                  />
                  <p className="text-xs text-green-600 mt-1">Horizontal position in yard</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    Y Position
                  </label>
                  <input
                    type="number"
                    value={formData.position.y}
                    onChange={(e) => handleInputChange('position.y', parseInt(e.target.value) || 0)}
                    className="form-input w-full"
                    placeholder="0"
                  />
                  <p className="text-xs text-green-600 mt-1">Vertical position in yard</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    Z Position
                  </label>
                  <input
                    type="number"
                    value={formData.position.z}
                    onChange={(e) => handleInputChange('position.z', parseInt(e.target.value) || 0)}
                    className="form-input w-full"
                    placeholder="0"
                  />
                  <p className="text-xs text-green-600 mt-1">Height level (usually 0)</p>
                </div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <Ruler className="h-5 w-5 mr-2" />
                Stack Dimensions
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Width (meters)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={formData.dimensions.width}
                    onChange={(e) => handleInputChange('dimensions.width', parseFloat(e.target.value) || 12)}
                    className="form-input w-full"
                    placeholder="12"
                  />
                  <p className="text-xs text-purple-600 mt-1">Physical width of the stack area</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Length (meters)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={formData.dimensions.length}
                    onChange={(e) => handleInputChange('dimensions.length', parseFloat(e.target.value) || 6)}
                    className="form-input w-full"
                    placeholder="6"
                  />
                  <p className="text-xs text-purple-600 mt-1">Physical length of the stack area</p>
                </div>
              </div>
            </div>

            {/* Stack Type */}
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                <Grid3X3 className="h-5 w-5 mr-2" />
                Stack Configuration
              </h4>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="isOddStack"
                    checked={formData.isOddStack}
                    onChange={(e) => handleInputChange('isOddStack', e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isOddStack" className="text-sm font-medium text-orange-800">
                    Odd-numbered stack (Tantarelli layout)
                  </label>
                </div>
                <p className="text-xs text-orange-600">
                  Check this for stacks that follow the Tantarelli odd-numbering system
                </p>
              </div>
            </div>

            {/* Stack Preview */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Stack Preview</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Stack Number:</span>
                  <div className="font-medium text-gray-900">S{formData.stackNumber.toString().padStart(2, '0')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Section:</span>
                  <div className="font-medium text-gray-900">
                    {sections.find(s => s.id === formData.sectionId)?.name || 'Not selected'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Capacity:</span>
                  <div className="font-medium text-gray-900">{formData.rows * formData.maxTiers} containers</div>
                </div>
                <div>
                  <span className="text-gray-600">Layout:</span>
                  <div className="font-medium text-gray-900">{formData.rows}R × {formData.maxTiers}T</div>
                </div>
                <div>
                  <span className="text-gray-600">Position:</span>
                  <div className="font-medium text-gray-900">
                    ({formData.position.x}, {formData.position.y})
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Size:</span>
                  <div className="font-medium text-gray-900">
                    {formData.dimensions.width}m × {formData.dimensions.length}m
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <div className="font-medium text-gray-900">
                    {formData.isOddStack ? 'Odd Stack' : 'Standard Stack'}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isFormValid ? (
                <span className="text-green-600 font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Ready to {selectedStack ? 'update' : 'create'} stack
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Please fill in all required fields
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
                disabled={isLoading || !isFormValid}
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