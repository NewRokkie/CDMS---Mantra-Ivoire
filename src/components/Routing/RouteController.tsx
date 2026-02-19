import React, { Suspense, lazy } from 'react';

import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { FullScreenLoader } from '../Common/FullScreenLoader';
import { useModuleRouting } from '../../hooks/useModuleRouting';
import { EDIFileProvider } from '../../contexts/EDIFileContext';

// Lazy load module components
const DashboardOverview = lazy(() => import('../Dashboard/DashboardOverview').then(module => ({ default: module.DashboardOverview })));
const GateIn = lazy(() => import('../Gates/GateIn').then(module => ({ default: module.GateIn })));
const GateOut = lazy(() => import('../Gates/GateOut').then(module => ({ default: module.GateOut })));
const ReleaseOrderList = lazy(() => import('../ReleaseOrders/ReleaseOrderList').then(module => ({ default: module.ReleaseOrderList })));
const EDIManagement = lazy(() => import('../EDI/EDIManagement').then(module => ({ default: module.default })));
const YardManagement = lazy(() => import('../Yard/YardManagement').then(module => ({ default: module.YardManagement })));
const ClientMasterData = lazy(() => import('../Clients/ClientMasterData').then(module => ({ default: module.ClientMasterData })));
const UserManagement = lazy(() => import('../Users/UserManagement').then(module => ({ default: module.UserManagement })));
const DepotManagement = lazy(() => import('../Yard/DepotManagement/DepotManagement').then(module => ({ default: module.DepotManagement })));
const StackManagement = lazy(() => import('../Yard/StackManagement/StackManagement').then(module => ({ default: module.StackManagement })));
const ClientPoolManagement = lazy(() => import('../ClientPools/ClientPoolManagement').then(module => ({ default: module.ClientPoolManagement })));
const ModuleAccessManagement = lazy(() => import('../ModuleAccess/ModuleAccessManagement').then(module => ({ default: module.ModuleAccessManagement })));
const ReportsModule = lazy(() => import('../Reports/ReportsModule').then(module => ({ default: module.ReportsModule })));
const ContainerList = lazy(() => import('../Containers/ContainerList').then(module => ({ default: module.ContainerList })));



/**
 * RouteController handles all module-level routing with:
 * - Permission-based access control
 * - Lazy loading for performance
 * - Module URL synchronization
 * - Fallback handling for unauthorized access
 */
export const RouteController: React.FC = () => {
  const { activeModule } = useModuleRouting();

  // Centralized fallback for all lazy loaded components
  const RouteFallback = () => (
    <div className="flex-1 h-full min-h-[400px]">
      <FullScreenLoader
        message="Loading Module..."
        submessage={`Loading ${activeModule.replace('-', ' ')} module...`}
      />
    </div>
  );

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Main Application Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute moduleKey="dashboard">
              <DashboardOverview />
            </ProtectedRoute>
          }
        />

        <Route
          path="/gate-in"
          element={
            <ProtectedRoute moduleKey="gateIn">
              <GateIn />
            </ProtectedRoute>
          }
        />

        <Route
          path="/gate-out"
          element={
            <ProtectedRoute moduleKey="gateOut">
              <GateOut />
            </ProtectedRoute>
          }
        />

        <Route
          path="/booking"
          element={
            <ProtectedRoute moduleKey="releases">
              <ReleaseOrderList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/containers"
          element={
            <ProtectedRoute moduleKey="containers">
              <ContainerList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/yard"
          element={
            <ProtectedRoute moduleKey="yard">
              <YardManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/edi"
          element={
            <ProtectedRoute moduleKey="edi">
              <EDIFileProvider>
                <EDIManagement />
              </EDIFileProvider>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute moduleKey="reports">
              <ReportsModule />
            </ProtectedRoute>
          }
        />

        {/* Configuration Routes */}
        <Route
          path="/config/depot"
          element={
            <ProtectedRoute moduleKey="depotManagement">
              <DepotManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/config/stacks"
          element={
            <ProtectedRoute moduleKey="stackManagement">
              <StackManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/config/client-pools"
          element={
            <ProtectedRoute moduleKey="clientPools">
              <ClientPoolManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/config/clients"
          element={
            <ProtectedRoute moduleKey="clients">
              <ClientMasterData />
            </ProtectedRoute>
          }
        />

        <Route
          path="/config/users"
          element={
            <ProtectedRoute moduleKey="users">
              <UserManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/config/module-access"
          element={
            <ProtectedRoute moduleKey="moduleAccess">
              <ModuleAccessManagement />
            </ProtectedRoute>
          }
        />

        {/* Default route - redirect to dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute moduleKey="dashboard">
              <DashboardOverview />
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route
          path="*"
          element={
            <ProtectedRoute moduleKey="dashboard">
              <DashboardOverview />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
};