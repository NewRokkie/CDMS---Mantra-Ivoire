import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'teal';
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-600 text-white',
    text: 'text-blue-600'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-600 text-white',
    text: 'text-green-600'
  },
  yellow: {
    bg: 'bg-yellow-50',
    icon: 'bg-yellow-600 text-white',
    text: 'text-yellow-600'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-600 text-white',
    text: 'text-red-600'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-600 text-white',
    text: 'text-purple-600'
  },
  teal: {
    bg: 'bg-teal-50',
    icon: 'bg-teal-600 text-white',
    text: 'text-teal-600'
  }
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, color }) => {
  const { t } = useLanguage();
  const classes = colorClasses[color];

  return (
    <div className={`${classes.bg} rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-gray-500 ml-1">{t('dashboard.stats.vsLastMonth')}</span>
            </div>
          )}
        </div>
        <div className={`${classes.icon} rounded-lg p-3`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};