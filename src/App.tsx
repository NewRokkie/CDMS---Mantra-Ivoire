import React, { createContext, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthProvider, AuthContext } from './hooks/useAuth';
import { useAuth } from './hooks/useAuth'; // Ensure useAuth is imported if not already
import { useLanguageProvider, LanguageContext } from './hooks/useLanguage';

import { useYardProvider, YardContext } from './hooks/useYard';
import { LoginForm } from './components/Auth/LoginForm';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardOverview } from './components/Dashboard/DashboardOverview';
import { ContainerList } from './components/Containers/ContainerList';
import { ReleaseOrderList } from './components/ReleaseOrders/ReleaseOrderList';
import { EDIManagement } from './components/EDI/EDIManagement';
import { GateIn } from './components/Gates/GateIn';
import { GateOut } from './components/Gates/GateOut';
import { ClientMasterData } from './components/Clients/ClientMasterData';
import { UserManagement } from './components/Users/UserManagement';
import { YardManagement } from './components/Yard/YardManagement';
import { StackManagement } from './components/Yard/StackManagement';
import { ModuleAccessManagement } from './components/ModuleAccess/ModuleAccessManagement';
import { ClientPoolManagement } from './components/ClientPools/ClientPoolManagement';
import { ReportsModule } from './components/Reports/ReportsModule';
import { Yard, YardSection, YardStack } from './types/yard';
import { DepotManagement } from './components/Yard/DepotManagement';
import { DynamicStackManagement } from './components/Yard/DynamicStackManagement';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoading, isAuthenticated, user } = useAuth(); // Changed from useAuthProvider()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function AppContent() {
  const { user, hasModuleAccess } = useAuth(); // Changed from useAuthProvider()
  const yardProvider = useYardProvider();
  const [activeModule, setActiveModule] = useState('dashboard');

  console.log('App render - user:', user?.name, 'activeModule:', activeModule);

  const renderModule = () => {
    console.log('Rendering module:', activeModule);
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
      case 'clients':
        return hasModuleAccess('clients') ? <ClientMasterData /> : <AccessDenied />;
      case 'users':
        return hasModuleAccess('users') ? <UserManagement /> : <AccessDenied />;
      case 'yard':
        return hasModuleAccess('yard') ? <YardManagement /> : <AccessDenied />;
      case 'depot-management':
        return hasModuleAccess('depotManagement') ? <DepotManagement /> : <AccessDenied />;
      case 'stack-management':
        return hasModuleAccess('yard') ? <DynamicStackManagement /> : <AccessDenied />;
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

  const MainApp = () => (
    <YardContext.Provider value={yardProvider}>
      <div className="flex h-screen bg-gray-100 overflow-hidden">
        <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{renderModule()}
          </main>
        </div>
      </div>
    </YardContext.Provider>
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

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

// Dedicated Stack Management Module Component with complete yard data

function App() {
  const authProvider = useAuthProvider();
  const languageProvider = useLanguageProvider();

  return (
    <AuthContext.Provider value={authProvider}>
      <LanguageContext.Provider value={languageProvider}>
        <AppContent />
      </LanguageContext.Provider>
    </AuthContext.Provider>
  );
}

export default App;
