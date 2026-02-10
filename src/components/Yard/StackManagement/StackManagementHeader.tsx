import React from 'react';
import { Save, RotateCcw, Plus, RefreshCw, HelpCircle } from 'lucide-react';

interface StackManagementHeaderProps {
  hasChanges: boolean;
  onCreateStack: () => void;
  onSave: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onShowHelp: () => void;
  isRefreshing?: boolean;
}

export const StackManagementHeader: React.FC<StackManagementHeaderProps> = ({
  hasChanges,
  onCreateStack,
  onSave,
  onReset,
  onRefresh,
  onShowHelp,
  isRefreshing = false
}) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Stack Management</h2>
          <p className="text-sm sm:text-base text-gray-600 hidden sm:block">Configure container size assignments for all stacks</p>
        </div>
        <button
          onClick={onShowHelp}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
          title="View configuration rules and help"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          title="Refresh stack configuration"
        >
          <RefreshCw className={`h-4 w-4 flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="whitespace-nowrap">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
        <button
          onClick={onCreateStack}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <span className="whitespace-nowrap">Create Stack</span>
        </button>
        {hasChanges && (
          <>
            <button
              onClick={onReset}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Reset</span>
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Save className="h-4 w-4 flex-shrink-0" />
              <span className="whitespace-nowrap">Save Changes</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};