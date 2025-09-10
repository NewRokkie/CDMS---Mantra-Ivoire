import React from 'react';
import { Truck, Clock, Package, AlertTriangle } from 'lucide-react';

interface GateOutStatsProps {
  todayGateOuts: number;
  pendingOperations: number;
  containersProcessed: number;
  issuesReported: number;
}

export const GateOutStats: React.FC<GateOutStatsProps> = ({
  todayGateOuts,
  pendingOperations,
  containersProcessed,
  issuesReported
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">Today's Gate Outs</p>
            <p className="text-lg font-semibold text-gray-900">{todayGateOuts}</p>
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
          <div className="p-2 bg-green-100 rounded-lg">
            <Package className="h-5 w-5 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">Containers Processed</p>
            <p className="text-lg font-semibold text-gray-900">{containersProcessed}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
        <div className="flex items-center">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-500">Issues Reported</p>
            <p className="text-lg font-semibold text-gray-900">{issuesReported}</p>
          </div>
        </div>
      </div>
    </div>
  );
};