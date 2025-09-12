import React from 'react';
import { Plus, Clock, Menu, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

interface MobileGateOutHeaderProps {
  pendingCount: number;
  onShowPending: () => void;
  onShowForm: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const MobileGateOutHeader: React.FC<MobileGateOutHeaderProps> = ({
  pendingCount,
  onShowPending,
  onShowForm,
  isMobileMenuOpen,
  onToggleMobileMenu
}) => {
  const { user } = useAuth();
  const canPerformGateOut = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  if (!canPerformGateOut) {
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600 text-sm">You don't have permission to perform gate out operations.</p>
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
              <h1 className="text-xl font-bold text-gray-900">Gate Out</h1>
              <p className="text-sm text-gray-600">Container exit management</p>
            </div>
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onShowForm}
              className="flex-1 flex items-center justify-center space-x-2 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              <Plus className="h-5 w-5" />
              <span className="font-semibold">New Gate Out</span>
            </button>
            
            <button
              onClick={onShowPending}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
            >
              <Clock className="h-5 w-5" />
              <span className="font-semibold">Pending ({pendingCount})</span>
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
              <span>Create New Gate Out</span>
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