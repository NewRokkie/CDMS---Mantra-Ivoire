import React from 'react';
import { AlertTriangle, Database, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface FullScreenLoaderProps {
  message?: string;
  submessage?: string;
  showDatabaseWarning?: boolean;
  onRetry?: () => void;
}

export const FullScreenLoader: React.FC<FullScreenLoaderProps> = ({ 
  message = 'Loading...', 
  submessage,
  showDatabaseWarning = false,
  onRetry
}) => {
  const isDatabaseIssue = message.toLowerCase().includes('database') || 
                         message.toLowerCase().includes('connection') ||
                         showDatabaseWarning;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center z-50">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Animated logo or spinner */}
        <div className="relative mb-8">
          {isDatabaseIssue ? (
            <div className="relative">
              <div className="animate-pulse rounded-full h-24 w-24 border-8 border-gray-200 border-t-yellow-500 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 bg-yellow-500 rounded-full opacity-20 animate-ping"></div>
                <Database className="absolute h-8 w-8 text-yellow-600" />
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="animate-spin rounded-full h-24 w-24 border-8 border-gray-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-12 w-12 bg-blue-600 rounded-full opacity-20 animate-pulse"></div>
              </div>
            </div>
          )}
        </div>

        {/* Loading message */}
        <h2 className={`text-2xl font-semibold mb-2 ${isDatabaseIssue ? 'text-yellow-800' : 'text-gray-800'}`}>
          {message}
        </h2>
        
        {submessage && (
          <div className="space-y-2">
            <p className={`text-sm animate-pulse ${isDatabaseIssue ? 'text-yellow-700' : 'text-gray-600'}`}>
              {submessage}
            </p>
            
            {isDatabaseIssue && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-yellow-800 mb-1">
                      Database Connection Issue
                    </p>
                    <p className="text-xs text-yellow-700 leading-relaxed">
                      The database appears to be paused or temporarily unavailable. 
                      This usually resolves automatically within a few minutes.
                    </p>
                    <p className="text-xs text-yellow-600 mt-2">
                      If this persists, please contact support.
                    </p>
                  </div>
                </div>
                
                {onRetry && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={onRetry}
                      className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Connection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress dots */}
        <div className="flex justify-center space-x-2 mt-6">
          <div className={`w-2 h-2 rounded-full animate-bounce ${isDatabaseIssue ? 'bg-yellow-500' : 'bg-blue-600'}`} style={{ animationDelay: '0ms' }}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce ${isDatabaseIssue ? 'bg-yellow-500' : 'bg-blue-600'}`} style={{ animationDelay: '150ms' }}></div>
          <div className={`w-2 h-2 rounded-full animate-bounce ${isDatabaseIssue ? 'bg-yellow-500' : 'bg-blue-600'}`} style={{ animationDelay: '300ms' }}></div>
        </div>

        {/* Connection status indicator */}
        <div className="mt-6 flex items-center justify-center space-x-2 text-xs">
          {isDatabaseIssue ? (
            <>
              <WifiOff className="h-4 w-4 text-yellow-600" />
              <span className="text-yellow-700">Database Connection Issues</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">Connecting...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
