import React, { useEffect } from 'react';
import { X, Package, Shield, Grid3x3, AlertTriangle, Info } from 'lucide-react';

interface StackConfigurationHelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StackConfigurationHelpDialog: React.FC<StackConfigurationHelpDialogProps> = ({
  isOpen,
  onClose
}) => {
  // Handle ESC key to close dialog
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        // Close dialog when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Stack Configuration Rules</h2>
              <p className="text-sm text-gray-600">Guidelines for container size assignments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close help dialog (ESC)"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Container Size Rules */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h3 className="flex items-center text-lg font-semibold text-blue-900 mb-3">
                <Package className="h-5 w-5 mr-2" />
                Container Size Rules
              </h3>
              <div className="space-y-3 text-sm text-blue-800">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>20ft Containers:</strong> Can be placed on any active stack
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>40ft Containers:</strong> Require paired stacks (e.g., S03+S05, S07+S09)
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Size Changes:</strong> Paired stacks are updated together automatically
                  </div>
                </div>
              </div>
            </div>

            {/* Special Stack Rules */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <h3 className="flex items-center text-lg font-semibold text-purple-900 mb-3">
                <Shield className="h-5 w-5 mr-2" />
                Special Stack Rules
              </h3>
              <div className="space-y-3 text-sm text-purple-800">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Special Stacks:</strong> Limited to 20ft containers only
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Examples:</strong> Buffer zones, maintenance areas, inspection stacks
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Cannot be paired:</strong> Special stacks don't support 40ft operations
                  </div>
                </div>
              </div>
            </div>

            {/* Pairing Rules */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <h3 className="flex items-center text-lg font-semibold text-green-900 mb-3">
                <Grid3x3 className="h-5 w-5 mr-2" />
                Stack Pairing Rules
              </h3>
              <div className="space-y-3 text-sm text-green-800">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Valid Pairs:</strong> Adjacent odd-numbered stacks (S03+S05, S07+S09, etc.)
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Virtual Stacks:</strong> Automatically created between paired stacks (S04, S08, etc.)
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Synchronization:</strong> Paired stacks share the same container size setting
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h3 className="flex items-center text-lg font-semibold text-amber-900 mb-3">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Important Notes
              </h3>
              <div className="space-y-3 text-sm text-amber-800">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Container Validation:</strong> Cannot change size if containers are currently stored
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Client Assignments:</strong> Stacks can be assigned to specific client pools
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <strong>Capacity Planning:</strong> Consider row-tier configurations for optimal space usage
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Reference</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Container Sizes</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>• 20ft: Single stack placement</div>
                    <div>• 40ft: Requires stack pairing</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Stack Types</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>• Regular: Supports both sizes</div>
                    <div>• Special: 20ft containers only</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};