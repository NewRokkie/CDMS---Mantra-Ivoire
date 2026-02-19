import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useYardProvider, YardContext } from '../../hooks/useYard';
import { useModuleAccessSync } from '../../hooks/useModuleAccessSync';
import { useModuleRouting } from '../../hooks/useModuleRouting';
import { useGlobalStore } from '../../store/useGlobalStore';
import { FullScreenLoader } from '../Common/FullScreenLoader';
import { logger } from '../../utils/logger';
import { diagnostics } from '../../utils/diagnostics';
import { AlertCircle, Grid2x2, RefreshCw, Settings, Bug } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

// Lazy load layout components
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { RouteController } from '../Routing/RouteController';

const ProtectedApp: React.FC = () => {
  const { user, hasModuleAccess, isLoading: authLoading, isAuthenticated, authError, isDatabaseConnected, retryConnection } = useAuth();
  const yardProvider = useYardProvider();
  const { hasPermissionUpdate } = useModuleAccessSync();
  const { activeModule, setActiveModule } = useModuleRouting(); // Use routing hook for URL sync
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initializeStore = useGlobalStore(state => state.initializeStore);
  const toast = useToast();

  // Initialize store when user is available
  useEffect(() => {
    if (user?.id) {
      initializeStore();
    }
  }, [user?.id, initializeStore]);

  const handleRefreshYards = async () => {
    setIsRefreshing(true);
    try {
      await yardProvider.refreshYards();
    } catch (error) {
      logger.error('Failed to refresh yards', 'ProtectedApp', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunDiagnostics = async () => {
    const results = await diagnostics.runAllTests();
    console.group('🔍 Diagnostic Results');
    console.log('Connection:', results.connection);
    console.log('Authentication:', results.auth);
    console.log('Yards Access:', results.yards);
    console.log('Summary:', results.summary);
    console.groupEnd();
    toast.info('Diagnostic completed. Check the browser console for detailed information.');
  };

  // Check authentication first - redirect to login if not authenticated
  if (authLoading) {
    let message = "Authenticating...";
    let submessage = "Please wait";
    let showDatabaseWarning = false;
    let onRetry = undefined;

    if (!isDatabaseConnected) {
      message = "Database Connection Issue";
      submessage = "The database appears to be paused or unreachable. Please try again later.";
      showDatabaseWarning = true;
      onRetry = retryConnection;
    } else if (authError) {
      message = "Authentication Error";
      submessage = authError;
    }

    return <FullScreenLoader message={message} submessage={submessage} showDatabaseWarning={showDatabaseWarning} onRetry={onRetry} />;
  }

  if (!isAuthenticated || !user) {
    logger.info('User not authenticated, redirecting to login', 'ProtectedApp');
    return <Navigate to="/login" replace />;
  }

  // Show full screen loader while yard context is loading
  // BUT still provide the YardContext so components don't crash
  if (yardProvider.isLoading) {
    return (
      <YardContext.Provider value={yardProvider}>
        <FullScreenLoader message="Loading Yard..." submessage="Initializing your workspace" />
      </YardContext.Provider>
    );
  }

  // Show error if yard loading failed
  if (yardProvider.error) {
    logger.error('Yard loading failed', 'ProtectedApp', { error: yardProvider.error });
  }

  // If there is no current yard selected, do not allow using the application.
  // Show a blocking screen that forces the user to refresh yards or open Yard Management.
  // Exception: Allow access to yard management even without a current yard
  if (!yardProvider.currentYard && activeModule !== 'yard-management' && activeModule !== 'depot-management') {
    return (
      <YardContext.Provider value={yardProvider}>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 mx-auto mb-4">
            <Grid2x2 />
          </div>

          <h2 className="mb-3 text-2xl font-bold text-gray-900">No Yard Selected</h2>
          <p className="mb-6 text-gray-600 leading-relaxed">You must select a yard to continue using the application.</p>

          {yardProvider.error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-left">{yardProvider.error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 justify-center">
            <div className="flex flex-col sm:flex-row gap-3 justify-evenly">
              <button
                onClick={handleRefreshYards}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700 transition-all duration-200 hover:-translate-y-0.5 shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <RefreshCw className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Yards'}
              </button>
              {hasModuleAccess('yard') && (
                <button
                  onClick={() => setActiveModule('depot-management')}
                  className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 text-white font-medium hover:bg-green-700 transition-all duration-200 hover:-translate-y-0.5 shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <Settings />
                  Create Yard
                </button>
              )}
            </div>

            <button
              onClick={handleRunDiagnostics}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all duration-200"
            >
              <Bug className="h-4 w-4" />
              Run Diagnostics
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-500">
            Need help? <a href="mailto:habib.sayegh@olamnet.com" className="text-blue-600 hover:underline">Contact support</a>
          </p>
        </div>
      </div>
      </YardContext.Provider>
    );
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <YardContext.Provider value={yardProvider}>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          isMobileMenuOpen={isSidebarOpen}
          setIsMobileMenuOpen={setIsSidebarOpen}
        />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
          <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <RouteController />
          </main>
        </div>

        {hasPermissionUpdate && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse z-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Your permissions have been updated!</span>
          </div>
        )}
      </div>
    </YardContext.Provider>
  );
};

export default ProtectedApp;
