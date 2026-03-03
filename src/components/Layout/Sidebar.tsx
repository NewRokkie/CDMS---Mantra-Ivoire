import React, { useState } from 'react';
import { LayoutDashboard, Container, FileText, Send, LogIn, LogOut as LogOutIcon, BarChart3, Building, Users, Grid3x3 as Grid3X3, Shield, Settings, ChevronRight, Cog, X, LucideIcon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage'; // Refreshed hook reference
import { ModuleAccess } from '../../types';
import { SyncStatusIndicator } from '../Sync';
import { handleError } from '../../services/errorHandling';

interface MenuItem {
  id: string;
  icon: LucideIcon;
  label: string;
  moduleKey: keyof ModuleAccess;
}

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  isMobileMenuOpen: externalIsMobileMenuOpen,
  setIsMobileMenuOpen: externalSetIsMobileMenuOpen
}) => {
  const { user, hasModuleAccess, refreshModuleAccess } = useAuth();
  const { t } = useLanguage();

  // Force re-render when user module access changes
  const userModuleAccessKey = user?.moduleAccess ? JSON.stringify(user.moduleAccess) : 'no-access';

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfigurationsOpen, setIsConfigurationsOpen] = useState(false);
  const navRef = React.useRef<HTMLElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);



  // Manual refresh handler
  const handleManualRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refreshModuleAccess();
    } catch (error) {
      handleError(error, 'Sidebar.handleManualRefresh');
    } finally {
      setIsRefreshing(false);
    }
  };

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

  // Save scroll position before navigation
  const saveScrollPosition = () => {
    if (navRef.current) {
      setScrollPosition(navRef.current.scrollTop);
    }
  };

  // Restore scroll position after navigation
  React.useEffect(() => {
    if (navRef.current && scrollPosition > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (navRef.current) {
          navRef.current.scrollTop = scrollPosition;
        }
      });
    }
  }, [activeModule, isConfigurationsOpen]);
  // Main menu items (not in configurations)
  const mainMenuItems: MenuItem[] = [
    // 1. Dashboard - Always first
    { id: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), moduleKey: 'dashboard' as const },

    // 2. Gate In - First operational step
    { id: 'gate-in', icon: LogIn, label: t('nav.gateIn'), moduleKey: 'gateIn' as const },

    // 3. Release Orders - Must be created before Gate Out
    { id: 'releases', icon: FileText, label: t('nav.bookingReference'), moduleKey: 'releases' as const },

    // 4. Gate Out - Depends on Release Orders
    { id: 'gate-out', icon: LogOutIcon, label: t('nav.gateOut'), moduleKey: 'gateOut' as const },

    // 5. Containers - Overview after operations
    { id: 'containers', icon: Container, label: t('nav.containers'), moduleKey: 'containers' as const },

    // 6. Yard Management - Visual yard overview
    { id: 'yard-management', icon: Grid3X3, label: t('nav.yard'), moduleKey: 'yard' as const },

    // 7. Supporting modules
    { id: 'edi', icon: Send, label: t('nav.edi'), moduleKey: 'edi' as const },
    { id: 'reports', icon: BarChart3, label: t('nav.reports'), moduleKey: 'reports' as const }
  ];

  // Configuration submenu items
  const configurationMenuItems: MenuItem[] = [
    { id: 'depot-management', icon: Building, label: 'Depot Management', moduleKey: 'depotManagement' as const },
    { id: 'stack-management', icon: Settings, label: 'Stack Management', moduleKey: 'stackManagement' as const },
    { id: 'client-pools', icon: Users, label: 'Client Pools', moduleKey: 'clientPools' as const },
    { id: 'clients', icon: Users, label: 'Client Master Data', moduleKey: 'clients' as const },
    { id: 'users', icon: Users, label: 'User Management', moduleKey: 'users' as const },
    { id: 'module-access', icon: Shield, label: 'Module Access', moduleKey: 'moduleAccess' as const }
  ];

  // Filter menu items based on user's module access
  const getFilteredMenuItems = (items: MenuItem[]) => {
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
    saveScrollPosition();
    setIsConfigurationsOpen(!isConfigurationsOpen);
  };

  const handleConfigurationItemClick = (itemId: string) => {
    saveScrollPosition();
    // Use the routing hook's setActiveModule - cast to any to support options parameter
    (setActiveModule as any)(itemId, { replace: false });
    // Close mobile menu when a configuration item is clicked
    if (externalSetIsMobileMenuOpen) {
      externalSetIsMobileMenuOpen(false);
    }
  };

  const handleMainMenuClick = (itemId: string) => {
    saveScrollPosition();
    // Use the routing hook's setActiveModule - cast to any to support options parameter
    (setActiveModule as any)(itemId, { replace: false });
    // Close mobile menu when an item is clicked
    if (externalSetIsMobileMenuOpen) {
      externalSetIsMobileMenuOpen(false);
    }
  };

  // Use external state if provided, otherwise use local state
  const [localIsMobileMenuOpen, setLocalIsMobileMenuOpen] = useState(false);
  const isMobileMenuOpen = externalIsMobileMenuOpen !== undefined ? externalIsMobileMenuOpen : localIsMobileMenuOpen;
  const setIsMobileMenuOpen = externalSetIsMobileMenuOpen || setLocalIsMobileMenuOpen;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-fadeIn"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside key={userModuleAccessKey} className={`
        bg-white text-slate-800 h-screen flex flex-col border-r border-slate-200 shadow-sm
        lg:w-72 lg:relative lg:translate-x-0
        fixed top-0 left-0 w-80 z-40 transition-all duration-300 ease-out
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-slate-400 hover:text-accent-teal transition-colors z-10"
        >
          <X className="h-6 w-6" />
        </button>
        {/* Header - Fixed with proper spacing */}
        <div className="p-6 pb-2 flex-shrink-0">
          <div className="flex items-center space-x-3 mb-6">
            <div className="h-10 w-10 bg-transparent flex items-center justify-center">
              <img src="/assets/logo_favicon.ico" alt="Logo" className="h-10 w-10" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="font-gilroy-bold text-lg tracking-tight text-slate-900 leading-none">
                MANTRA <span className="text-olam-dark">IVOIRE</span>
              </h2>
              <p className="text-[10px] uppercase tracking-wider font-gilroy-bold text-slate-400 mt-1">Depot Management System</p>
            </div>
          </div>

          {/* Sync Status Indicator */}
          <div className="mt-4">
            <SyncStatusIndicator
              showDetails={true}
              size="sm"
              onRefresh={handleManualRefresh}
            />
          </div>
        </div>

        {/* Navigation - Scrollable with transparent scrollbar */}
        <nav ref={navRef} className="flex-1 px-4 pt-2 overflow-y-auto scrollbar-transparent">
          <ul className="space-y-2 pb-4">
            {/* Main Menu Items */}
            {filteredMainMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;

              return (
                <li key={item.id}>
                  {(item.id === 'edi' || item.id === 'reports') && (
                    <div className="py-2">
                      <div className="h-px bg-slate-100 mx-4"></div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      handleMainMenuClick(item.id);
                    }}
                    className={`w-full relative flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 group ${isActive
                      ? 'bg-[#F0F9FA] text-accent-teal'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-olam-green rounded-r-md"></div>
                    )}
                    <Icon className={`h-[22px] w-[22px] flex-shrink-0 ${isActive ? 'text-accent-teal' : 'text-slate-400 group-hover:text-accent-teal transition-colors'}`} />
                    <span className={`text-sm ${isActive ? 'font-gilroy-bold text-accent-teal' : 'font-gilroy-medium'}`}>{item.label}</span>
                  </button>
                </li>
              );
            })}

            {/* Configurations Dropdown */}
            {hasConfigurationAccess && (
              <li className="pt-2">
                <div className="mx-4 my-2 border-t border-slate-100" />
                {/* Configurations Header */}
                <button
                  onClick={() => {
                    handleConfigurationToggle();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${isConfigurationActive
                    ? 'bg-slate-50 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <Cog className={`h-[22px] w-[22px] flex-shrink-0 text-accent-teal`} />
                    <span className="font-gilroy-bold text-sm">Configurations</span>
                  </div>
                  <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isConfigurationsOpen ? 'rotate-90' : ''}`} />
                </button>

                {/* Configurations Submenu */}
                {isConfigurationsOpen && (
                  <ul className="mt-2 ml-4 space-y-1 border-l-2 border-slate-700 pl-4">
                    {filteredConfigurationItems.map((item) => {
                      const isActive = activeModule === item.id;

                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => {
                              handleConfigurationItemClick(item.id);
                            }}
                            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 text-sm ${isActive
                              ? 'bg-slate-50 text-accent-teal font-gilroy-bold'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-gilroy-medium'
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-accent-teal' : 'bg-slate-300'}`}></span>
                            <span>{item.label}</span>
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
        <div className="p-4 border-t border-slate-200 flex-shrink-0 bg-slate-50/50">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-gilroy-bold border border-white shadow-sm">
                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-gilroy-bold text-slate-700 truncate">{user.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">{user.email || 'user@example.com'}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-gilroy-bold uppercase tracking-wider">
            <span>v1.0.0</span>
            <span>© 2025 DepotManager</span>
          </div>
        </div>
      </aside>
    </>
  );
};
