import React from 'react';
import { List, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ReleaseOrderStats {
  total: number;
  pending: number;
  completed: number;
  inProcess: number;
  totalContainers: number;
  readyContainers: number;
}

interface ReleaseOrderKPICardsProps {
  stats: ReleaseOrderStats;
}

export const ReleaseOrderKPICards: React.FC<ReleaseOrderKPICardsProps> = ({ stats }) => {
  const { theme } = useTheme();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Orders */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <List className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-gilroy-medium text-gray-600 dark:text-gray-400 truncate">Total Bookings</p>
                <p className="text-2xl font-numeric font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-gilroy-medium text-gray-600 dark:text-gray-400 truncate">Pending</p>
                <p className="text-2xl font-numeric font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* In Process */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-gilroy-medium text-gray-600 dark:text-gray-400 truncate">In Process</p>
                <p className="text-2xl font-numeric font-bold text-gray-900 dark:text-white">{stats.inProcess}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completed */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-gilroy-medium text-gray-600 dark:text-gray-400 truncate">Completed</p>
                <p className="text-2xl font-numeric font-bold text-gray-900 dark:text-white">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
