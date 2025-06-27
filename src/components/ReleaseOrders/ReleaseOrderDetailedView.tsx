import React from 'react';
import { LayoutGrid } from 'lucide-react';

export const ReleaseOrderDetailedView: React.FC = () => {
  return (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
      <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Detailed View</h3>
      <p className="text-gray-600">
        The detailed view with enhanced cards and filters is coming soon.
      </p>
      <p className="text-sm text-gray-500 mt-2">
        Switch to Table View to see the streamlined release orders table.
      </p>
    </div>
  );
};