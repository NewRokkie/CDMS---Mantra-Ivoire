import React from 'react';
import clsx from 'clsx';

type BadgeType = 'default' | 'success' | 'error' | 'warning';

const styles: Record<BadgeType, string> = {
  default: 'bg-gray-600/10 text-gray-600',
  success: 'bg-green-600/20 text-green-500',
  error: 'bg-red-600/20 text-red-500',
  warning: 'bg-yellow-600/20 text-yellow-500',
};

interface Props {
  children: React.ReactNode;
  type?: BadgeType;
}

export const Badge: React.FC<Props> = ({ children, type = 'default' }) => (
  <span className={clsx('inline-flex px-2 py-1 text-xs font-medium rounded-full', styles[type])}>
    {children?.toString().toUpperCase() || ''}
  </span>
);
