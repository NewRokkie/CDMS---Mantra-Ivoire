import React, { useState } from 'react';
import { Database, RefreshCw, AlertCircle, Wifi, WifiOff, Settings } from 'lucide-react';

interface DatabaseErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
  context?: string;
  showTechnicalDetails?: boolean;
}

export const DatabaseErrorFallback: React.FC<DatabaseErrorFallbackProps> = ({
  error,
  onRetry,
  context = 'Database Operation',
  showTechnicalDetails = false
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(showTechnicalDetails);

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const getErrorType = (error?: Error): 'connection' | 'migration' | 'permission' | 'unknown' => {
    if (!error) return 'unknown';
    
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return 'connection';
    }
    
    if (message.includes('column') || message.includes('table') || message.includes('schema')) {
      return 'migration';
    }
    
    if (message.includes('permission') || message.includes('policy') || message.includes('unauthorized')) {
      return 'permission';
    }
    
    return 'unknown';
  };

  const getErrorConfig = (errorType: string) => {
    switch (errorType) {
      case 'connection':
        return {
          icon: WifiOff,
          title: 'Connection Error',
          message: 'Unable to connect to the database. Please check your internet connection and try again.',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          canRetry: true
        };
      case 'migration':
        return {
          icon: Database,
          title: 'Database Schema Issue',
          message: 'The database schema appears to be outdated or incomplete. Please contact your administrator.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          canRetry: false
        };
      case 'permission':
        return {
          icon: Settings,
          title: 'Permission Denied',
          message: 'You do not have the required permissions to access this data. Please contact your administrator.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          canRetry: false
        };
      default:
        return {
          icon: AlertCircle,
          title: 'Database Error',
          message: 'An unexpected database error occurred. Our team has been notified.',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          canRetry: true
        };
    }
  };

  const errorType = getErrorType(error);
  const config = getErrorConfig(errorType);
  const IconComponent = config.icon;

  return (
    <div className={`rounded-xl border-2 p-8 ${config.bgColor} ${config.borderColor} max-w-2xl mx-auto`}>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white mb-6">
          <IconComponent className={`h-8 w-8 ${config.color}`} />
        </div>
        
        <h2 className={`text-xl font-bold mb-4 ${config.color}`}>
          {config.title}
        </h2>
        
        <p className="text-gray-700 mb-6 leading-relaxed">
          {config.message}
        </p>

        {/* Context Information */}
        {context && (
          <div className="bg-white/50 rounded-lg p-3 mb-6 text-sm">
            <p className="font-medium text-gray-800">
              Failed Operation: <span className="font-normal">{context}</span>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          {config.canRetry && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Reload Page</span>
          </button>
        </div>

        {/* Technical Details Toggle */}
        {error && (
          <div className="border-t border-white/20 pt-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
            </button>
          </div>
        )}
      </div>

      {/* Technical Details */}
      {showDetails && error && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Technical Information</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium text-gray-700">Error Type:</span>
              <span className="ml-2 text-gray-600">{errorType}</span>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Message:</span>
              <pre className="mt-1 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                {error.message}
              </pre>
            </div>
            
            <div>
              <span className="font-medium text-gray-700">Timestamp:</span>
              <span className="ml-2 text-gray-600">{new Date().toISOString()}</span>
            </div>
            
            {context && (
              <div>
                <span className="font-medium text-gray-700">Context:</span>
                <span className="ml-2 text-gray-600">{context}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Specific fallback for user management operations
export const UserManagementErrorFallback: React.FC<{
  error?: Error;
  onRetry?: () => void;
  operation?: 'loading' | 'creating' | 'updating' | 'deleting' | 'restoring';
}> = ({ error, onRetry, operation = 'loading' }) => {
  const operationMessages = {
    loading: 'Loading Users',
    creating: 'Creating User',
    updating: 'Updating User',
    deleting: 'Deleting User',
    restoring: 'Restoring User'
  };

  return (
    <DatabaseErrorFallback
      error={error}
      onRetry={onRetry}
      context={`User Management - ${operationMessages[operation]}`}
      showTechnicalDetails={process.env.NODE_ENV === 'development'}
    />
  );
};

// Migration-specific error fallback
export const MigrationErrorFallback: React.FC<{
  error?: Error;
  onRetry?: () => void;
  migrationName?: string;
}> = ({ error, onRetry, migrationName }) => {
  return (
    <div className="rounded-xl border-2 p-8 bg-red-50 border-red-200 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white mb-6">
          <Database className="h-8 w-8 text-red-600" />
        </div>
        
        <h2 className="text-xl font-bold mb-4 text-red-600">
          Database Migration Required
        </h2>
        
        <p className="text-gray-700 mb-6 leading-relaxed">
          The database schema needs to be updated to support the latest features. 
          Please contact your system administrator to run the required migrations.
        </p>

        {migrationName && (
          <div className="bg-white/50 rounded-lg p-3 mb-6 text-sm">
            <p className="font-medium text-gray-800">
              Required Migration: <code className="bg-white px-2 py-1 rounded">{migrationName}</code>
            </p>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">For Administrators:</h3>
          <div className="text-sm text-yellow-700 text-left space-y-1">
            <p>1. Run: <code className="bg-yellow-100 px-1 rounded">npm run deploy-migrations</code></p>
            <p>2. Or manually apply: <code className="bg-yellow-100 px-1 rounded">supabase db push</code></p>
            <p>3. Verify migration status in the database</p>
          </div>
        </div>

        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Check Again</span>
          </button>
        )}

        {error && process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              Technical Details
            </summary>
            <pre className="mt-2 bg-white p-3 rounded text-xs overflow-x-auto border">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};