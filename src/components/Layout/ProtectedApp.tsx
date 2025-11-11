import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useYardProvider, YardContext } from '../../hooks/useYard';
import { useModuleAccessSync } from '../../hooks/useModuleAccessSync';
import { useGlobalStore } from '../../store/useGlobalStore';
import { FullScreenLoader } from '../Common/FullScreenLoader';
import { logger } from '../../utils/logger';

// Lazy load components for better performance
const DashboardOverview = React.lazy(() => import('../Dashboard/DashboardOverview').then(module => ({ default: module.DashboardOverview })));
const ContainerList = React.lazy(() => import('../Containers/ContainerList').then(module => ({ default: module.ContainerList })));
const GateIn = React.lazy(() => import('../Gates/GateIn').then(module => ({ default: module.GateIn })));
const GateOut = React.lazy(() => import('../Gates/GateOut').then(module => ({ default: module.GateOut })));
const ReleaseOrderList = React.lazy(() => import('../ReleaseOrders/ReleaseOrderList').then(module => ({ default: module.ReleaseOrderList })));
const EDIManagement = React.lazy(() => import('../EDI/EDIManagement').then(module => ({ default: module.default })));
const YardManagement = React.lazy(() => import('../Yard/YardManagement').then(module => ({ default: module.YardManagement })));
const ClientMasterData = React.lazy(() => import('../Clients/ClientMasterData').then(module => ({ default: module.ClientMasterData })));
const UserManagement = React.lazy(() => import('../Users/UserManagement').then(module => ({ default: module.UserManagement })));
const DepotManagement = React.lazy(() => import('../Yard/DepotManagement/DepotManagement').then(module => ({ default: module.DepotManagement })));
const StackManagement = React.lazy(() => import('../Yard/StackManagement/StackManagement').then(module => ({ default: module.StackManagement })));
const ClientPoolManagement = React.lazy(() => import('../ClientPools/ClientPoolManagement').then(module => ({ default: module.ClientPoolManagement })));
const ModuleAccessManagement = React.lazy(() => import('../ModuleAccess/ModuleAccessManagement').then(module => ({ default: module.ModuleAccessManagement })));
const ReportsModule = React.lazy(() => import('../Reports/ReportsModule').then(module => ({ default: module.ReportsModule })));
const Header = React.lazy(() => import('./Header').then(module => ({ default: module.Header })));
const Sidebar = React.lazy(() => import('./Sidebar').then(module => ({ default: module.Sidebar })));

// Access Denied Component
const AccessDenied: React.FC = () => (
  <div className="text-center py-12">
    <div className="h-12 w-12 text-red-400 mx-auto mb-4">🚫</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
    <p className="text-gray-600">
      You don't have permission to access this module.
    </p>
    <p className="text-sm text-gray-500 mt-2">
      Contact your administrator to request access.
    </p>
  </div>
);

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated, user } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <FullScreenLoader message="Authenticating..." submessage="Please wait" />;
  }

  // Redirect to login if not authenticated or if authentication failed
  if (!isAuthenticated || !user) {
    logger.info('User not authenticated, redirecting to login', 'ProtectedRoute');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const ProtectedApp: React.FC = () => {
  const { user, hasModuleAccess } = useAuth();
  const yardProvider = useYardProvider();
  const { hasPermissionUpdate } = useModuleAccessSync();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const initializeStore = useGlobalStore(state => state.initializeStore);

  // Initialize store when user is available
  useEffect(() => {
    if (user?.id) {
      initializeStore();
    }
  }, [user?.id]);

  // Show full screen loader while yard context is loading
  if (yardProvider.isLoading) {
    return <FullScreenLoader message="Loading Yard..." submessage="Initializing your workspace" />;
  }

  // Show error if yard loading failed
  if (yardProvider.error) {
    logger.error('Yard loading failed', 'ProtectedApp', { error: yardProvider.error });
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderModule = () => {
    // Check module access before rendering
    switch (activeModule) {
      case 'dashboard':
        return hasModuleAccess('dashboard') ? <DashboardOverview /> : <AccessDenied />;
      case 'containers':
        return hasModuleAccess('containers') ? <ContainerList /> : <AccessDenied />;
      case 'gate-in':
        return hasModuleAccess('gateIn') ? <GateIn /> : <AccessDenied />;
      case 'gate-out':
        return hasModuleAccess('gateOut') ? <GateOut /> : <AccessDenied />;
      case 'releases':
        return hasModuleAccess('releases') ? <ReleaseOrderList /> : <AccessDenied />;
      case 'edi':
        return hasModuleAccess('edi') ? <EDIManagement /> : <AccessDenied />;
      case 'yard-management':
        return hasModuleAccess('yard') ? <YardManagement /> : <AccessDenied />;
      case 'clients':
        return hasModuleAccess('clients') ? <ClientMasterData /> : <AccessDenied />;
      case 'users':
        return hasModuleAccess('users') ? <UserManagement /> : <AccessDenied />;
      case 'depot-management':
        return hasModuleAccess('depotManagement') ? <DepotManagement /> : <AccessDenied />;
      case 'stack-management':
        return hasModuleAccess('stackManagement') ? <StackManagement /> : <AccessDenied />;
      case 'client-pools':
        return hasModuleAccess('clients') ? <ClientPoolManagement /> : <AccessDenied />;
      case 'module-access':
        return hasModuleAccess('moduleAccess') ? <ModuleAccessManagement /> : <AccessDenied />;
      case 'reports':
        return hasModuleAccess('reports') ? <ReportsModule /> : <AccessDenied />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <ProtectedRoute>
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
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">{renderModule()}</main>
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
    </ProtectedRoute>
  );
};

export default ProtectedApp;
