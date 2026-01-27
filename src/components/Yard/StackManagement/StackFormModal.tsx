import React, { useState, useEffect } from 'react';
import { Package, Grid3x3 as Grid3X3, AlertTriangle, Shield, Settings } from 'lucide-react';
import { Yard, YardStack } from '../../../types';
import { yardsService } from '../../../services/api/yardsService';
import { FormModal } from '../../Common/Modal/FormModal';
import { handleError } from '../../../services/errorHandling';

interface StackFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  selectedStack?: YardStack | null;
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
    useCustomRowTiers: false,
    rowTierConfig: [] as Array<{ row: number; maxTiers: number }>
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [rowValidationWarning, setRowValidationWarning] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (selectedStack) {
      // Load existing stack data
      const containerSize = selectedStack.containerSize === '40ft' ? '40ft' : '20ft';
      const stackType = selectedStack.isSpecialStack ? 'special' : 'regular';

      const hasCustomRowTiers = !!(selectedStack.rowTierConfig && selectedStack.rowTierConfig.length > 0);
      
      setFormData({
        stackNumber: selectedStack.stackNumber,
        sectionId: selectedStack.sectionId || '',
        containerSize,
        stackType,
        rows: selectedStack.rows,
        maxTiers: selectedStack.maxTiers,
        useCustomRowTiers: hasCustomRowTiers,
        rowTierConfig: hasCustomRowTiers && selectedStack.rowTierConfig ? selectedStack.rowTierConfig : []
      });
    } else if (yard?.sections && yard.sections.length > 0) {
      // Reset for new stack
      const firstSection = yard.sections[0];

      let suggestedNumber = 1;
      try {
        if (firstSection && yard.id) {
          suggestedNumber = yardsService.getNextStackNumber(yard.id, firstSection.id);
        }
      } catch (error) {
        handleError(error, 'StackFormModal.getNextStackNumber');
        suggestedNumber = 1;
      }

      setFormData({
        stackNumber: suggestedNumber,
        sectionId: firstSection?.id || '',
        containerSize: '20ft',
        stackType: 'regular',
        rows: 4,
        maxTiers: 5,
        useCustomRowTiers: false,
        rowTierConfig: []
      });
    } else {
      // Provide default values even if no sections are available
      setFormData({
        stackNumber: 1,
        sectionId: '',
        containerSize: '20ft',
        stackType: 'regular',
        rows: 4,
        maxTiers: 5,
        useCustomRowTiers: false,
        rowTierConfig: []
      });
    }
    setErrors({});
  }, [selectedStack, yard, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const newValidationErrors: string[] = [];

    // Skip validation if form is not yet initialized (stackNumber is 0 and no selectedStack)
    if (formData.stackNumber === 0 && !selectedStack) {
      setErrors({});
      setValidationErrors([]);
      return true;
    }

    if (formData.stackNumber <= 0) {
      newErrors.stackNumber = 'Stack number must be greater than 0';
      newValidationErrors.push('Stack number must be greater than 0');
    }

    if (!formData.sectionId) {
      newErrors.sectionId = 'Section is required';
      newValidationErrors.push('Section is required');
    }

    if (formData.rows <= 0 || formData.rows > 10) {
      newErrors.rows = 'Rows must be between 1 and 10';
      newValidationErrors.push('Rows must be between 1 and 10');
    }

    if (formData.maxTiers <= 0 || formData.maxTiers > 5) {
      newErrors.maxTiers = 'Max tiers must be between 1 and 8';
      newValidationErrors.push('Max tiers must be between 1 and 8');
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
      newValidationErrors.push('Special stacks can only accommodate 20ft containers');
    }

    setErrors(newErrors);
    setValidationErrors(newValidationErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = async (field: string, value: any, triggerAutoSave?: () => void) => {
    // Validate row reduction if editing existing stack
    if (field === 'rows' && selectedStack && value < formData.rows) {
      try {
        const { supabase } = await import('../../../services/api/supabaseClient');
        const { data, error } = await supabase.rpc('validate_row_config_change', {
          p_stack_id: selectedStack.id,
          p_new_rows: value
        });

        if (error) throw error;

        if (data && data.length > 0) {
          const validation = data[0];
          if (!validation.can_change) {
            setRowValidationWarning(validation.reason);
            // Don't update the value
            return;
          }
        }
        setRowValidationWarning(null);
      } catch (error) {
        console.error('Row validation error:', error);
        setRowValidationWarning('Unable to validate row change. Please try again.');
        return;
      }
    }

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

    // Trigger auto-save if function is provided
    if (triggerAutoSave) {
      triggerAutoSave();
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      throw new Error('Form validation failed');
    }

    // Transform form data to match YardStack type
    const stackData: Partial<YardStack> = {
      stackNumber: formData.stackNumber,
      sectionId: formData.sectionId,
      containerSize: formData.containerSize === '40ft' ? '40ft' : '20ft',
      isSpecialStack: formData.stackType === 'special',
      rows: formData.rows,
      maxTiers: formData.maxTiers,
      rowTierConfig: formData.useCustomRowTiers ? formData.rowTierConfig : undefined,
      capacity: calculateCapacity(),
      isActive: true,
    };

    onSubmit(stackData);
  };

  const calculateCapacity = () => {
    if (formData.useCustomRowTiers && formData.rowTierConfig.length > 0) {
      // Calculate from custom row-tier config
      return formData.rowTierConfig.reduce((sum, config) => sum + config.maxTiers, 0);
    }
    return formData.rows * formData.maxTiers;
  };

  const generateDefaultRowTierConfig = () => {
    const config = [];
    for (let i = 1; i <= formData.rows; i++) {
      config.push({ row: i, maxTiers: formData.maxTiers });
    }
    return config;
  };

  const updateRowTierConfig = (row: number, maxTiers: number) => {
    const newConfig = [...formData.rowTierConfig];
    const existingIndex = newConfig.findIndex(c => c.row === row);
    
    if (existingIndex >= 0) {
      newConfig[existingIndex] = { row, maxTiers };
    } else {
      newConfig.push({ row, maxTiers });
      newConfig.sort((a, b) => a.row - b.row);
    }
    
    setFormData(prev => ({ ...prev, rowTierConfig: newConfig }));
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
      dimensions: 'Yirima: 12m × 6m',
      positioning: 'Grid-based layout'
    };
  };

  // Validate form on data changes (skip initial validation when form is being initialized)
  useEffect(() => {
    // Only validate if we have a valid stack number (form has been initialized)
    if (formData.stackNumber > 0) {
      validateForm();
    }
  }, [formData]);

  const suggestions = getLayoutSuggestions();

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={selectedStack ? 'Edit Stack' : 'Create New Stack'}
      subtitle={`${yard?.name || 'Yard'} ${yard?.code ? `(${yard.code})` : ''} ${yard?.layout ? `- ${yard.layout} layout` : ''}`}
      icon={Package}
      size="lg"
      submitLabel={selectedStack ? 'Update Stack' : 'Create Stack'}
      isSubmitting={isLoading}
      validationErrors={validationErrors}
      autoSave={true}
    >
      <div className="depot-step-spacing">
        {/* Layout Guidelines */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
          <h4 className="depot-section-header">
            <Grid3X3 className="depot-section-icon text-blue-500" />
            {yard?.layout === 'tantarelli' ? 'Tantarelli' : 'Yirima'} Layout Guidelines
          </h4>
          <div className="text-sm text-blue-800 space-y-1">
            <div><strong>Stack Numbers:</strong> {suggestions.stackNumbers}</div>
            <div><strong>Dimensions:</strong> {suggestions.dimensions}</div>
            <div><strong>Positioning:</strong> {suggestions.positioning}</div>
          </div>
        </div>

        {/* Basic Stack Information */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Package className="depot-section-icon text-blue-500" />
            Stack Information
          </h4>

          <div className="depot-form-grid">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stack Number *
              </label>
              <input
                type="number"
                required
                min="1"
                max="999"
                value={formData.stackNumber || ''}
                onChange={(e) => handleInputChange('stackNumber', parseInt(e.target.value) || 0)}
                className={`depot-input ${errors.stackNumber ? 'error' : ''}`}
                placeholder="Enter stack number"
                disabled={!!selectedStack} // Don't allow changing stack number when editing
              />
              {errors.stackNumber && <p className="mt-1 text-sm text-red-600">{errors.stackNumber}</p>}
              {yard?.layout === 'tantarelli' && !selectedStack && (
                <p className="mt-1 text-xs text-blue-600">
                  Suggested: {yard?.id && formData.sectionId ? yardsService.getNextStackNumber(yard.id, formData.sectionId) : 'N/A'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section *
              </label>
              {selectedStack ? (
                <div className="form-input w-full bg-gray-100 text-gray-700 cursor-not-allowed">
                  {yard?.sections?.find(s => s.id === formData.sectionId)?.name || 'Not selected'}
                </div>
              ) : (
                <select
                  required
                  value={formData.sectionId}
                  onChange={(e) => {
                    handleInputChange('sectionId', e.target.value);
                    // Update suggested stack number when section changes
                    if (e.target.value && yard?.id) {
                      try {
                        const suggested = yardsService.getNextStackNumber(yard.id, e.target.value);
                        handleInputChange('stackNumber', suggested);
                      } catch (error) {
                        handleError(error, 'StackFormModal.updateStackNumber');
                      }
                    }
                  }}
                  className={`depot-select ${errors.sectionId ? 'error' : ''}`}
                >
                  <option value="">Select section</option>
                  {yard?.sections?.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.stacks.length} stacks)
                    </option>
                  )) || (
                    <option value="" disabled>No sections available</option>
                  )}
                </select>
              )}
              {errors.sectionId && <p className="mt-1 text-sm text-red-600">{errors.sectionId}</p>}
              {selectedStack && (
                <p className="mt-1 text-xs text-gray-500">
                  Section cannot be changed when editing an existing stack
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Container Size Selection */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Package className="depot-section-icon text-green-500" />
            Container Size Configuration
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
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
                <p className="mt-2 text-xs text-gray-600">
                  Special stacks are limited to 20ft containers only
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stack Type Selection */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Shield className="depot-section-icon text-blue-500" />
            Stack Type Configuration
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
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
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Grid3X3 className="depot-section-icon text-green-500" />
            Capacity Configuration
          </h4>

          <div className="depot-form-grid">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rows *
              </label>
              <input
                type="number"
                required
                min="1"
                max="10"
                value={formData.rows}
                onChange={(e) => handleInputChange('rows', parseInt(e.target.value) || 1)}
                className={`depot-input ${errors.rows || rowValidationWarning ? 'error' : ''}`}
                placeholder="4"
              />
              {errors.rows && <p className="mt-1 text-sm text-red-600">{errors.rows}</p>}
              {rowValidationWarning && (
                <div className="mt-2 flex items-start p-2 bg-red-50 border border-red-200 rounded">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{rowValidationWarning}</p>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-600">Number of container rows (depth)</p>
              {selectedStack && (
                <p className="mt-1 text-xs text-blue-600">
                  Current: {selectedStack.rows} rows. Reducing rows will be validated against existing containers.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tiers *
              </label>
              <input
                type="number"
                required
                min="1"
                max="8"
                value={formData.maxTiers}
                onChange={(e) => handleInputChange('maxTiers', parseInt(e.target.value) || 1)}
                className={`depot-input ${errors.maxTiers ? 'error' : ''}`}
                placeholder="5"
              />
              {errors.maxTiers && <p className="mt-1 text-sm text-red-600">{errors.maxTiers}</p>}
              <p className="mt-1 text-xs text-gray-600">Maximum stacking height</p>
            </div>
          </div>

          {/* Custom Row-Tier Configuration Toggle */}
          <div className="mt-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.useCustomRowTiers}
                onChange={(e) => {
                  const useCustom = e.target.checked;
                  setFormData(prev => ({
                    ...prev,
                    useCustomRowTiers: useCustom,
                    rowTierConfig: useCustom ? generateDefaultRowTierConfig() : []
                  }));
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Use custom tier heights per row
              </span>
            </label>
            <p className="mt-1 ml-7 text-xs text-gray-600">
              Configure different maximum tier heights for each row (e.g., Row 1: 5 tiers, Row 2: 4 tiers)
            </p>
          </div>

          {/* Custom Row-Tier Configuration Grid */}
          {formData.useCustomRowTiers && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="text-sm font-semibold text-blue-900 mb-3">Per-Row Tier Configuration</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: formData.rows }, (_, i) => i + 1).map(rowNum => {
                  const rowConfig = formData.rowTierConfig.find(c => c.row === rowNum);
                  const currentTiers = rowConfig?.maxTiers || formData.maxTiers;
                  
                  return (
                    <div key={rowNum} className="bg-white p-3 rounded-lg border border-blue-300">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Row {rowNum}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={currentTiers}
                        onChange={(e) => updateRowTierConfig(rowNum, parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">{currentTiers} tiers</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-blue-800">
                💡 Tip: Different rows can have different heights based on ground conditions or equipment reach
              </div>
            </div>
          )}

          {/* Capacity Display */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Total Capacity:</span>
              <span className="text-lg font-bold text-gray-900">
                {calculateCapacity()} containers
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {formData.useCustomRowTiers ? (
                <>Custom configuration: {formData.rowTierConfig.map(c => `R${c.row}:${c.maxTiers}`).join(', ')}</>
              ) : (
                <>{formData.rows} rows × {formData.maxTiers} tiers = {calculateCapacity()} container positions</>
              )}
            </div>
          </div>
        </div>

        {/* Stack Preview */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Package className="depot-section-icon text-blue-500" />
            Stack Preview
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Stack Number:</span>
              <div className="font-medium text-gray-900">S{formData.stackNumber.toString().padStart(2, '0')}</div>
            </div>
            <div>
              <span className="text-gray-600">Section:</span>
              <div className="font-medium text-gray-900">
                {yard?.sections?.find(s => s.id === formData.sectionId)?.name || 'Not selected'}
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
      </div>
    </FormModal>
  );
};
