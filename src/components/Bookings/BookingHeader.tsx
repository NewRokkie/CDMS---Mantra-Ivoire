import React from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Yard } from '../../types/yard';

interface BookingHeaderProps {
  onCreateOrder: () => void;
  currentYard: Yard | null;
}

export const BookingHeader: React.FC<BookingHeaderProps> = ({ onCreateOrder, currentYard }) => {
  const { t } = useTranslation();
  const { user, canViewAllData } = useAuth();

  const canCreateOrders = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor' || user?.role === 'client';
  const showClientNotice = !canViewAllData() && user?.role === 'client';

  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="h2 text-gray-900 dark:text-white">
          {t('bookings.booking.title')}
          {currentYard && (
            <span className="h4 text-blue-600 dark:text-blue-400 ml-2">
              • {currentYard.name}
            </span>
          )}
        </h2>
        {showClientNotice && (
          <div className="flex items-center mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
            <p className="text-sm text-blue-800">
              {t('bookings.clientNotice.viewingCompany', { company: user?.company || t('common.yourCompany') })}
              {currentYard && (
                <span className="ml-1">{t('bookings.clientNotice.inYard', { yard: currentYard.name })}</span>
              )}.
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
          <span>{t('bookings.createBooking')}</span>
        </button>
      )}
    </div>
  );
};
