import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Package, Grid3x3 as Grid3X3, AlertTriangle, Shield, Settings } from 'lucide-react';
import { Yard } from '../../../types';
import { yardService } from '../../../services/yardService';

interface StackConfiguration {
  stackId: string;
  stackNumber: number;
  sectionId: string;
  sectionName: string;
  containerSize: '20feet' | '40feet';
  isSpecialStack: boolean;
  lastModified: Date;
  modifiedBy: string;
}

interface StackFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  selectedStack?: StackConfiguration | null;
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
  const [formData, setFormData] = useState({
    stackNumber: 0,
    sectionId: '',
    containerSize: '20ft' as '20ft' | '40ft',
    stackType: 'regular' as 'regular' | 'special',
    rows: 4,
    maxTiers: 5,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoSaving, setAutoSaving] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (selectedStack) {
      // Find the actual stack from yard data
      const section = yard.sections.find(s => s.id === selectedStack.sectionId);
      const stack = section?.stacks.find(s => s.id === selectedStack.stackId);
      
      if (stack) {
        setFormData({
          stackNumber: stack.stackNumber,
          sectionId: stack.sectionId,
          containerSize: '20ft', // Default, could be determined from existing config
          stackType: [1, 31, 101, 103].includes(stack.stackNumber) ? 'special' : 'regular',
          rows: stack.rows,
          maxTiers: stack.maxTiers,
        });
      }
    } else {
      // Reset for new stack
      const firstSection = yard.sections[0];
      const suggestedNumber = firstSection ? yardService.getNextStackNumber(yard.id, firstSection.id) : 1;
      
      setFormData({
        stackNumber: suggestedNumber,
        sectionId: firstSection?.id || '',
        containerSize: '20ft',
        stackType: 'regular',
        rows: 4,
        maxTiers: 5,
      });
    }
    setErrors({});
  }, [selectedStack, yard, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.stackNumber <= 0) {
      newErrors.stackNumber = 'Stack number must be greater than 0';
    }

    if (!formData.sectionId) {
      newErrors.sectionId = 'Section is required';
    }

    if (formData.rows <= 0 || formData.rows > 10) {
      newErrors.rows = 'Rows must be between 1 and 10';
    }

    if (formData.maxTiers <= 0 || formData.maxTiers > 8) {
      newErrors.maxTiers = 'Max tiers must be between 1 and 8';
    }

    if (formData.dimensions.width <= 0) {
      newErrors.width = 'Width must be greater than 0';
    }

    if (formData.dimensions.length <= 0) {
      newErrors.length = 'Length must be greater than 0';
    }

    // Auto-adjust rows and tiers based on container size
    if (formData.containerSize === '40ft') {
      // 40ft containers typically need more space
      if (formData.rows < 4) {
        setFormData(prev => ({ ...prev, rows: 4 }));
      }
    }

    // Special stacks can only be 20ft
    if (formData.stackType === 'special' && formData.containerSize === '40ft') {
      newErrors.containerSize = 'Special stacks can only accommodate 20ft containers';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-adjust settings based on container size
    if (field === 'containerSize') {
      if (value === '40ft') {
        setFormData(prev => ({
          ...prev,
          containerSize: value,
          rows: Math.max(prev.rows, 4), // Ensure minimum 4 rows for 40ft
          stackType: 'regular' // Force regular for 40ft
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          containerSize: value
        }));
      }
    }

    // Auto-adjust container size based on stack type
    if (field === 'stackType') {
      if (value === 'special') {
        setFormData(prev => ({
          ...prev,
          stackType: value,
          containerSize: '20ft' // Force 20ft for special stacks
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          stackType: value
        }));
      }
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  const calculateCapacity = () => {
    return formData.rows * formData.maxTiers;
  };

  const getContainerSizeDescription = (size: '20ft' | '40ft') => {
    return size === '20ft' 
      ? 'Standard containers, single slot per container'
      : 'High capacity containers, requires paired stacks';
  };

  const getStackTypeDescription = (type: 'regular' | 'special') => {
    return type === 'regular'
      ? 'Can accommodate both 20ft and 40ft containers'
      : 'Limited to 20ft containers only, used for special operations';
  };

  const getLayoutSuggestions = () => {
    if (yard?.layout === 'tantarelli') {
      return {
        stackNumbers: 'Odd numbers only (1, 3, 5, 7, etc.)',
        dimensions: '20ft: 12m × 6m, 40ft: 24m × 6m',
        positioning: 'Follow existing section patterns'
      };
    }
    return {
      stackNumbers: 'Sequential numbers (1, 2, 3, 4, etc.)',
      dimensions: 'Standard: 12m × 6m',
      positioning: 'Grid-based layout'
    };
  };

  const suggestions = getLayoutSuggestions();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-600 text-white rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedStack ? 'Edit Stack' : 'Create New Stack'}
                </h3>
                <p className="text-sm text-gray-600">
                  {yard.name} ({yard.code}) - {yard.layout} layout
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

            {/* Layout Guidelines */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <Grid3X3 className="h-5 w-5 mr-2" />
                {yard.layout === 'tantarelli' ? 'Tantarelli' : 'Standard'} Layout Guidelines
              </h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div><strong>Stack Numbers:</strong> {suggestions.stackNumbers}</div>
                <div><strong>Dimensions:</strong> {suggestions.dimensions}</div>
                <div><strong>Positioning:</strong> {suggestions.positioning}</div>
              </div>
            </div>

            {/* Basic Stack Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Stack Information
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
                    value={formData.stackNumber || ''}
                    onChange={(e) => handleInputChange('stackNumber', parseInt(e.target.value) || 0)}
                    className={`form-input w-full ${errors.stackNumber ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="Enter stack number"
                    disabled={!!selectedStack} // Don't allow changing stack number when editing
                  />
                  {errors.stackNumber && <p className="mt-1 text-sm text-red-600">{errors.stackNumber}</p>}
                  {yard.layout === 'tantarelli' && !selectedStack && (
                    <p className="mt-1 text-xs text-blue-600">
                      Suggested: {yardService.getNextStackNumber(yard.id, formData.sectionId)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Section *
                  </label>
                  <select
                    required
                    value={formData.sectionId}
                    onChange={(e) => {
                      handleInputChange('sectionId', e.target.value);
                      // Update suggested stack number when section changes
                      if (!selectedStack && e.target.value) {
                        const suggested = yardService.getNextStackNumber(yard.id, e.target.value);
                        handleInputChange('stackNumber', suggested);
                      }
                    }}
                    className={`form-input w-full ${errors.sectionId ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    disabled={!!selectedStack} // Don't allow changing section when editing
                  >
                    <option value="">Select section</option>
                    {yard.sections.map(section => (
                      <option key={section.id} value={section.id}>
                        {section.name} ({section.stacks.length} stacks)
                      </option>
                    ))}
                  </select>
                  {errors.sectionId && <p className="mt-1 text-sm text-red-600">{errors.sectionId}</p>}
                </div>
              </div>
            </div>

            {/* Container Size Selection */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Container Size Configuration
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-3">
                    Container Size *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleInputChange('containerSize', '20ft')}
                      className={`p-6 border-2 rounded-xl transition-all duration-300 ${
                        formData.containerSize === '20ft'
                          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">📦</div>
                        <div className="font-bold text-lg text-gray-900">20ft</div>
                        <div className="text-sm text-gray-600 mt-1">Standard Size</div>
                        <div className="text-xs text-gray-500 mt-2">
                          {getContainerSizeDescription('20ft')}
                        </div>
                      </div>
                      {formData.containerSize === '20ft' && (
                        <div className="mt-3 flex justify-center">
                          <div className="bg-blue-500 text-white rounded-full p-1">
                            <Package className="h-3 w-3" />
                          </div>
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInputChange('containerSize', '40ft')}
                      disabled={formData.stackType === 'special'}
                      className={`p-6 border-2 rounded-xl transition-all duration-300 ${
                        formData.containerSize === '40ft'
                          ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-500/20'
                          : formData.stackType === 'special'
                          ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                          : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">📦📦</div>
                        <div className="font-bold text-lg text-gray-900">40ft</div>
                        <div className="text-sm text-gray-600 mt-1">High Capacity</div>
                        <div className="text-xs text-gray-500 mt-2">
                          {getContainerSizeDescription('40ft')}
                        </div>
                      </div>
                      {formData.containerSize === '40ft' && (
                        <div className="mt-3 flex justify-center">
                          <div className="bg-orange-500 text-white rounded-full p-1">
                            <Package className="h-3 w-3" />
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                  {formData.stackType === 'special' && (
                    <p className="mt-2 text-xs text-purple-600">
                      Special stacks are limited to 20ft containers only
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stack Type Selection */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Stack Type Configuration
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-3">
                    Stack Type *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleInputChange('stackType', 'regular')}
                      className={`p-6 border-2 rounded-xl transition-all duration-300 ${
                        formData.stackType === 'regular'
                          ? 'border-green-500 bg-green-50 shadow-lg shadow-green-500/20'
                          : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">⚙️</div>
                        <div className="font-bold text-lg text-gray-900">Regular</div>
                        <div className="text-sm text-gray-600 mt-1">Standard Operations</div>
                        <div className="text-xs text-gray-500 mt-2">
                          {getStackTypeDescription('regular')}
                        </div>
                      </div>
                      {formData.stackType === 'regular' && (
                        <div className="mt-3 flex justify-center">
                          <div className="bg-green-500 text-white rounded-full p-1">
                            <Settings className="h-3 w-3" />
                          </div>
                        </div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInputChange('stackType', 'special')}
                      className={`p-6 border-2 rounded-xl transition-all duration-300 ${
                        formData.stackType === 'special'
                          ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">🛡️</div>
                        <div className="font-bold text-lg text-gray-900">Special</div>
                        <div className="text-sm text-gray-600 mt-1">Limited Operations</div>
                        <div className="text-xs text-gray-500 mt-2">
                          {getStackTypeDescription('special')}
                        </div>
                      </div>
                      {formData.stackType === 'special' && (
                        <div className="mt-3 flex justify-center">
                          <div className="bg-purple-500 text-white rounded-full p-1">
                            <Shield className="h-3 w-3" />
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity Configuration */}
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                <Grid3X3 className="h-5 w-5 mr-2" />
                Capacity Configuration
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    Rows *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={formData.rows}
                    onChange={(e) => handleInputChange('rows', parseInt(e.target.value) || 1)}
                    className={`form-input w-full ${errors.rows ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="4"
                  />
                  {errors.rows && <p className="mt-1 text-sm text-red-600">{errors.rows}</p>}
                  <p className="mt-1 text-xs text-orange-600">Number of container rows (depth)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">
                    Max Tiers *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="8"
                    value={formData.maxTiers}
                    onChange={(e) => handleInputChange('maxTiers', parseInt(e.target.value) || 1)}
                    className={`form-input w-full ${errors.maxTiers ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="5"
                  />
                  {errors.maxTiers && <p className="mt-1 text-sm text-red-600">{errors.maxTiers}</p>}
                  <p className="mt-1 text-xs text-orange-600">Maximum stacking height</p>
                </div>
              </div>

              {/* Capacity Display */}
              <div className="mt-4 p-4 bg-white rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-800">Total Capacity:</span>
                  <span className="text-lg font-bold text-orange-900">
                    {calculateCapacity()} containers
                  </span>
                </div>
                <div className="text-xs text-orange-600 mt-1">
                  {formData.rows} rows × {formData.maxTiers} tiers = {calculateCapacity()} container positions
                </div>
              </div>
            </div>

            {/* Stack Preview */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4">Stack Preview</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Stack Number:</span>
                  <div className="font-medium text-gray-900">S{formData.stackNumber.toString().padStart(2, '0')}</div>
                </div>
                <div>
                  <span className="text-gray-600">Section:</span>
                  <div className="font-medium text-gray-900">
                    {yard.sections.find(s => s.id === formData.sectionId)?.name || 'Not selected'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Capacity:</span>
                  <div className="font-medium text-gray-900">{calculateCapacity()} containers</div>
                </div>
                <div>
                  <span className="text-gray-600">Container Size:</span>
                  <div className="font-medium text-gray-900">{formData.containerSize}</div>
                </div>
                <div>
                  <span className="text-gray-600">Type:</span>
                  <div className="font-medium text-gray-900">
                    {formData.stackType === 'special' ? 'Special' : 'Regular'}
                  </div>
                </div>
              </div>

              {/* Configuration Warnings */}
              {formData.stackType === 'special' && (
                <div className="mt-4 flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Special Stack:</strong> This stack will be limited to 20ft containers only and cannot accommodate 40ft containers.
                  </div>
                </div>
              )}
              
              {formData.containerSize === '40ft' && formData.stackType === 'regular' && (
                <div className="mt-4 flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>40ft Configuration:</strong> This stack will be configured for high-capacity 40ft containers and may require pairing with adjacent stacks.
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end space-x-3">
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
              disabled={isLoading || Object.keys(errors).length > 0}
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
  );
};