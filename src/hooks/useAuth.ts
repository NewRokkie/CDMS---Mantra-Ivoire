import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import type { User as AppUser, ModuleAccess } from '../types';
import { supabase } from '../services/api/supabaseClient';
import { userService } from '../services/api';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasModuleAccess: (module: keyof ModuleAccess) => boolean;
  canViewAllData: () => boolean;
  getClientFilter: () => string | null;
  refreshUser: () => Promise<void>;
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

  // Références pour éviter les re-renders
  const userRef = useRef<AppUser | null>(null);
  const isLoadingRef = useRef(true);
  const isAuthenticatedRef = useRef(false);

  // Mettre à jour à la fois l'état et les refs
  const setAuthState = useCallback((newUser: AppUser | null, loading: boolean, authenticated: boolean) => {
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
  }, []);

  // Load user profile (identique à votre version originale)
  const loadUserProfile = async (authUser: SupabaseUser): Promise<AppUser | null> => {
    console.log('📋 [LOAD_PROFILE] Loading profile for:', authUser.email, 'auth_uid:', authUser.id);

    try {
      console.log('📋 [LOAD_PROFILE] Querying users table by auth_user_id...');

      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

      console.log('📋 [LOAD_PROFILE] Query result - data:', users, 'error:', error);

      if (error) {
        console.error('📋 [LOAD_PROFILE] Error loading user profile:', error);
        return null;
      }

      if (!users) {
        console.warn('📋 [LOAD_PROFILE] User not found in database for auth_user_id:', authUser.id);
        return null;
      }

      // Map database user to app user
      console.log('📋 [LOAD_PROFILE] Mapping user data to AppUser...');

      let modulePermissions = users.module_access;

      if (!modulePermissions) {
        try {
          const { moduleAccessService } = await import('../services/api');
          const customPermissions = await moduleAccessService.getUserModuleAccess(users.id);

          if (customPermissions) {
            modulePermissions = customPermissions;
          }
        } catch (error) {
          console.error('Error loading custom module access:', error);
        }
      }

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

      console.log('📋 [LOAD_PROFILE] ✅ Profile mapped successfully:', appUser.email);
      return appUser;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      return null;
    }
  };

  // Version stable de checkSession
  const checkSession = useCallback(async () => {
    console.log('🔐 [SESSION] Checking session...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('🔐 [SESSION] Session error:', error);
        setAuthState(null, false, false);
        return;
      }

      if (session?.user) {
        console.log('🔐 [SESSION] Session found for:', session.user.email);

        // Vérifier si l'utilisateur a vraiment changé
        const profile = await loadUserProfile(session.user);

        if (profile) {
          // Comparaison intelligente pour éviter les re-renders inutiles
          if (userRef.current?.id !== profile.id ||
              userRef.current?.email !== profile.email) {
            console.log('🔐 [SESSION] User changed, updating state');
            setAuthState(profile, false, true);

            // Update last login (non-blocking)
            userService.update(profile.id, {
              last_login: new Date().toISOString()
            }).catch(err => {
              console.warn('🔐 [SESSION] Could not update last login:', err);
            });
          } else {
            console.log('🔐 [SESSION] User unchanged, skipping state update');
          }
        } else {
          console.warn('🔐 [SESSION] Could not load user profile');
          setAuthState(null, false, false);
        }
      } else {
        console.log('🔐 [SESSION] No active session');
        setAuthState(null, false, false);
      }
    } catch (error) {
      console.error('🔐 [SESSION] Error checking session:', error);
      setAuthState(null, false, false);
    }
  }, [setAuthState]);

  // useEffect optimisé
  useEffect(() => {
    let mounted = true;
    let sessionCheckTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      await checkSession();
    };

    initializeAuth();

    // Écouteur DÉBONCÉ et FILTRÉ
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [AUTH_CHANGE] Event:', event);

      if (!mounted) return;

      // FILTRER les événements non critiques
      const criticalEvents = ['SIGNED_IN', 'SIGNED_OUT', 'USER_DELETED'];
      if (!criticalEvents.includes(event)) {
        console.log('🔄 [AUTH_CHANGE] Ignoring non-critical event:', event);
        return;
      }

      // DÉBOUNCER les vérifications
      clearTimeout(sessionCheckTimeout);
      sessionCheckTimeout = setTimeout(() => {
        if (mounted) {
          console.log('🔄 [AUTH_CHANGE] Processing critical event:', event);
          checkSession();
        }
      }, 1000); // 1 seconde de debounce
    });

    return () => {
      mounted = false;
      clearTimeout(sessionCheckTimeout);
      subscription.unsubscribe();
    };
  }, [checkSession]);

  // login optimisé
  const login = async (email: string, password: string) => {
    console.log('🔑 [LOGIN] Starting login attempt for:', email);

    try {
      setAuthState(userRef.current, true, isAuthenticatedRef.current);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw new Error(error.message || 'Invalid credentials');
      if (!data.user) throw new Error('No user returned from authentication');

      console.log('🔑 [LOGIN] Authentication successful for:', data.user.email);

      const profile = await loadUserProfile(data.user);
      console.log('🔑 [LOGIN] Profile loaded:', profile);

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
        console.warn('🔑 [LOGIN] Could not update last login:', err);
      });

      console.log('🔑 [LOGIN] ✅ Login complete!');
    } catch (error: any) {
      console.error('🔑 [LOGIN] ❌ Login error:', error);
      setAuthState(null, false, false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');
      await supabase.auth.signOut();
      setAuthState(null, false, false);

      // Clear local storage
      localStorage.removeItem('depot_preferences');
      localStorage.removeItem('language');
      console.log('Logout complete');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const refreshUser = async () => {
    console.log('🔄 [REFRESH_USER] Refreshing user profile...');
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const profile = await loadUserProfile(session.user);
      if (profile) {
        setAuthState(profile, false, true);
        console.log('🔄 [REFRESH_USER] ✅ User profile refreshed');
      }
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

  return {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated,
    hasModuleAccess,
    canViewAllData,
    getClientFilter,
    refreshUser
  };
};

// ⭐ EXPORT CORRIGÉ : Garder l'export du contexte
export { AuthContext };
