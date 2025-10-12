import { useState, useEffect, createContext, useContext } from 'react';
import type { User as AppUser, ModuleAccess } from '../types';
import { supabase } from '../services/api/supabaseClient';
import { userService } from '../services/api';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasModuleAccess: (module: keyof ModuleAccess) => boolean;
  canViewAllData: () => boolean;
  getClientFilter: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Supabase Authentication
export const useAuthProvider = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user profile from database
  const loadUserProfile = async (authUser: SupabaseUser): Promise<AppUser | null> => {
    try {
      // Get user from our users table
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        return null;
      }

      if (!users) {
        console.warn('User not found in database:', authUser.email);
        return null;
      }

      // Map database user to app user
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
        moduleAccess: users.module_access || {
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
        }
      };

      return appUser;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      return null;
    }
  };

  // Check session on mount
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      console.log('🔐 [SESSION] Checking session on mount...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('🔐 [SESSION] Session error:', error);
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        if (session?.user && mounted) {
          console.log('🔐 [SESSION] Session found for:', session.user.email);
          const profile = await loadUserProfile(session.user);

          if (profile && mounted) {
            console.log('🔐 [SESSION] Profile loaded, setting user state');
            setUser(profile);
            setIsAuthenticated(true);

            // Update last login (non-blocking)
            userService.update(profile.id, {
              last_login: new Date().toISOString()
            }).catch(err => {
              console.warn('🔐 [SESSION] Could not update last login:', err);
            });
          } else {
            console.warn('🔐 [SESSION] Could not load user profile');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          console.log('🔐 [SESSION] No active session');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('🔐 [SESSION] Error checking session:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (mounted) {
          console.log('🔐 [SESSION] Setting isLoading to false');
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [AUTH_CHANGE] Event:', event, 'Session:', session?.user?.email);

      if (event === 'SIGNED_IN' && session?.user && mounted) {
        console.log('🔄 [AUTH_CHANGE] SIGNED_IN - Loading profile...');
        const profile = await loadUserProfile(session.user);
        if (profile && mounted) {
          console.log('🔄 [AUTH_CHANGE] Profile loaded, updating state');
          setUser(profile);
          setIsAuthenticated(true);
          setIsLoading(false);
        } else {
          console.log('🔄 [AUTH_CHANGE] Profile not found');
          setUser(null);
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT' && mounted) {
        console.log('🔄 [AUTH_CHANGE] SIGNED_OUT');
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user && mounted) {
        console.log('🔄 [AUTH_CHANGE] TOKEN_REFRESHED');
        const profile = await loadUserProfile(session.user);
        if (profile && mounted) {
          setUser(profile);
        }
      } else if (event === 'INITIAL_SESSION') {
        console.log('🔄 [AUTH_CHANGE] INITIAL_SESSION - ignoring (handled by checkSession)');
      } else {
        console.log('🔄 [AUTH_CHANGE] Unhandled event:', event);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log('🔑 [LOGIN] Starting login attempt for:', email);

    try {
      console.log('🔑 [LOGIN] Setting isLoading to true');
      setIsLoading(true);

      // Sign in with Supabase Auth
      console.log('🔑 [LOGIN] Calling Supabase signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('🔑 [LOGIN] Supabase auth error:', error);
        throw new Error(error.message || 'Invalid credentials');
      }

      if (!data.user) {
        console.error('🔑 [LOGIN] No user returned from authentication');
        throw new Error('No user returned from authentication');
      }

      console.log('🔑 [LOGIN] Authentication successful for:', data.user.email);

      // Load user profile
      console.log('🔑 [LOGIN] Loading user profile...');
      const profile = await loadUserProfile(data.user);
      console.log('🔑 [LOGIN] Profile loaded:', profile);

      if (!profile) {
        console.error('🔑 [LOGIN] Profile not found, signing out');
        await supabase.auth.signOut();
        throw new Error('User profile not found. Please contact administrator.');
      }

      // Check if user is active
      if (!profile.isActive) {
        console.error('🔑 [LOGIN] User account is inactive');
        await supabase.auth.signOut();
        throw new Error('Your account has been deactivated. Please contact administrator.');
      }

      console.log('🔑 [LOGIN] Setting user state...');
      setUser(profile);
      setIsAuthenticated(true);

      // Update last login (non-blocking)
      console.log('🔑 [LOGIN] Updating last login timestamp...');
      userService.update(profile.id, {
        last_login: new Date().toISOString()
      }).catch(err => {
        console.warn('🔑 [LOGIN] Could not update last login:', err);
      });

      console.log('🔑 [LOGIN] ✅ Login complete! Setting isLoading to false');
    } catch (error: any) {
      console.error('🔑 [LOGIN] ❌ Login error:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      console.log('🔑 [LOGIN] Finally block - setting isLoading to false');
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out...');

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
      }

      setUser(null);
      setIsAuthenticated(false);

      // Clear local storage
      localStorage.removeItem('depot_preferences');
      localStorage.removeItem('language');

      console.log('Logout complete');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const hasModuleAccess = (module: keyof ModuleAccess): boolean => {
    if (!user || !user.moduleAccess) return false;

    // Admin users always have full access to everything
    if (user.role === 'admin') {
      return true;
    }

    return user.moduleAccess[module] === true;
  };

  // Check if user can view all data (admin, supervisor, operator) or only their own (client)
  const canViewAllData = (): boolean => {
    if (!user) return false;
    return ['admin', 'supervisor', 'operator'].includes(user.role);
  };

  // Get client filter for data queries
  const getClientFilter = (): string | null => {
    if (!user || canViewAllData()) return null;

    // For client users, return their client identifier
    if (user.role === 'client') {
      return user.clientCode || user.company || user.email;
    }

    return null;
  };

  return {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated,
    hasModuleAccess,
    canViewAllData,
    getClientFilter
  };
};

export { AuthContext };
