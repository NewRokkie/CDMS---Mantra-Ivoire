import React from 'react';

interface CardSkeletonProps {
  count?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6 animate-pulse">
          {/* Title */}
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>

          {/* Content lines */}
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </>
  );
};
