import React from 'react';
import { Plus, Clock, Menu, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface MobileGateInHeaderProps {
  pendingCount: number;
  onShowPending: () => void;
  onShowForm: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const MobileGateInHeader: React.FC<MobileGateInHeaderProps> = ({
  pendingCount,
  onShowPending,
  onShowForm,
  isMobileMenuOpen,
  onToggleMobileMenu
}) => {
  const { user } = useAuth();
  const canPerformGateIn = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  if (!canPerformGateIn) {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600 text-sm">You don't have permission to perform gate in operations.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-4">
          {/* Mobile Title Bar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gate In</h1>
              <p className="text-sm text-gray-600">Container entry management</p>
            </div>
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Action Buttons — grid + nowrap so labels don’t break mid-word on narrow widths */}
          <div className="grid grid-cols-2 gap-3 w-full min-w-0">
            <button
              type="button"
              onClick={onShowForm}
              className="flex min-w-0 items-center justify-center gap-2 whitespace-nowrap px-4 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5 shrink-0" />
              <span className="font-semibold text-sm">New Gate In</span>
            </button>

            <button
              type="button"
              onClick={onShowPending}
              className="flex min-w-0 items-center justify-center gap-2 whitespace-nowrap px-4 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              <Clock className="h-5 w-5 shrink-0" />
              <span className="font-semibold text-sm">Pending ({pendingCount})</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-gray-50 px-4 py-4 space-y-2">
            <button
              onClick={() => {
                onShowForm();
                onToggleMobileMenu();
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-white hover:text-gray-900 rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Gate In</span>
            </button>
            <button
              onClick={() => {
                onShowPending();
                onToggleMobileMenu();
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left text-gray-700 hover:bg-white hover:text-gray-900 rounded-lg transition-colors"
            >
              <Clock className="h-5 w-5" />
              <span>View Pending Operations ({pendingCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Desktop Header - Hidden on Mobile */}
    </>
  );
};