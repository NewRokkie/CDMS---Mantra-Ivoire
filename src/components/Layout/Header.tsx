import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, User, Globe, LogOut, Menu, X, Crown, Star, Eye, Download, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { usePWA } from '../../hooks/usePWA';
import { useTheme } from '../../hooks/useTheme';
import { useTheme } from '../../hooks/useTheme';
import { useLocation } from 'react-router-dom';
import { YardSelector } from './YardSelector';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { isInstallable, install } = usePWA();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const getModuleInstallName = () => {
    const path = location.pathname;
    if (path.startsWith('/gate-in')) return 'Gate In';
    if (path.startsWith('/gate-out')) return 'Gate Out';
    if (path.startsWith('/booking')) return 'Booking';
    return 'CDMS';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className={`bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-3 lg:py-4 relative z-50 ${(isSidebarOpen || isMobileMenuOpen) ? 'lg:block hidden' : 'block'
        }`}>
        <div className="flex items-center justify-between">
          {/* Left Section - Logo (Clickable) & Title */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Logo - Opens Sidebar on Mobile */}
            <button
              onClick={() => {
                if (onToggleSidebar) {
                  onToggleSidebar();
                }
              }}
              className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg hover:bg-blue-700 active:scale-95 transition-all lg:cursor-default lg:hover:bg-blue-600 lg:active:scale-100"
            >
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base lg:text-xl font-gilroy-bold text-gray-900 dark:text-white truncate">
                Container Depot
              </h1>
              <p className="hidden sm:block text-xs lg:text-sm font-gilroy text-gray-600 dark:text-gray-400 truncate">
                {user?.role ? t(`users.role.${user.role}`) : ''}
              </p>
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* PWA Install Button */}
            {isInstallable && (
              <button
                onClick={install}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md animate-bounce-subtle"
              >
                <Download className="h-4 w-4" />
                <span className="hidden md:inline font-gilroy-medium text-sm">{t('common.install')} {getModuleInstallName()}</span>
              </button>
            )}

            {/* Yard Selector - Mobile & Desktop */}
            <div className="lg:block">
              <YardSelector />
            </div>

            {/* Desktop Actions - Hidden on mobile */}
            <div className="hidden lg:flex items-center space-x-2">
              {/* Dark/Light Mode Toggle */}
              <button
                onClick={toggleTheme}
                className="flex items-center space-x-1 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="font-gilroy-medium text-sm">{theme === 'dark' ? t('common.light') : t('common.dark')}</span>
              </button>

              {/* Language Switcher */}
              <button
                onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'fr' : 'en')}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <Globe className="h-4 w-4" />
                <span className="font-gilroy-medium">{i18n.language.toUpperCase()}</span>
              </button>

              {/* Notifications */}
              <button className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-numeric font-bold">
                  3
                </span>
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3 pl-2">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 border-2 border-green-400 dark:border-green-500 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center shadow-md">
                    {(() => {
                      switch (user?.role) {
                        case 'admin': return <Crown className="h-5 w-5 text-red-600" />;
                        case 'supervisor': return <Star className="h-5 w-5 text-orange-400" />;
                        case 'operator': return <User className="h-5 w-5 text-blue-600" />;
                        default: return <Eye className="h-5 w-5 text-cyan-600" />;
                      }
                    })()}
                  </div>
                  <div className="text-sm">
                    <p className="font-gilroy-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs font-gilroy text-gray-600 dark:text-gray-400 capitalize">{user?.role ? t(`users.role.${user.role}`) : ''}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title={t('nav.logout')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Mobile: Menu Button Only */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Modal - Full Screen Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Mobile Menu Panel */}
          <div className="lg:hidden fixed top-[0px] left-0 right-0 bottom-0 bg-white dark:bg-gray-900 z-[60] overflow-y-auto animate-slideDown">
            <div className="px-4 py-6 space-y-6">
              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
                  aria-label="Close menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-gray-800 rounded-2xl p-5 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 bg-blue-600 rounded-full flex items-center justify-center shadow-xl">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-gilroy-bold text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-sm text-blue-800 dark:text-blue-300 capitalize font-gilroy-medium">{user?.role ? t(`users.role.${user.role}`) : ''}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="space-y-2">
                <label className="text-xs font-gilroy-bold text-gray-500 uppercase tracking-wide px-1">
                  {t('common.quickActions')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Dark/Light Mode Toggle */}
                  <button
                    onClick={() => {
                      toggleTheme();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex flex-col items-center justify-center space-y-2 px-4 py-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95"
                  >
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-md">
                      {theme === 'dark' ? (
                        <Sun className="h-6 w-6 text-yellow-500" />
                      ) : (
                        <Moon className="h-6 w-6 text-gray-700" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-gilroy-medium">{theme === 'dark' ? t('common.light') : t('common.dark')}</p>
                    </div>
                  </button>

                  {/* Language Switcher */}
                  <button
                    onClick={() => {
                      i18n.changeLanguage(i18n.language === 'en' ? 'fr' : 'en');
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex flex-col items-center justify-center space-y-2 px-4 py-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95"
                  >
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-md">
                      <Globe className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-gilroy-medium">{i18n.language.toUpperCase()}</p>
                    </div>
                  </button>
                </div>

                  {/* Notifications */}
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="relative flex flex-col items-center justify-center space-y-2 px-4 py-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-800 transition-all border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95"
                  >
                    <div className="relative">
                      <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-md">
                        <Bell className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                      </div>
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-numeric font-bold shadow-lg">
                        3
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-gilroy-medium"><span className="font-numeric">3</span> {t('common.newNotifications')}</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl active:scale-95 font-gilroy-bold"
              >
                <LogOut className="h-5 w-5" />
                <span>{t('nav.logout')}</span>
              </button>

              {/* App Info */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-gilroy text-gray-500 dark:text-gray-400 text-center">
                  {t('common.appFooter')}
                </p>
              </div>
            </div>
          </>
        )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }

        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite ease-in-out;
        }
      `}</style>
    </>
  );
};
