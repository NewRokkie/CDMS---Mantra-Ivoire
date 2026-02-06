import React from 'react';

export const StackSummaryCardsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
};