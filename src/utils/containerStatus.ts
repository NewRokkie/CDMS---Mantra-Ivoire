import { Container } from '../types';

/**
 * Container Status Flow:
 * 01 - gate_in: Container is in Gate In process (pending location assignment)
 * 02 - in_depot: Container is assigned to a location in the depot
 * 03 - gate_out: Container is in Gate Out process (pending operation completion)
 * 04 - out_depot: Container has left the depot
 * 
 * Additional statuses: maintenance, cleaning
 */

export type ContainerStatusCode = '01' | '02' | '03' | '04' | 'maintenance' | 'cleaning';

export interface ContainerStatusInfo {
  code: ContainerStatusCode;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

export const getContainerStatusInfo = (status: Container['status']): ContainerStatusInfo => {
  switch (status) {
    case 'gate_in':
      return {
        code: '01',
        label: 'Gate In',
        description: 'Container in gate in process',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100',
        borderColor: 'border-blue-300',
        dotColor: 'bg-blue-500'
      };
    case 'in_depot':
      return {
        code: '02',
        label: 'In Depot',
        description: 'Container stored in depot',
        color: 'text-green-800',
        bgColor: 'bg-green-100',
        borderColor: 'border-green-300',
        dotColor: 'bg-green-500'
      };
    case 'gate_out':
      return {
        code: '03',
        label: 'Gate Out',
        description: 'Container in gate out process',
        color: 'text-orange-800',
        bgColor: 'bg-orange-100',
        borderColor: 'border-orange-300',
        dotColor: 'bg-orange-500'
      };
    case 'out_depot':
      return {
        code: '04',
        label: 'Out Depot',
        description: 'Container has left depot',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        dotColor: 'bg-gray-500'
      };
    case 'maintenance':
      return {
        code: 'maintenance',
        label: 'Maintenance',
        description: 'Container under maintenance',
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-300',
        dotColor: 'bg-yellow-500'
      };
    case 'cleaning':
      return {
        code: 'cleaning',
        label: 'Cleaning',
        description: 'Container being cleaned',
        color: 'text-purple-800',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-300',
        dotColor: 'bg-purple-500'
      };
    default:
      return {
        code: '02',
        label: 'Unknown',
        description: 'Unknown status',
        color: 'text-gray-800',
        bgColor: 'bg-gray-100',
        borderColor: 'border-gray-300',
        dotColor: 'bg-gray-500'
      };
  }
};

export const getContainerStatusBadge = (status: Container['status']): string => {
  const info = getContainerStatusInfo(status);
  return `${info.bgColor} ${info.color} ${info.borderColor}`;
};

export const isContainerInDepot = (status: Container['status']): boolean => {
  return status === 'in_depot';
};

export const isContainerOutDepot = (status: Container['status']): boolean => {
  return status === 'out_depot';
};

export const isContainerInStandby = (status: Container['status']): boolean => {
  return status === 'gate_in' || status === 'gate_out';
};

export const canContainerBeAssignedLocation = (status: Container['status']): boolean => {
  return status === 'gate_in';
};

export const canContainerBeGatedOut = (status: Container['status']): boolean => {
  return status === 'in_depot';
};
