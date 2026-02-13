import React, { useState, useEffect, useCallback } from 'react';
import { Package, Grid3x3 as Grid3X3, AlertTriangle, Shield, Settings, Plus, Minus } from 'lucide-react';
import { Yard, YardStack } from '../../../types';
import { yardsService } from '../../../services/api/yardsService';
import { FormModal } from '../../Common/Modal/FormModal';
import { handleError } from '../../../services/errorHandling';
import { useLanguage } from '../../../hooks/useLanguage';

interface StackFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<YardStack>) => void;
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
  const { t } = useLanguage();
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
  const [suggestedStackNumber, setSuggestedStackNumber] = useState<number>(1);

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
      // Reset for new stack - always get fresh suggested number when modal opens
      const firstSection = yard.sections[0];

      let suggestedNumber = 1;
      try {
        if (firstSection && yard.id && isOpen) {
          // Force fresh calculation by calling the service directly
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
        rows: 5,
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
        rows: 5,
        maxTiers: 5,
        useCustomRowTiers: false,
        rowTierConfig: []
      });
    }
    setErrors({});
  }, [selectedStack, yard, isOpen]);

  const validateForm = useCallback(() => {
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

    if (formData.maxTiers <= 0 || formData.maxTiers > 8) {
      newErrors.maxTiers = t('stack.validation.tiersRange');
      newValidationErrors.push(t('stack.validation.tiersRange'));
    }

    // Special stacks can only be 20ft
    if (formData.stackType === 'special' && formData.containerSize === '40ft') {
      newErrors.containerSize = t('stack.validation.specialNo40');
      newValidationErrors.push(t('stack.validation.specialNo40'));
    }

    setErrors(newErrors);
    setValidationErrors(newValidationErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, selectedStack, t]);

  const handleInputChange = async (field: string, value: string | number | boolean, triggerAutoSave?: () => void) => {
    // Validate row reduction if editing existing stack
    if (field === 'rows' && selectedStack && typeof value === 'number' && value < formData.rows) {
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
        setRowValidationWarning(t('stack.validation.rowChangeError'));
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
          containerSize: value as '40ft',
          rows: Math.max(prev.rows, 4), // Ensure minimum 4 rows for 40ft
          stackType: 'regular' // Force regular for 40ft
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          containerSize: value as '20ft'
        }));
      }
    }

    // Auto-adjust container size based on stack type
    if (field === 'stackType') {
      if (value === 'special') {
        setFormData(prev => ({
          ...prev,
          stackType: value as 'special',
          containerSize: '20ft' // Force 20ft for special stacks
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          stackType: value as 'regular'
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

  const calculateCapacity = useCallback(() => {
    if (formData.useCustomRowTiers && formData.rowTierConfig.length > 0) {
      // Calculate from custom row-tier config
      return formData.rowTierConfig.reduce((sum, config) => sum + config.maxTiers, 0);
    }
    return formData.rows * formData.maxTiers;
  }, [formData.rows, formData.maxTiers, formData.useCustomRowTiers, formData.rowTierConfig]);

  const handleSubmit = async () => {
    if (!validateForm()) {
      throw new Error('Form validation failed');
    }

    // Transform form data to match YardStack type
    const stackData: Partial<YardStack> = {
      stackNumber: formData.stackNumber,
      sectionId: formData.sectionId,
      sectionName: yard?.sections?.find(s => s.id === formData.sectionId)?.name || 'Zone A',
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

  const generateDefaultRowTierConfig = useCallback((): Array<{ row: number; maxTiers: number }> => {
    const config: Array<{ row: number; maxTiers: number }> = [];
    for (let i = 1; i <= formData.rows; i++) {
      config.push({ row: i, maxTiers: formData.maxTiers });
    }
    return config;
  }, [formData.rows, formData.maxTiers]);

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
      ? t('stack.rules.special')
      : t('stack.rules.pairing');
  };

  const getStackTypeDescription = (type: 'regular' | 'special') => {
    return type === 'regular'
      ? t('stack.form.regularDesc')
      : t('stack.form.specialDesc');
  };

  // Recalculate suggested stack number whenever section changes
  useEffect(() => {
    if (!selectedStack && yard?.id && formData.sectionId && isOpen) {
      try {
        const suggested = yardsService.getNextStackNumber(yard.id, formData.sectionId);
        setSuggestedStackNumber(suggested);
        
        // Auto-update the stack number field if it's currently using the old suggested number
        // or if it's the initial load (stackNumber is 0)
        if (formData.stackNumber === 0 || formData.stackNumber === suggestedStackNumber) {
          setFormData(prev => ({ ...prev, stackNumber: suggested }));
        }
      } catch (error) {
        handleError(error, 'StackFormModal.recalculateSuggestedNumber');
        setSuggestedStackNumber(1);
      }
    } else {
      setSuggestedStackNumber(1);
    }
  }, [yard?.id, formData.sectionId, selectedStack, isOpen, formData.stackNumber, suggestedStackNumber]);

  // Synchronize rowTierConfig when rows change and custom tier configuration is enabled
  useEffect(() => {
    if (formData.useCustomRowTiers) {
      const currentRowCount = formData.rows;
      const configRowCount = formData.rowTierConfig.length;
      
      if (currentRowCount !== configRowCount) {
        const newConfig: Array<{ row: number; maxTiers: number }> = [];
        for (let i = 1; i <= currentRowCount; i++) {
          // Try to preserve existing config for this row, otherwise use default maxTiers
          const existingConfig = formData.rowTierConfig.find(c => c.row === i);
          newConfig.push({ 
            row: i, 
            maxTiers: existingConfig?.maxTiers || formData.maxTiers 
          });
        }
        setFormData(prev => ({ ...prev, rowTierConfig: newConfig }));
      }
    }
  }, [formData.rows, formData.useCustomRowTiers, formData.maxTiers, formData.rowTierConfig]);

  // Validate form on data changes (skip initial validation when form is being initialized)
  useEffect(() => {
    // Only validate if we have a valid stack number (form has been initialized)
    if (formData.stackNumber > 0) {
      validateForm();
    }
  }, [formData, validateForm]);

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={selectedStack ? t('stack.edit') : t('stack.create')}
      subtitle={`${yard?.name || 'Yard'} ${yard?.code ? `(${yard.code})` : ''} ${yard?.layout ? `- ${yard.layout} layout` : ''}`}
      icon={Package}
      size="lg"
      submitLabel={selectedStack ? t('common.update') : t('common.create')}
      isSubmitting={isLoading}
      validationErrors={validationErrors}
      autoSave={true}
    >
      <div className="depot-step-spacing">
        {/* Basic Stack Information */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Package className="depot-section-icon text-blue-500" />
            {t('stack.form.information')}
          </h4>

          <div className="depot-form-grid">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('stack.form.number')} *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  required
                  min="1"
                  max="999"
                  value={formData.stackNumber || ''}
                  onChange={(e) => handleInputChange('stackNumber', parseInt(e.target.value) || 0)}
                  className={`depot-input flex-1 ${errors.stackNumber ? 'error' : ''}`}
                  placeholder={t('stack.form.number')}
                  disabled={!!selectedStack} // Don't allow changing stack number when editing
                />
                {!selectedStack && suggestedStackNumber > 0 && formData.stackNumber !== suggestedStackNumber && (
                  <button
                    type="button"
                    onClick={() => handleInputChange('stackNumber', suggestedStackNumber)}
                    className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap"
                    title={t('stack.form.useSuggested').replace('{number}', suggestedStackNumber.toString())}
                  >
                    {t('stack.form.useSuggested').replace('{number}', suggestedStackNumber.toString())}
                  </button>
                )}
              </div>
              {errors.stackNumber && <p className="mt-1 text-sm text-red-600">{errors.stackNumber}</p>}
              {yard?.layout === 'tantarelli' && !selectedStack && (
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-xs text-blue-600">
                    {t('stack.form.suggested').replace('{number}', suggestedStackNumber > 0 ? suggestedStackNumber.toString() : 'N/A')}
                  </p>
                  {suggestedStackNumber > 0 && formData.stackNumber !== suggestedStackNumber && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">
                      {t('stack.form.differentFromSuggested')}
                    </span>
                  )}
                  {suggestedStackNumber > 0 && formData.stackNumber === suggestedStackNumber && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                      {t('stack.form.usingSuggested')}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('stack.form.section')} *
              </label>
              {selectedStack ? (
                <div className="form-input w-full bg-gray-100 text-gray-700 cursor-not-allowed">
                  {yard?.sections?.find(s => s.id === formData.sectionId)?.name || t('common.none')}
                </div>
              ) : (
                <select
                  required
                  value={formData.sectionId}
                  onChange={(e) => {
                    handleInputChange('sectionId', e.target.value);
                  }}
                  className={`depot-select ${errors.sectionId ? 'error' : ''}`}
                >
                  <option value="">{t('stack.form.selectSection')}</option>
                  {yard?.sections?.map(section => (
                    <option key={section.id} value={section.id}>
                      {section.name} ({section.stacks.length} {t('common.containers')})
                    </option>
                  )) || (
                    <option value="" disabled>{t('stack.form.noSections')}</option>
                  )}
                </select>
              )}
              {errors.sectionId && <p className="mt-1 text-sm text-red-600">{errors.sectionId}</p>}
              {selectedStack && (
                <p className="mt-1 text-xs text-gray-500">
                  {t('stack.form.sectionImmutable')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Container Size Selection */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Package className="depot-section-icon text-green-500" />
            {t('stack.form.sizeConfig')}
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('common.size')} *
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
                    <div className="font-bold text-lg text-gray-900">{t('stack.size20')}</div>
                    <div className="text-sm text-gray-600 mt-1">{t('stack.form.20ftDesc')}</div>
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
                    <div className="font-bold text-lg text-gray-900">{t('stack.size40')}</div>
                    <div className="text-sm text-gray-600 mt-1">{t('stack.form.40ftDesc')}</div>
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
                  {t('stack.form.specialWarning')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stack Type Selection */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Shield className="depot-section-icon text-blue-500" />
            {t('stack.form.typeConfig')}
          </h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('common.type')} *
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
                    <div className="font-bold text-lg text-gray-900">{t('stack.regular')}</div>
                    <div className="text-sm text-gray-600 mt-1">{t('stack.form.regularDesc')}</div>
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
                    <div className="font-bold text-lg text-gray-900">{t('stack.special')}</div>
                    <div className="text-sm text-gray-600 mt-1">{t('stack.form.specialDesc')}</div>
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
            {t('stack.form.capacityConfig')}
          </h4>

          {/* Modern Capacity Configuration Cards */}
          <div className="space-y-6">
            {/* Rows and Tiers Configuration */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <Grid3X3 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h5 className="font-semibold text-slate-900">{t('stack.form.dimensions')}</h5>
                  <p className="text-sm text-slate-600">{t('stack.form.dimensionsDesc')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Rows Configuration */}
                <div className="bg-white rounded-xl p-5 border-2 border-blue-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Grid3X3 className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">{t('stack.form.rows')}</span>
                    </div>
                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">1-7</span>
                  </div>

                  <div className="flex items-center justify-between space-x-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange('rows', Math.max(1, formData.rows - 1))}
                      disabled={formData.rows <= 1}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={formData.rows}
                      onChange={(e) => handleInputChange('rows', parseInt(e.target.value) || 1)}
                      className={`flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        errors.rows || rowValidationWarning ? 'border-red-300 bg-red-50' : ''
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => handleInputChange('rows', Math.min(7, formData.rows + 1))}
                      disabled={formData.rows >= 7}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {errors.rows && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {errors.rows}
                    </p>
                  )}
                  
                  {rowValidationWarning && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-700">{rowValidationWarning}</p>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-slate-600">{t('stack.form.rowsDesc')}</p>
                  </div>
                </div>

                {/* Tiers Configuration */}
                <div className="bg-white rounded-xl p-5 border-2 border-green-200 hover:border-green-300 transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-gray-900">{t('stack.form.tiers')}</span>
                    </div>
                    <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">1-8</span>
                  </div>

                  <div className="flex items-center justify-between space-x-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange('maxTiers', Math.max(1, formData.maxTiers - 1))}
                      disabled={formData.maxTiers <= 1}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={formData.maxTiers}
                      onChange={(e) => handleInputChange('maxTiers', parseInt(e.target.value) || 1)}
                      className={`flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        errors.maxTiers ? 'border-red-300 bg-red-50' : ''
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => handleInputChange('maxTiers', Math.min(8, formData.maxTiers + 1))}
                      disabled={formData.maxTiers >= 8}
                      className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {errors.maxTiers && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {errors.maxTiers}
                    </p>
                  )}

                  <p className="mt-3 text-xs text-slate-600">{t('stack.form.tiersDesc')}</p>
                </div>
              </div>

              {/* Enhanced Stack Layout Preview */}
              <div className="mt-6 p-4 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700">{t('stack.form.previewLayout')}</span>
                  <div className="text-xs text-slate-500">
                    {formData.useCustomRowTiers ? t('stack.form.customLayout') : `${formData.rows} × ${formData.maxTiers}`}
                  </div>
                </div>
                
                <div className="flex items-center justify-center py-4">
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(formData.rows, 12)}, 1fr)` }}>
                    {formData.useCustomRowTiers && formData.rowTierConfig.length > 0 ? (
                      // Custom tier layout
                      formData.rowTierConfig.map((rowConfig) => (
                        Array.from({ length: rowConfig.maxTiers }, (_, tierIndex) => (
                          <div
                            key={`${rowConfig.row}-${tierIndex}`}
                            className="w-4 h-4 bg-emerald-200 border border-emerald-300 rounded-sm"
                            title={`${t('stack.table.section')} ${rowConfig.row}, ${t('stack.table.capacity')} ${tierIndex + 1}`}
                            style={{
                              gridColumn: rowConfig.row,
                              gridRow: -(rowConfig.maxTiers - tierIndex)
                            }}
                          />
                        ))
                      )).flat()
                    ) : (
                      // Uniform layout
                      Array.from({ length: Math.min(formData.rows * formData.maxTiers, 96) }, (_, i) => {
                        const row = Math.floor(i / formData.maxTiers) + 1;
                        const tier = (i % formData.maxTiers) + 1;
                        return (
                          <div
                            key={i}
                            className="w-4 h-4 bg-emerald-200 border border-emerald-300 rounded-sm"
                            title={`${t('stack.table.stack')} ${row}, ${t('stack.table.capacity')} ${tier}`}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Custom Tier Configuration */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="relative">
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
                    className="w-5 h-5 text-blue-600 border-2 border-blue-300 rounded-lg focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                  />
                  {formData.useCustomRowTiers && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="font-semibold text-slate-900">{t('stack.form.customTiers')}</h5>
                  {formData.useCustomRowTiers && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      Advanced
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  {t('stack.form.customTiersDesc')}
                </p>

                {formData.useCustomRowTiers && (
                  <div className="space-y-2">
                    <div className="bg-white rounded-xl border border-blue-200">
                      {/* Table Rows */}
                      <div className="divide-y divide-slate-100">
                        {Array.from({ length: formData.rows }, (_, i) => i + 1).map(rowNum => {
                          const rowConfig = formData.rowTierConfig.find(c => c.row === rowNum);
                          const currentTiers = rowConfig?.maxTiers || formData.maxTiers;
                          
                          return (
                            <div key={rowNum} className="grid grid-cols-3 gap-4 px-4 py-4 hover:bg-slate-50 transition-colors">
                              {/* Row Name Column */}
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Package className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    R{rowNum}
                                  </div>
                                </div>
                              </div>

                              {/* Tiers Column */}
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-slate-700">
                                    H-{currentTiers}
                                  </span>
                                </div>
                                {/* Visual tier representation */}
                                <div className="flex items-center space-x-1">
                                  {Array.from({ length: Math.min(currentTiers, 5) }, (_, i) => (
                                    <div
                                      key={i}
                                      className="w-3 h-2 bg-blue-400 rounded-sm"
                                    />
                                  ))}
                                  {currentTiers > 5 && (
                                    <span className="text-xs text-slate-500 ml-1">+{currentTiers - 5}</span>
                                  )}
                                </div>
                              </div>

                              {/* Actions Column */}
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => updateRowTierConfig(rowNum, Math.max(1, currentTiers - 1))}
                                  disabled={currentTiers <= 1}
                                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>

                                <div className="w-16">
                                  <input
                                    type="number"
                                    min="1"
                                    max="8"
                                    value={currentTiers}
                                    onChange={(e) => updateRowTierConfig(rowNum, parseInt(e.target.value) || 1)}
                                    className="w-full text-center py-1 px-2 text-sm font-medium bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => updateRowTierConfig(rowNum, Math.min(8, currentTiers + 1))}
                                  disabled={currentTiers >= 8}
                                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Capacity Display */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h5 className="font-semibold text-slate-900">{t('stack.form.totalCapacity')}</h5>
                <p className="text-sm text-slate-600">{t('stack.form.capacityDesc')}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900">
                      {calculateCapacity()}
                    </div>
                    <div className="text-sm text-slate-600">{t('stack.form.positions')}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-700 mb-1">{t('common.filter')}</div>
                  <div className="text-xs text-slate-500">
                    {formData.useCustomRowTiers ? t('stack.form.customLayout') : t('stack.form.uniformLayout')}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-600">{t('common.filter')}</span>
                  <span className="text-sm font-medium text-slate-900">
                    {formData.rows} {t('stack.form.rows')} × {formData.maxTiers} {t('stack.form.tiers')}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{t('stack.form.calculation')}</span>
                    <span>
                      {formData.useCustomRowTiers 
                        ? `${formData.rowTierConfig.map(c => c.maxTiers).join(' + ')} = ${calculateCapacity()}`
                        : `${formData.rows} × ${formData.maxTiers} = ${calculateCapacity()}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stack Preview */}
        <div className="depot-section">
          <h4 className="depot-section-header">
            <Package className="depot-section-icon text-blue-500" />
            {t('stack.form.preview')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-600">{t('stack.form.number')}:</span>
              <div className="font-medium text-gray-900">S{formData.stackNumber.toString().padStart(2, '0')}</div>
            </div>
            <div>
              <span className="text-gray-600">{t('stack.form.section')}:</span>
              <div className="font-medium text-gray-900">
                {yard?.sections?.find(s => s.id === formData.sectionId)?.name || t('common.none')}
              </div>
            </div>
            <div>
              <span className="text-gray-600">{t('stack.table.capacity')}:</span>
              <div className="font-medium text-gray-900">{calculateCapacity()} {t('common.containers')}</div>
            </div>
            <div>
              <span className="text-gray-600">{t('stack.table.containerSize')}:</span>
              <div className="font-medium text-gray-900">{formData.containerSize}</div>
            </div>
            <div>
              <span className="text-gray-600">{t('common.type')}:</span>
              <div className="font-medium text-gray-900">
                {formData.stackType === 'special' ? t('stack.special') : t('stack.regular')}
              </div>
            </div>
          </div>

          {/* Configuration Warnings */}
          {formData.stackType === 'special' && (
            <div className="mt-4 flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>{t('stack.special')}:</strong> {t('stack.form.specialNotice')}
              </div>
            </div>
          )}

          {formData.containerSize === '40ft' && formData.stackType === 'regular' && (
            <div className="mt-4 flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Package className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>{t('stack.size40')}:</strong> {t('stack.form.40ftNotice')}
              </div>
            </div>
          )}
        </div>
      </div>
    </FormModal>
  );
};
