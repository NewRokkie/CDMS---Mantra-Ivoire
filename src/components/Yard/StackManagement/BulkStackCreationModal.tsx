import React, { useState } from 'react';
import { X, Save, Loader, Grid3X3, Package, MapPin, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { YardSection } from '../../../types/yard';
import { StackFormData } from '../../../services/stackService';

interface BulkStackCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (stacksData: StackFormData[]) => void;
  sections: YardSection[];
  isLoading?: boolean;
}

interface BulkCreationConfig {
  sectionId: string;
  startNumber: number;
  endNumber: number;
  rows: number;
  maxTiers: number;
  startX: number;
  startY: number;
  spacingX: number;
  spacingY: number;
  stacksPerRow: number;
  isOddStack: boolean;
}

export const BulkStackCreationModal: React.FC<BulkStackCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sections,
  isLoading = false
}) => {
  const [config, setConfig] = useState<BulkCreationConfig>({
    sectionId: '',
    startNumber: 1,
    endNumber: 10,
    rows: 4,
    maxTiers: 5,
    startX: 0,
    startY: 0,
    spacingX: 30,
    spacingY: 40,
    stacksPerRow: 5,
    isOddStack: false
  });

  const [previewMode, setPreviewMode] = useState<'grid' | 'list'>('grid');

  const handleInputChange = (field: keyof BulkCreationConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateStacksPreview = (): StackFormData[] => {
    const stacks: StackFormData[] = [];
    
    for (let i = config.startNumber; i <= config.endNumber; i++) {
      const index = i - config.startNumber;
      const row = Math.floor(index / config.stacksPerRow);
      const col = index % config.stacksPerRow;
      
      stacks.push({
        stackNumber: i,
        sectionId: config.sectionId,
        rows: config.rows,
        maxTiers: config.maxTiers,
        position: {
          x: config.startX + (col * config.spacingX),
          y: config.startY + (row * config.spacingY),
          z: 0
        },
        dimensions: {
          width: 12,
          length: 6
        },
        isOddStack: config.isOddStack
      });
    }

    return stacks;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!config.sectionId) {
      alert('Please select a section');
      return;
    }

    if (config.startNumber > config.endNumber) {
      alert('Start number must be less than or equal to end number');
      return;
    }

    const stacksData = generateStacksPreview();
    onSubmit(stacksData);
  };

  const stacksPreview = generateStacksPreview();
  const totalStacks = stacksPreview.length;
  const totalCapacity = stacksPreview.reduce((sum, s) => sum + (s.rows * s.maxTiers), 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 text-white rounded-lg">
                <Grid3X3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Bulk Stack Creation</h3>
                <p className="text-sm text-gray-600">Create multiple stacks with automatic positioning</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Configuration Form */}
            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Basic Configuration */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Stack Configuration
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Section *
                      </label>
                      <select
                        required
                        value={config.sectionId}
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

                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          Start Number *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={config.startNumber}
                          onChange={(e) => handleInputChange('startNumber', parseInt(e.target.value) || 1)}
                          className="form-input w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-blue-800 mb-2">
                          End Number *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={config.endNumber}
                          onChange={(e) => handleInputChange('endNumber', parseInt(e.target.value) || 1)}
                          className="form-input w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Rows per Stack *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="10"
                        value={config.rows}
                        onChange={(e) => handleInputChange('rows', parseInt(e.target.value) || 4)}
                        className="form-input w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Max Tiers *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="6"
                        value={config.maxTiers}
                        onChange={(e) => handleInputChange('maxTiers', parseInt(e.target.value) || 5)}
                        className="form-input w-full"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isOddStack"
                      checked={config.isOddStack}
                      onChange={(e) => handleInputChange('isOddStack', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isOddStack" className="text-sm font-medium text-blue-800">
                      Odd-numbered stacks (Tantarelli layout)
                    </label>
                  </div>
                </div>

                {/* Layout Configuration */}
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Layout & Positioning
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Start X Position
                      </label>
                      <input
                        type="number"
                        value={config.startX}
                        onChange={(e) => handleInputChange('startX', parseInt(e.target.value) || 0)}
                        className="form-input w-full"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Start Y Position
                      </label>
                      <input
                        type="number"
                        value={config.startY}
                        onChange={(e) => handleInputChange('startY', parseInt(e.target.value) || 0)}
                        className="form-input w-full"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        X Spacing
                      </label>
                      <input
                        type="number"
                        min="10"
                        value={config.spacingX}
                        onChange={(e) => handleInputChange('spacingX', parseInt(e.target.value) || 30)}
                        className="form-input w-full"
                        placeholder="30"
                      />
                      <p className="text-xs text-green-600 mt-1">Distance between stacks horizontally</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Y Spacing
                      </label>
                      <input
                        type="number"
                        min="10"
                        value={config.spacingY}
                        onChange={(e) => handleInputChange('spacingY', parseInt(e.target.value) || 40)}
                        className="form-input w-full"
                        placeholder="40"
                      />
                      <p className="text-xs text-green-600 mt-1">Distance between rows vertically</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Stacks per Row
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={config.stacksPerRow}
                        onChange={(e) => handleInputChange('stacksPerRow', parseInt(e.target.value) || 5)}
                        className="form-input w-full"
                        placeholder="5"
                      />
                      <p className="text-xs text-green-600 mt-1">Number of stacks before starting a new row</p>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Creation Summary
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Stacks:</span>
                      <div className="font-medium text-gray-900">{totalStacks}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Number Range:</span>
                      <div className="font-medium text-gray-900">{config.startNumber} - {config.endNumber}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Capacity:</span>
                      <div className="font-medium text-gray-900">{totalCapacity} containers</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Layout:</span>
                      <div className="font-medium text-gray-900">{config.rows}R × {config.maxTiers}T</div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Preview */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Stack Preview</h4>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setPreviewMode('grid')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        previewMode === 'grid'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Grid
                    </button>
                    <button
                      onClick={() => setPreviewMode('list')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        previewMode === 'list'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      List
                    </button>
                  </div>
                </div>

                {previewMode === 'grid' ? (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 mb-3">
                      Visual layout preview (not to scale)
                    </div>
                    <div 
                      className="grid gap-2 max-h-64 overflow-auto"
                      style={{ 
                        gridTemplateColumns: `repeat(${Math.min(config.stacksPerRow, 8)}, minmax(0, 1fr))` 
                      }}
                    >
                      {stacksPreview.slice(0, 32).map((stack, index) => (
                        <div
                          key={index}
                          className="bg-blue-100 border border-blue-300 rounded-lg p-2 text-center"
                        >
                          <div className="text-xs font-medium text-blue-900">
                            S{stack.stackNumber.toString().padStart(2, '0')}
                          </div>
                          <div className="text-xs text-blue-700">
                            {stack.rows}×{stack.maxTiers}
                          </div>
                        </div>
                      ))}
                      {stacksPreview.length > 32 && (
                        <div className="bg-gray-100 border border-gray-300 rounded-lg p-2 text-center">
                          <div className="text-xs text-gray-600">
                            +{stacksPreview.length - 32} more
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-auto">
                    <div className="space-y-2">
                      {stacksPreview.slice(0, 20).map((stack, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">Stack {stack.stackNumber}</span>
                          <span className="text-xs text-gray-600">
                            ({stack.position.x}, {stack.position.y}) • {stack.rows}×{stack.maxTiers} = {stack.rows * stack.maxTiers}
                          </span>
                        </div>
                      ))}
                      {stacksPreview.length > 20 && (
                        <div className="text-center text-sm text-gray-500 py-2">
                          ... and {stacksPreview.length - 20} more stacks
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {totalStacks > 0 ? (
                <span className="text-green-600 font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Ready to create {totalStacks} stacks with {totalCapacity} total capacity
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Invalid configuration
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
                disabled={isLoading || totalStacks === 0 || !config.sectionId}
                className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Create {totalStacks} Stacks</span>
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