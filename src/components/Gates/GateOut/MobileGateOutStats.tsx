import React from 'react';
import { Truck, Clock, Package, AlertTriangle } from 'lucide-react';
import { CardSkeleton } from '../../Common/CardSkeleton';

interface MobileGateOutStatsProps {
  todayGateOuts: number;
  pendingOperations: number;
  containersProcessed: number;
  issuesReported: number;
  loading?: boolean;
}

export const MobileGateOutStats: React.FC<MobileGateOutStatsProps> = ({
  todayGateOuts,
  pendingOperations,
  containersProcessed,
  issuesReported,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:hidden">
          <CardSkeleton count={2} />
        </div>
        <div className="hidden sm:grid lg:hidden grid-cols-4 gap-4">
          <CardSkeleton count={4} />
        </div>
        <div className="hidden lg:grid grid-cols-4 gap-6">
          <CardSkeleton count={4} />
        </div>
      </div>
    );
  }
  const stats = [
    {
      icon: Truck,
      label: "Today's Gate Outs",
      value: todayGateOuts,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      icon: Clock,
      label: 'Pending Operations',
      value: pendingOperations,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      icon: Package,
      label: 'Containers Processed',
      value: containersProcessed,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      icon: AlertTriangle,
      label: 'Issues Reported',
      value: issuesReported,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Mobile: 2x2 Grid */}
      <div className="grid grid-cols-2 gap-4 sm:hidden">
        {stats.map((stat, index) => {
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
        {stats.map((stat, index) => {
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
        {stats.map((stat, index) => {
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
