import { useState, useEffect, createContext, useContext } from 'react';
import { User, ModuleAccess } from '../types';
import { userService } from '../services/database/UserService';

interface AuthContextType {
  user: User | null;
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

// Database-connected authentication provider
export const useAuthProvider = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for stored user session
    const checkStoredSession = async () => {
      try {
        const storedUser = localStorage.getItem('depot_user');
        const storedToken = localStorage.getItem('depot_token');

        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);

          // Validate token expiry
          const tokenData = JSON.parse(atob(storedToken.split('.')[1] || '{}'));
          const isExpired = tokenData.exp && Date.now() >= tokenData.exp * 1000;

          if (!isExpired) {
            console.log('Restoring user session for:', userData.name);

            // Verify user still exists and is active in database
            try {
              const currentUser = await userService.getUserById(userData.id);
              if (currentUser && currentUser.isActive) {
                setUser(currentUser);
                setIsAuthenticated(true);

                // Update last activity
                await userService.updateLastLogin(currentUser.id);
              } else {
                // User no longer exists or is inactive
                console.log('User no longer active, clearing session');
                localStorage.removeItem('depot_user');
                localStorage.removeItem('depot_token');
                setUser(null);
                setIsAuthenticated(false);
              }
            } catch (dbError) {
              console.warn('Could not verify user in database, using cached data:', dbError);
              // Use cached data if database is unavailable
              setUser(userData);
              setIsAuthenticated(true);
            }
          } else {
            // Token expired, clear storage
            console.log('Token expired, clearing session');
            localStorage.removeItem('depot_user');
            localStorage.removeItem('depot_token');
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          console.log('No stored session found');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error loading user session:', error);
        // Clear corrupted data
        localStorage.removeItem('depot_user');
        localStorage.removeItem('depot_token');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkStoredSession();
  }, []);

  const login = async (email: string, password: string) => {
    console.log('Login attempt for:', email);
    setIsLoading(true);

    try {
      // Authenticate with database
      const authenticatedUser = await userService.authenticateUser(email, password);

      if (!authenticatedUser) {
        throw new Error('Authentication failed - invalid credentials');
      }

      console.log('Authentication successful for:', authenticatedUser.name);

      // Generate JWT token (in production, this would be done by backend)
      const tokenPayload = {
        userId: authenticatedUser.id,
        email: authenticatedUser.email,
        role: authenticatedUser.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      };

      const mockToken = `header.${btoa(JSON.stringify(tokenPayload))}.signature`;

      // Store user data and token
      localStorage.setItem('depot_user', JSON.stringify(authenticatedUser));
      localStorage.setItem('depot_token', mockToken);

      // Create session record in database
      try {
        await userService.createUserSession(
          authenticatedUser.id,
          mockToken,
          '127.0.0.1', // In production, get real IP
          navigator.userAgent
        );
      } catch (sessionError) {
        console.warn('Could not create session record:', sessionError);
      }

      setUser(authenticatedUser);
      setIsAuthenticated(true);
      console.log('User state updated, authentication complete');
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const currentToken = localStorage.getItem('depot_token');

    // Invalidate session in database
    if (currentToken) {
      try {
        await userService.invalidateUserSession(currentToken);
      } catch (error) {
        console.warn('Could not invalidate session in database:', error);
      }
    }

    setUser(null);
    setIsAuthenticated(false);

    // Clear authentication data
    localStorage.removeItem('depot_user');
    localStorage.removeItem('depot_token');
    localStorage.removeItem('depot_preferences');
    localStorage.removeItem('language');

    console.log('User logged out successfully');
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
