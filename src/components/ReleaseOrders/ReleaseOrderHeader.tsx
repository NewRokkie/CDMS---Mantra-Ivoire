import React from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';

interface ReleaseOrderHeaderProps {
  onCreateOrder: () => void;
}

export const ReleaseOrderHeader: React.FC<ReleaseOrderHeaderProps> = ({ onCreateOrder }) => {
  const { t } = useLanguage();
  const { user, canViewAllData } = useAuth();

  const canCreateOrders = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor' || user?.role === 'client';
  const showClientNotice = !canViewAllData() && user?.role === 'client';

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Booking Management</h2>
        {showClientNotice && (
          <div className="flex items-center mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
            <p className="text-sm text-blue-800">
              You are viewing bookings for <strong>{user?.company}</strong> only.
            </p>
          </div>
        )}
      </div>
      {canCreateOrders && (
        <button 
          onClick={onCreateOrder}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Booking</span>
        </button>
      )}
    </div>
  );
};