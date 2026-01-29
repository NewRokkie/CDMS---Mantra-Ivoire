import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import type { User as AppUser, ModuleAccess } from '../types';
import { supabase } from '../services/api/supabaseClient';
import { userService } from '../services/api';
import { moduleAccessService } from '../services/api/moduleAccessService';
import { syncManager } from '../services/sync/SyncManager';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { handleError } from '../services/errorHandling';
import { logger } from '../utils/logger';

export interface SyncStatus {
  isHealthy: boolean;
  lastSyncAt?: Date;
  inconsistencyCount: number;
  failedSyncCount: number;
  nextScheduledSync?: Date;
}

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  isDatabaseConnected: boolean;
  retryConnection: () => void;
  hasModuleAccess: (module: keyof ModuleAccess) => boolean;
  canViewAllData: () => boolean;
  getClientFilter: () => string | null;
  refreshUser: () => Promise<void>;
  refreshModuleAccess: () => Promise<void>;
  getSyncStatus: () => SyncStatus;
  onSyncStatusChange: (callback: (status: SyncStatus) => void) => void;
  offSyncStatusChange: (callback: (status: SyncStatus) => void) => void;
  hasAdminUsers: () => Promise<boolean>;
  needsInitialSetup: boolean;
  checkInitialSetup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ⭐ EXPORT CORRIGÉ : Garder la hook useAuth existante
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Hook interne pour le provider
export const useAuthProvider = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(true);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isHealthy: true,
    inconsistencyCount: 0,
    failedSyncCount: 0
  });

  // Références pour éviter les re-renders
  const userRef = useRef<AppUser | null>(null);
  const isLoadingRef = useRef(true);
  const isAuthenticatedRef = useRef(false);
  const syncStatusCallbacks = useRef<((status: SyncStatus) => void)[]>([]);

  // Mettre à jour à la fois l'état et les refs
  const setAuthState = useCallback((newUser: AppUser | null, loading: boolean, authenticated: boolean, error: string | null = null, dbConnected: boolean = true, initialSetup: boolean = false) => {
    // Éviter les mises à jour inutiles
    if (userRef.current?.id === newUser?.id &&
        isLoadingRef.current === loading &&
        isAuthenticatedRef.current === authenticated) {
      return;
    }

    userRef.current = newUser;
    isLoadingRef.current = loading;
    isAuthenticatedRef.current = authenticated;

    setUser(newUser);
    setIsLoading(loading);
    setIsAuthenticated(authenticated);
    setAuthError(error);
    setIsDatabaseConnected(dbConnected);
    setNeedsInitialSetup(initialSetup);
  }, []);

  // Database connection test with timeout
  const testDatabaseConnection = async (timeoutMs: number = 10000): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        logger.error('Database connection test failed', 'useAuth.testDatabaseConnection', error);
        return false;
      }

      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error('Database connection timeout', 'useAuth.testDatabaseConnection');
        return false;
      }
      logger.error('Database connection test error', 'useAuth.testDatabaseConnection', error);
      return false;
    }
  };

  // Load user profile with enhanced module access handling
  const loadUserProfile = async (authUser: SupabaseUser): Promise<AppUser | null> => {
    try {
      // Use a more direct query to avoid RLS recursion issues
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .eq('is_deleted', false)
        .eq('active', true)
        .maybeSingle();

      if (error) {
        // Check if this is the infinite recursion error
        if (error.message?.includes('infinite recursion detected in policy')) {
          logger.error('RLS infinite recursion detected - database policies need to be fixed', 'useAuth.loadUserProfile', error);
          throw new Error('Database configuration error. Please contact support.');
        }
        handleError(error, 'useAuth.loadUserProfile');
        return null;
      }

      if (!users) {
        logger.warn('User profile not found for authenticated user', 'useAuth.loadUserProfile', { authUserId: authUser.id });
        return null;
      }

      // Map database user to app user
      // Use the enhanced ModuleAccessService with fallback mechanism
      let modulePermissions: ModuleAccess | null = null;
      
      try {
        modulePermissions = await moduleAccessService.getUserModuleAccessWithFallback(users.id);
      } catch (error) {
        handleError(error, 'useAuth.loadUserProfile.getModuleAccess');
        // Continue with default permissions if service fails
      }

      // Fallback to default permissions if no data found
      if (!modulePermissions) {
        modulePermissions = {
          dashboard: true,
          containers: false,
          gateIn: false,
          gateOut: false,
          releases: false,
          edi: false,
          yard: false,
          clients: false,
          users: false,
          moduleAccess: false,
          reports: false,
          depotManagement: false,
          timeTracking: false,
          analytics: false,
          clientPools: false,
          stackManagement: false,
          auditLogs: false,
          billingReports: false,
          operationsReports: false
        };
      }

      const appUser: AppUser = {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        company: users.company || '',
        phone: users.phone || '',
        department: users.department || '',
        isActive: users.active,
        lastLogin: users.last_login ? new Date(users.last_login) : undefined,
        createdAt: new Date(users.created_at),
        createdBy: 'system',
        updatedBy: users.updated_at ? 'system' : undefined,
        clientCode: users.client_code,
        yardAssignments: users.yard_ids ? (Array.isArray(users.yard_ids) ? users.yard_ids : []) : [],
        moduleAccess: modulePermissions
      };

      return appUser;
    } catch (error) {
      handleError(error, 'useAuth.loadUserProfile');
      return null;
    }
  };

  // Version stable de checkSession avec database connection check
  const checkSession = useCallback(async () => {
    try {
      // First test database connection
      const isDbConnected = await testDatabaseConnection(8000); // 8 second timeout
      
      if (!isDbConnected) {
        setAuthState(null, false, false, 'Database connection failed. The database may be paused or unreachable.', false);
        return;
      }

      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        handleError(error, 'useAuth.checkSession');
        setAuthState(null, false, false, 'Authentication service error');
        return;
      }

      if (session?.user) {

        // Vérifier si l'utilisateur a vraiment changé
        const profile = await loadUserProfile(session.user);

        if (profile) {
          // Comparaison intelligente pour éviter les re-renders inutiles
          if (userRef.current?.id !== profile.id ||
              userRef.current?.email !== profile.email) {
            setAuthState(profile, false, true);

            // Update last login (non-blocking)
            userService.update(profile.id, {
              last_login: new Date().toISOString()
            }).catch(err => {
              // Silently handle - not critical
            });
          }
        } else {
          setAuthState(null, false, false, 'User profile not found');
        }
      } else {
        // No session - check if we need initial setup
        try {
          const hasAdmins = await userService.hasAdminUsers();
          if (!hasAdmins) {
            setAuthState(null, false, false, null, true, true); // needsInitialSetup = true
          } else {
            setAuthState(null, false, false);
          }
        } catch (error) {
          // If we can't check for admins, assume normal login flow
          setAuthState(null, false, false);
        }
      }
    } catch (error) {
      handleError(error, 'useAuth.checkSession');
      setAuthState(null, false, false, 'Session check failed');
    }
  }, [setAuthState]);

  // useEffect optimisé with sync monitoring
  useEffect(() => {
    let mounted = true;
    let sessionCheckTimeout: NodeJS.Timeout;
    let syncStatusInterval: NodeJS.Timeout;

    const initializeAuth = async () => {
      await checkSession();
    };

    // Initialize sync status monitoring
    const initializeSyncMonitoring = () => {
      // Update sync status every 30 seconds, but only if status actually changed
      syncStatusInterval = setInterval(() => {
        if (mounted && userRef.current) {
          try {
            const metrics = syncManager.getSyncMetrics();
            const newStatus: SyncStatus = {
              isHealthy: metrics.isHealthy,
              lastSyncAt: metrics.lastSyncTime,
              inconsistencyCount: metrics.recentErrors.length,
              failedSyncCount: metrics.failedSyncs,
              nextScheduledSync: metrics.nextScheduledSync
            };
            
            // Only update if status actually changed to prevent unnecessary re-renders
            const currentStatus = syncStatus;
            if (currentStatus.isHealthy !== newStatus.isHealthy ||
                currentStatus.inconsistencyCount !== newStatus.inconsistencyCount ||
                currentStatus.failedSyncCount !== newStatus.failedSyncCount) {
              updateSyncStatus(newStatus);
            }
          } catch (error) {
            handleError(error, 'useAuth.syncStatusMonitoring');
          }
        }
      }, 30000); // 30 seconds

      // Set up sync error callback
      const handleSyncError = (error: any) => {
        if (mounted) {
          const metrics = syncManager.getSyncMetrics();
          const newStatus: SyncStatus = {
            isHealthy: false,
            lastSyncAt: metrics.lastSyncTime,
            inconsistencyCount: metrics.recentErrors.length,
            failedSyncCount: metrics.failedSyncs,
            nextScheduledSync: metrics.nextScheduledSync
          };
          updateSyncStatus(newStatus);
        }
      };

      syncManager.onSyncError(handleSyncError);

      return () => {
        syncManager.offSyncError(handleSyncError);
      };
    };

    initializeAuth();
    const cleanupSyncMonitoring = initializeSyncMonitoring();

    // Écouteur DÉBONCÉ et FILTRÉ
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!mounted) return;

      // FILTRER les événements non critiques
      const criticalEvents = ['SIGNED_IN', 'SIGNED_OUT', 'USER_DELETED'];
      if (!criticalEvents.includes(event)) {
        return;
      }

      // DÉBOUNCER les vérifications
      clearTimeout(sessionCheckTimeout);
      sessionCheckTimeout = setTimeout(() => {
        if (mounted) {
          checkSession();
        }
      }, 1000); // 1 seconde de debounce
    });

    return () => {
      mounted = false;
      clearTimeout(sessionCheckTimeout);
      clearInterval(syncStatusInterval);
      subscription.unsubscribe();
      cleanupSyncMonitoring();
    };
  }, [checkSession]);

  // login optimisé avec database connection check
  const login = async (email: string, password: string) => {
    try {
      setAuthState(userRef.current, true, isAuthenticatedRef.current);

      // Test database connection first
      const isDbConnected = await testDatabaseConnection(8000);
      
      if (!isDbConnected) {
        setAuthState(null, false, false, 'Database connection failed. The database may be paused or unreachable.', false);
        throw new Error('Database connection failed. Please try again later or contact support.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw new Error(error.message || 'Invalid credentials');
      if (!data.user) throw new Error('No user returned from authentication');

      const profile = await loadUserProfile(data.user);

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('User profile not found. Please contact administrator.');
      }

      if (!profile.isActive) {
        await supabase.auth.signOut();
        throw new Error('Your account has been deactivated. Please contact administrator.');
      }

      // Mise à jour conditionnelle
      setAuthState(profile, false, true);

      // Update last login (non-blocking)
      userService.update(profile.id, {
        last_login: new Date().toISOString()
      }).catch(err => {
        // Silently handle - not critical
      });
    } catch (error: any) {
      handleError(error, 'useAuth.login');
      setAuthState(null, false, false, error.message);
      throw error;
    }
  };

  // Check if admin users exist
  const hasAdminUsers = async (): Promise<boolean> => {
    try {
      return await userService.hasAdminUsers();
    } catch (error) {
      handleError(error, 'useAuth.hasAdminUsers');
      throw error;
    }
  };

  // Check if initial setup is needed
  const checkInitialSetup = async (): Promise<void> => {
    try {
      const hasAdmins = await userService.hasAdminUsers();
      setNeedsInitialSetup(!hasAdmins);
    } catch (error) {
      handleError(error, 'useAuth.checkInitialSetup');
      // On error, assume setup is not needed to avoid blocking normal flow
      setNeedsInitialSetup(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setAuthState(null, false, false);

      // Clear local storage
      localStorage.removeItem('depot_preferences');
      localStorage.removeItem('language');
    } catch (error) {
      handleError(error, 'useAuth.logout');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // First, check if user exists in our database
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, active')
        .eq('email', email)
        .maybeSingle();

      if (userError) {
        handleError(userError, 'useAuth.resetPassword.checkUser');
        throw new Error('Erreur lors de la vérification de l\'utilisateur');
      }

      // If user doesn't exist, show a generic message for security
      if (!users) {
        throw new Error('Si cet email existe dans notre système, un lien de réinitialisation a été envoyé');
      }

      // Check if user is active
      if (!users.active) {
        throw new Error('Ce compte est désactivé. Veuillez contacter l\'administrateur');
      }

      // User exists and is active, send reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw new Error(error.message || 'Échec de l\'envoi de l\'email de réinitialisation');
      }
    } catch (error: any) {
      handleError(error, 'useAuth.resetPassword');
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(error.message || 'Failed to update password');
      }
    } catch (error: any) {
      handleError(error, 'useAuth.updatePassword');
      throw error;
    }
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await loadUserProfile(session.user);
      if (profile) {
        setAuthState(profile, false, true);
      }
    }
  };

  // New method to refresh only module access permissions
  const refreshModuleAccess = async () => {
    if (!userRef.current) {
      return;
    }

    try {
      const updatedPermissions = await moduleAccessService.getUserModuleAccessWithFallback(userRef.current.id);
      
      if (updatedPermissions && userRef.current) {
        const updatedUser = {
          ...userRef.current,
          moduleAccess: updatedPermissions
        };
        
        setAuthState(updatedUser, false, true);
      }
    } catch (error) {
      handleError(error, 'useAuth.refreshModuleAccess');
    }
  };

  // Mémoizer les fonctions de vérification d'accès
  const hasModuleAccess = useCallback((module: keyof ModuleAccess): boolean => {
    if (!userRef.current || !userRef.current.moduleAccess) return false;
    if (userRef.current.role === 'admin') return true;
    return userRef.current.moduleAccess[module] === true;
  }, []);

  const canViewAllData = useCallback((): boolean => {
    if (!userRef.current) return false;
    return ['admin', 'supervisor', 'operator'].includes(userRef.current.role);
  }, []);

  const getClientFilter = useCallback((): string | null => {
    if (!userRef.current || canViewAllData()) return null;
    if (userRef.current.role === 'client') {
      return userRef.current.clientCode || userRef.current.company || userRef.current.email;
    }
    return null;
  }, [canViewAllData]);

  // Sync status management
  const getSyncStatus = useCallback((): SyncStatus => {
    return syncStatus;
  }, [syncStatus]);

  const onSyncStatusChange = useCallback((callback: (status: SyncStatus) => void) => {
    syncStatusCallbacks.current.push(callback);
  }, []);

  const offSyncStatusChange = useCallback((callback: (status: SyncStatus) => void) => {
    const index = syncStatusCallbacks.current.indexOf(callback);
    if (index > -1) {
      syncStatusCallbacks.current.splice(index, 1);
    }
  }, []);

  // Retry connection function
  const retryConnection = useCallback(() => {
    setAuthError(null);
    setIsDatabaseConnected(true);
    checkSession();
  }, [checkSession]);

  // Update sync status and notify callbacks
  const updateSyncStatus = useCallback((newStatus: SyncStatus) => {
    setSyncStatus(newStatus);
    syncStatusCallbacks.current.forEach(callback => {
      try {
        callback(newStatus);
      } catch (error) {
        handleError(error, 'useAuth.onSyncStatusChange.callback');
      }
    });
  }, []);

  return {
    user,
    login,
    logout,
    resetPassword,
    updatePassword,
    isLoading,
    isAuthenticated,
    authError,
    isDatabaseConnected,
    retryConnection,
    hasModuleAccess,
    canViewAllData,
    getClientFilter,
    refreshUser,
    refreshModuleAccess,
    getSyncStatus,
    onSyncStatusChange,
    offSyncStatusChange,
    hasAdminUsers,
    needsInitialSetup,
    checkInitialSetup
  };
};

// ⭐ EXPORT CORRIGÉ : Garder l'export du contexte
export { AuthContext };
