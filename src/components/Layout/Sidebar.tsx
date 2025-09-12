import React from 'react';
import {
  LayoutDashboard,
  Container,
  FileText,
  Send,
  LogIn,
  LogOut as LogOutIcon,
  BarChart3,
  Building,
  Users,
  Grid3X3,
  Shield,
  Settings
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule }) => {
  const { user, hasModuleAccess } = useAuth();
  const { t } = useLanguage();

  // Reordered menu items by priority and workflow dependencies
  const allMenuItems = [
    // 1. Dashboard - Always first
    { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), moduleKey: 'dashboard' as const },

    // 2. Gate In - First operational step
    { id: 'gate-in', icon: LogIn, label: 'Gate In', moduleKey: 'gateIn' as const },

    // 3. Release Orders - Must be created before Gate Out
    { id: 'releases', icon: FileText, label: 'Booking Reference', moduleKey: 'releases' as const },

    // 4. Gate Out - Depends on Release Orders
    { id: 'gate-out', icon: LogOutIcon, label: 'Gate Out', moduleKey: 'gateOut' as const },

    // 5. Containers - Overview after operations
    { id: 'containers', icon: Container, label: t('nav.containers'), moduleKey: 'containers' as const },

    // 6. Supporting modules
    { id: 'edi', icon: Send, label: t('nav.edi'), moduleKey: 'edi' as const },
    { id: 'yard', icon: Grid3X3, label: 'Yard Management', moduleKey: 'yard' as const },
    { id: 'depot-management', icon: Building, label: 'Depot Management', moduleKey: 'depotManagement' as const },
    { id: 'stack-management', icon: Settings, label: 'Stack Management', moduleKey: 'yard' as const },
    { id: 'client-pools', icon: Users, label: 'Client Pools', moduleKey: 'clients' as const },
    { id: 'reports', icon: BarChart3, label: t('nav.reports'), moduleKey: 'reports' as const },

    // 7. Management modules
    { id: 'clients', icon: Users, label: 'Client Master Data', moduleKey: 'clients' as const },

    // 8. Administrative modules (bottom)
    { id: 'users', icon: Users, label: 'User Management', moduleKey: 'users' as const, priority: 11 },
    { id: 'module-access', icon: Shield, label: 'Module Access', moduleKey: 'moduleAccess' as const }
  ];

  // Filter menu items based on user's module access and sort by priority
  const getMenuItems = () => {
    if (!user) return [];

    return allMenuItems
      .filter(item => {
        // Always show dashboard
        if (item.id === 'dashboard') return true;

        // Check if user has access to this module
        return hasModuleAccess(item.moduleKey);
      })
  };

  const menuItems = getMenuItems();

  return (
    <aside className="bg-slate-900 text-white w-72 h-screen flex flex-col">
      {/* Header - Fixed with proper spacing */}
      <div className="p-6 pb-4 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Container className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">MANTRA IVOIRE</h2>
            <p className="text-xs text-slate-400">Depot Management System (DMS)</p>
          </div>
        </div>
      </div>

      {/* Navigation - Scrollable with transparent scrollbar */}
      <nav className="flex-1 px-4 pt-2 overflow-y-auto scrollbar-transparent">
        <ul className="space-y-2 pb-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveModule(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="font-medium">{item.label}</span>

                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Fixed */}
      <div className="p-4 border-t border-slate-800 flex-shrink-0">
        <div className="text-xs text-slate-400">
          <p>© 2025 DepotManager</p>
          <p>Version 1.0.0</p>
          {user && (
            <p className="mt-2 text-slate-300">
              Logged in as: {user.role}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};
