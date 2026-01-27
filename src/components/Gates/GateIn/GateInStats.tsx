import React from 'react';
import { Truck, Clock, Container as ContainerIcon, AlertTriangle } from 'lucide-react';
import { CardSkeleton } from '../../Common/CardSkeleton';

interface GateInStatsProps {
  todayGateIns: number;
  pendingOperations: number;
  containersProcessed: number;
  damagedContainers: number;
  loading?: boolean;
}

export const GateInStats: React.FC<GateInStatsProps> = ({
  todayGateIns,
  pendingOperations,
  containersProcessed,
  damagedContainers,
  loading = false
}) => {
  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><CardSkeleton count={3} /></div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <Truck className="h-5 w-5 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">Today's Gate Ins</p>
            <p className="text-lg font-semibold text-gray-900">{todayGateIns}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
        <div className="flex items-center">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">Pending Operations</p>
            <p className="text-lg font-semibold text-gray-900">{pendingOperations}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ContainerIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">Containers Processed</p>
            <p className="text-lg font-semibold text-gray-900">{containersProcessed}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-purple-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">Damaged Containers</p>
            <p className="text-lg font-semibold text-gray-900">{damagedContainers}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
