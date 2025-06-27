import React, { createContext, useState } from 'react';
import { useAuthProvider, AuthContext } from './hooks/useAuth';
import { useLanguageProvider, LanguageContext } from './hooks/useLanguage';
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

function AppContent() {
  const { user, isLoading, isAuthenticated, hasModuleAccess } = useAuthProvider();
  const [activeModule, setActiveModule] = useState('dashboard');

  // Force immediate re-render when authentication state changes
  React.useEffect(() => {
    if (isAuthenticated && user) {
      console.log('User authenticated, setting dashboard as active module');
      setActiveModule('dashboard');
      // Force a re-render by updating the component state
      setTimeout(() => {
        console.log('Authentication complete, user should see dashboard');
      }, 100);
    }
  }, [isAuthenticated, user]);

  // Reset active module when user logs out
  React.useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      console.log('User logged out, resetting to dashboard');
      setActiveModule('dashboard');
    }
  }, [isAuthenticated, isLoading]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('App is loading, checking authentication...');
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated || !user) {
    console.log('User not authenticated, showing login form');
    return <LoginForm />;
  }

  console.log('User is authenticated, showing main application for:', user.name);

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
      case 'clients':
        return hasModuleAccess('clients') ? <ClientMasterData /> : <AccessDenied />;
      case 'users':
        return hasModuleAccess('users') ? <UserManagement /> : <AccessDenied />;
      case 'yard':
        return hasModuleAccess('yard') ? <YardManagement /> : <AccessDenied />;
      case 'stack-management':
        return hasModuleAccess('yard') ? <StackManagementModule /> : <AccessDenied />;
      case 'module-access':
        return hasModuleAccess('moduleAccess') ? <ModuleAccessManagement /> : <AccessDenied />;
      case 'reports':
        return hasModuleAccess('reports') ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Reports Module</h3>
            <p className="text-gray-600">Coming soon...</p>
          </div>
        ) : <AccessDenied />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}

const AccessDenied: React.FC = () => (
  <div className="text-center py-12">
    <div className="h-12 w-12 text-red-400 mx-auto mb-4">🚫</div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
    <p className="text-gray-600">You don't have permission to access this module.</p>
    <p className="text-sm text-gray-500 mt-2">Contact your administrator to request access.</p>
  </div>
);

// Dedicated Stack Management Module Component with complete yard data
const StackManagementModule: React.FC = () => {
  // Complete mock yard data matching YardManagement
  const createCompleteDepotTantarelli = () => {
    const sections = [];
    const allStacks = [];
    
    // Top Section (Blue) - Stack 01 to 31
    const topSection = {
      id: 'section-top',
      name: 'Top Section',
      yardId: 'depot-tantarelli',
      stacks: [],
      position: { x: 0, y: 0, z: 0 },
      dimensions: { width: 400, length: 120 },
      color: '#3b82f6'
    };

    const topStacks = [
      { stackNumber: 1, rows: 4, x: 20, y: 20 },
      { stackNumber: 3, rows: 5, x: 50, y: 20 },
      { stackNumber: 5, rows: 5, x: 80, y: 20 },
      { stackNumber: 7, rows: 5, x: 110, y: 20 },
      { stackNumber: 9, rows: 5, x: 140, y: 20 },
      { stackNumber: 11, rows: 5, x: 170, y: 20 },
      { stackNumber: 13, rows: 5, x: 200, y: 20 },
      { stackNumber: 15, rows: 5, x: 230, y: 20 },
      { stackNumber: 17, rows: 5, x: 260, y: 20 },
      { stackNumber: 19, rows: 5, x: 290, y: 20 },
      { stackNumber: 21, rows: 5, x: 320, y: 20 },
      { stackNumber: 23, rows: 5, x: 350, y: 20 },
      { stackNumber: 25, rows: 5, x: 20, y: 60 },
      { stackNumber: 27, rows: 5, x: 50, y: 60 },
      { stackNumber: 29, rows: 5, x: 80, y: 60 },
      { stackNumber: 31, rows: 7, x: 110, y: 60 }
    ];

    topStacks.forEach(stack => {
      const yardStack = {
        id: `stack-${stack.stackNumber}`,
        stackNumber: stack.stackNumber,
        sectionId: topSection.id,
        rows: stack.rows,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * (stack.rows * 5)),
        capacity: stack.rows * 5,
        position: { x: stack.x, y: stack.y, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: true
      };
      yardStack.capacity = yardStack.rows * yardStack.maxTiers;
      allStacks.push(yardStack);
    });

    topSection.stacks = allStacks.filter(s => s.sectionId === topSection.id);

    // Center Section (Orange) - Stack 33 to 55
    const centerSection = {
      id: 'section-center',
      name: 'Center Section',
      yardId: 'depot-tantarelli',
      stacks: [],
      position: { x: 0, y: 140, z: 0 },
      dimensions: { width: 400, length: 100 },
      color: '#f59e0b'
    };

    const centerStacks = [
      { stackNumber: 33, rows: 5, x: 20, y: 160 },
      { stackNumber: 35, rows: 5, x: 50, y: 160 },
      { stackNumber: 37, rows: 5, x: 80, y: 160 },
      { stackNumber: 39, rows: 5, x: 110, y: 160 },
      { stackNumber: 41, rows: 4, x: 140, y: 160 },
      { stackNumber: 43, rows: 4, x: 170, y: 160 },
      { stackNumber: 45, rows: 4, x: 200, y: 160 },
      { stackNumber: 47, rows: 4, x: 230, y: 160 },
      { stackNumber: 49, rows: 4, x: 260, y: 160 },
      { stackNumber: 51, rows: 4, x: 290, y: 160 },
      { stackNumber: 53, rows: 4, x: 320, y: 160 },
      { stackNumber: 55, rows: 4, x: 350, y: 160 }
    ];

    centerStacks.forEach(stack => {
      const yardStack = {
        id: `stack-${stack.stackNumber}`,
        stackNumber: stack.stackNumber,
        sectionId: centerSection.id,
        rows: stack.rows,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * (stack.rows * 5)),
        capacity: stack.rows * 5,
        position: { x: stack.x, y: stack.y, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: true
      };
      yardStack.capacity = yardStack.rows * yardStack.maxTiers;
      allStacks.push(yardStack);
    });

    centerSection.stacks = allStacks.filter(s => s.sectionId === centerSection.id);

    // Bottom Section (Green) - Stack 61 to 103
    const bottomSection = {
      id: 'section-bottom',
      name: 'Bottom Section',
      yardId: 'depot-tantarelli',
      stacks: [],
      position: { x: 0, y: 260, z: 0 },
      dimensions: { width: 400, length: 140 },
      color: '#10b981'
    };

    const bottomStacks = [
      // High capacity stacks (6 rows)
      { stackNumber: 61, rows: 6, x: 20, y: 280 },
      { stackNumber: 63, rows: 6, x: 50, y: 280 },
      { stackNumber: 65, rows: 6, x: 80, y: 280 },
      { stackNumber: 67, rows: 6, x: 110, y: 280 },
      { stackNumber: 69, rows: 6, x: 140, y: 280 },
      { stackNumber: 71, rows: 6, x: 170, y: 280 },
      // Standard stacks (4 rows)
      { stackNumber: 73, rows: 4, x: 200, y: 280 },
      { stackNumber: 75, rows: 4, x: 230, y: 280 },
      { stackNumber: 77, rows: 4, x: 260, y: 280 },
      { stackNumber: 79, rows: 4, x: 290, y: 280 },
      { stackNumber: 81, rows: 4, x: 320, y: 280 },
      { stackNumber: 83, rows: 4, x: 350, y: 280 },
      { stackNumber: 85, rows: 4, x: 20, y: 320 },
      { stackNumber: 87, rows: 4, x: 50, y: 320 },
      { stackNumber: 89, rows: 4, x: 80, y: 320 },
      { stackNumber: 91, rows: 4, x: 110, y: 320 },
      { stackNumber: 93, rows: 4, x: 140, y: 320 },
      { stackNumber: 95, rows: 4, x: 170, y: 320 },
      { stackNumber: 97, rows: 4, x: 200, y: 320 },
      { stackNumber: 99, rows: 4, x: 230, y: 320 },
      // Special stacks
      { stackNumber: 101, rows: 1, x: 260, y: 320 },
      { stackNumber: 103, rows: 2, x: 290, y: 320 }
    ];

    bottomStacks.forEach(stack => {
      const yardStack = {
        id: `stack-${stack.stackNumber}`,
        stackNumber: stack.stackNumber,
        sectionId: bottomSection.id,
        rows: stack.rows,
        maxTiers: 5,
        currentOccupancy: Math.floor(Math.random() * (stack.rows * 5)),
        capacity: stack.rows * 5,
        position: { x: stack.x, y: stack.y, z: 0 },
        dimensions: { width: 12, length: 6 },
        containerPositions: [],
        isOddStack: true
      };
      yardStack.capacity = yardStack.rows * yardStack.maxTiers;
      allStacks.push(yardStack);
    });

    bottomSection.stacks = allStacks.filter(s => s.sectionId === bottomSection.id);

    sections.push(topSection, centerSection, bottomSection);

    return {
      id: 'depot-tantarelli',
      name: 'Depot Tantarelli',
      description: 'Main container depot with specialized odd-numbered stack layout',
      location: 'Tantarelli Port Complex',
      isActive: true,
      totalCapacity: allStacks.reduce((sum, stack) => sum + stack.capacity, 0),
      currentOccupancy: allStacks.reduce((sum, stack) => sum + stack.currentOccupancy, 0),
      sections,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      layout: 'tantarelli'
    };
  };

  const [selectedYard] = React.useState(createCompleteDepotTantarelli());

  const handleConfigurationChange = (configurations: any[]) => {
    console.log('Stack configurations updated:', configurations);
    // In a real app, this would update the backend
  };

  return (
    <StackManagement 
      yard={selectedYard} 
      onConfigurationChange={handleConfigurationChange}
    />
  );
};

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