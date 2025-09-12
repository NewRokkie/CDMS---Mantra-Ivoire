import React, { useState } from 'react';
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
  Settings,
  ChevronDown,
  ChevronRight,
  Cog
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
  const [isConfigurationsOpen, setIsConfigurationsOpen] = useState(false);

  // Check if any configuration module is active
  const configurationModules = [
    'depot-management',
    'stack-management', 
    'client-pools',
    'clients',
    'users',
    'module-access'
  ];
  const isConfigurationActive = configurationModules.includes(activeModule);

  // Auto-open configurations dropdown if a configuration module is active
  React.useEffect(() => {
    if (isConfigurationActive) {
      setIsConfigurationsOpen(true);
    }
  }, [isConfigurationActive]);

  // Main menu items (not in configurations)
  const mainMenuItems = [
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
    { id: 'reports', icon: BarChart3, label: t('nav.reports'), moduleKey: 'reports' as const }
  ];

  // Configuration submenu items
  const configurationMenuItems = [
    { id: 'depot-management', icon: Building, label: 'Depot Management', moduleKey: 'depotManagement' as const },
    { id: 'stack-management', icon: Settings, label: 'Stack Management', moduleKey: 'stackManagement' as const },
    { id: 'client-pools', icon: Users, label: 'Client Pools', moduleKey: 'clientPools' as const },
    { id: 'clients', icon: Users, label: 'Client Master Data', moduleKey: 'clients' as const },
    { id: 'users', icon: Users, label: 'User Management', moduleKey: 'users' as const },
    { id: 'module-access', icon: Shield, label: 'Module Access', moduleKey: 'moduleAccess' as const }
  ];

  // Filter menu items based on user's module access
  const getFilteredMenuItems = (items: typeof mainMenuItems) => {
    if (!user) return [];

    return items.filter(item => {
      // Always show dashboard
      if (item.id === 'dashboard') return true;

      // Check if user has access to this module
      return hasModuleAccess(item.moduleKey);
    });
  };

  const filteredMainMenuItems = getFilteredMenuItems(mainMenuItems);
  const filteredConfigurationItems = getFilteredMenuItems(configurationMenuItems);

  // Check if user has access to any configuration modules
  const hasConfigurationAccess = filteredConfigurationItems.length > 0;

  const handleConfigurationToggle = () => {
    setIsConfigurationsOpen(!isConfigurationsOpen);
  };

  const handleConfigurationItemClick = (itemId: string) => {
    setActiveModule(itemId);
    // Keep dropdown open when selecting a configuration item
    setIsConfigurationsOpen(true);
  };

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
          {/* Main Menu Items */}
          {filteredMainMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveModule(item.id);
                  }}
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

          {/* Configurations Dropdown */}
          {hasConfigurationAccess && (
            <li>
              {/* Configurations Header */}
              <button
                onClick={() => {
                  handleConfigurationToggle();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                  isConfigurationActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Cog className={`h-5 w-5 flex-shrink-0 ${isConfigurationActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="font-medium">Configurations</span>
                </div>
                <div className={`transition-transform duration-200 ${isConfigurationsOpen ? 'rotate-90' : ''}`}>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>

              {/* Configurations Submenu */}
              {isConfigurationsOpen && (
                <ul className="mt-2 ml-4 space-y-1 border-l-2 border-slate-700 pl-4">
                  {filteredConfigurationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeModule === item.id;

                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => {
                            handleConfigurationItemClick(item.id);
                          }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 text-sm ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-md transform scale-105'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                          <span className="font-medium">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          )}
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