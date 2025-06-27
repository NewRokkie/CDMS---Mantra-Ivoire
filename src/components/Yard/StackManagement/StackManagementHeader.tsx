import React from 'react';
import { Save, RotateCcw } from 'lucide-react';

interface StackManagementHeaderProps {
  hasChanges: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const StackManagementHeader: React.FC<StackManagementHeaderProps> = ({
  hasChanges,
  onSave,
  onReset
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Stack Management</h2>
        <p className="text-gray-600">Configure container size assignments for all stacks</p>
      </div>
      <div className="flex items-center space-x-3">
        {hasChanges && (
          <>
            <button
              onClick={onReset}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={onSave}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};