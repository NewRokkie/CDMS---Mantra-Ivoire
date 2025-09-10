import React from 'react';
import { Plus, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface GateInHeaderProps {
  pendingCount: number;
  onShowPending: () => void;
  onShowForm: () => void;
}

export const GateInHeader: React.FC<GateInHeaderProps> = ({
  pendingCount,
  onShowPending,
  onShowForm
}) => {
  const { user } = useAuth();
  const canPerformGateIn = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  if (!canPerformGateIn) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to perform gate in operations.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-900">Gate In Management</h2>
      <div className="flex items-center space-x-3">
        <button
          onClick={onShowPending}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <Clock className="h-4 w-4" />
          <span>Pending ({pendingCount})</span>
        </button>
        <button
          onClick={onShowForm}
          className="btn-success flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Gate In</span>
        </button>
      </div>
    </div>
  );
};