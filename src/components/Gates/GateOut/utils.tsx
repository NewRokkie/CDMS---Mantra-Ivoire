import React from 'react';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { PendingGateOut } from './types';

/**
 * Validates container number format
 */
export const validateContainerNumber = (containerNumber: string): { isValid: boolean; message?: string } => {
  if (!containerNumber) {
    return { isValid: false, message: 'Container number is required' };
  }
  
  if (containerNumber.length !== 11) {
    return { isValid: false, message: `${containerNumber.length}/11 characters` };
  }
  
  const letters = containerNumber.substring(0, 4);
  const numbers = containerNumber.substring(4, 11);
  
  if (!/^[A-Z]{4}$/.test(letters)) {
    return { isValid: false, message: 'First 4 characters must be letters (A-Z)' };
  }
  
  if (!/^[0-9]{7}$/.test(numbers)) {
    return { isValid: false, message: 'Last 7 characters must be numbers (0-9)' };
  }
  
  return { isValid: true, message: 'Valid format' };
};

/**
 * Formats container number for display (adds hyphens)
 */
export const formatContainerForDisplay = (containerNumber: string): string => {
  if (containerNumber.length === 11) {
    const letters = containerNumber.substring(0, 4);
    const numbers1 = containerNumber.substring(4, 10);
    const numbers2 = containerNumber.substring(10, 11);
    return `${letters}-${numbers1}-${numbers2}`;
  }
  return containerNumber;
};

/**
 * Gets status badge component for operations
 */
export const getStatusBadge = (status: PendingGateOut['status']): JSX.Element => {
  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
    in_process: { color: 'bg-blue-100 text-blue-800', label: 'In Process', icon: AlertTriangle },
    completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle }
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </span>
  );
}