import React from 'react';

interface FullScreenLoaderProps {
  message?: string;
  submessage?: string;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ 
  message = 'Loading...', 
  submessage 
}) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Animated logo or spinner */}
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-24 w-24 border-8 border-gray-200 border-t-blue-600 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-12 w-12 bg-blue-600 rounded-full opacity-20 animate-pulse"></div>
          </div>
        </div>

        {/* Loading message */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          {message}
        </h2>
        
        {submessage && (
          <p className="text-gray-600 text-sm animate-pulse">
            {submessage}
          </p>
        )}

        {/* Progress dots */}
        <div className="flex justify-center space-x-2 mt-6">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};
