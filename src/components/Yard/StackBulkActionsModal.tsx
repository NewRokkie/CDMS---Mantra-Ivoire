import React, { useState } from 'react';
import {
  X,
  Settings,
  Copy,
  Download,
  Upload,
  Grid3X3,
  Building,
  Loader,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Yard } from '../../types/yard';

interface StackBulkActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentYard: Yard;
  availableYards: Yard[];
  onGenerateTantarelli: () => void;
  onCloneFromYard: (sourceYardId: string) => void;
  isLoading: boolean;
}

export const StackBulkActionsModal: React.FC<StackBulkActionsModalProps> = ({
  isOpen,
  onClose,
  currentYard,
  availableYards,
  onGenerateTantarelli,
  onCloneFromYard,
  isLoading
}) => {
  const [selectedSourceYard, setSelectedSourceYard] = useState('');

  if (!isOpen) return null;

  const otherYards = availableYards.filter(y => y.id !== currentYard.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-600 text-white rounded-lg">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Bulk Stack Actions</h3>
                <p className="text-sm text-gray-600">
                  {currentYard.name} ({currentYard.code})
                </p>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            
            {/* Generate Tantarelli Layout */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Grid3X3 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900">Generate Tantarelli Layout</h4>
                  <p className="text-sm text-blue-700">
                    Create the standard Tantarelli depot layout with 50+ predefined stacks
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <h5 className="font-medium text-blue-900 mb-2">Layout Specifications:</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Top Section:</strong> Stacks S01-S31 (16 stacks)</li>
                    <li>• <strong>Center Section:</strong> Stacks S33-S55 (12 stacks)</li>
                    <li>• <strong>Bottom Section:</strong> Stacks S61-S103 (22 stacks)</li>
                    <li>• <strong>Special Stacks:</strong> S01, S31, S101, S103 (limited capacity)</li>
                    <li>• <strong>Total Capacity:</strong> ~2,500 containers</li>
                  </ul>
                </div>
                
                <button
                  onClick={onGenerateTantarelli}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Generating Layout...</span>
                    </>
                  ) : (
                    <>
                      <Grid3X3 className="h-4 w-4" />
                      <span>Generate Tantarelli Layout</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Clone from Another Yard */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-600 text-white rounded-lg">
                  <Copy className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">Clone from Another Yard</h4>
                  <p className="text-sm text-green-700">
                    Copy stack configuration from an existing yard
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    Source Yard
                  </label>
                  <select
                    value={selectedSourceYard}
                    onChange={(e) => setSelectedSourceYard(e.target.value)}
                    className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select source yard...</option>
                    {otherYards.map(yard => (
                      <option key={yard.id} value={yard.id}>
                        {yard.name} ({yard.code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={() => selectedSourceYard && onCloneFromYard(selectedSourceYard)}
                  disabled={isLoading || !selectedSourceYard}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Cloning Stacks...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Clone Stacks</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Import/Export Actions */}
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-orange-600 text-white rounded-lg">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-orange-900">Import/Export</h4>
                  <p className="text-sm text-orange-700">
                    Import stack configurations from file or export current layout
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import Layout</span>
                </button>
                
                <button
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>Export Layout</span>
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">Important Notes</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Bulk actions will affect the entire yard layout</li>
                    <li>• Existing stacks will not be modified unless there are conflicts</li>
                    <li>• Stack numbers must be unique within the yard</li>
                    <li>• Position conflicts will be automatically resolved</li>
                    <li>• These actions cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};