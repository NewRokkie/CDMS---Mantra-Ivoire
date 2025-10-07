import React from 'react';
import { List, AlertTriangle, CheckCircle, Package } from 'lucide-react';

interface ReleaseOrderStats {
  total: number;
  pending: number;
  validated: number;
  completed: number;
  totalContainers: number;
  readyContainers: number;
}

interface MobileReleaseOrderStatsProps {
  stats: ReleaseOrderStats;
}

export const MobileReleaseOrderStats: React.FC<MobileReleaseOrderStatsProps> = ({ stats }) => {
  const statsList = [
    {
      icon: List,
      label: 'Total Bookings',
      value: stats.total,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      icon: AlertTriangle,
      label: 'Pending',
      value: stats.pending,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      icon: CheckCircle,
      label: 'Validated',
      value: stats.validated,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      icon: CheckCircle,
      label: 'Completed',
      value: stats.completed,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Mobile: 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4 sm:hidden">
        {statsList.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 active:scale-95`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={`p-3 ${stat.color} rounded-xl shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs font-medium ${stat.textColor} leading-tight`}>
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tablet: 4x1 Grid */}
      <div className="hidden sm:grid lg:hidden grid-cols-4 gap-4">
        {statsList.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`${stat.bgColor} rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className={`p-2 ${stat.color} rounded-lg`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-xs font-medium ${stat.textColor}`}>
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Original Layout */}
      <div className="hidden lg:grid grid-cols-4 gap-6">
        {statsList.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                  <Icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
