import { useState, useEffect, createContext, useContext } from 'react';
import { User, ModuleAccess } from '../types';

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

// Mock authentication for demo purposes
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
          // Validate token expiry (in production, this would be more sophisticated)
          const tokenData = JSON.parse(atob(storedToken.split('.')[1] || '{}'));
          const isExpired = tokenData.exp && Date.now() >= tokenData.exp * 1000;

          if (!isExpired) {
            console.log('Restoring user session for:', userData.name);
            setUser(userData);
            setIsAuthenticated(true);
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

    try {
      // Simulate network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockUsers: { [key: string]: User } = {
        'admin@depot.com': {
          id: '1',
          name: 'John Administrator',
          email: 'admin@depot.com',
          role: 'admin',
          company: 'Container Depot Ltd',
          phone: '+1-555-1001',
          department: 'Administration',
          isActive: true,
          lastLogin: new Date('2025-01-11T08:30:00'),
          createdAt: new Date('2024-01-01'),
          yardAssignments: ['depot-tantarelli', 'depot-vridi', 'depot-san-pedro'], // Admin has access to all yards
          moduleAccess: {
            dashboard: true,
            containers: true,
            gateIn: true,
            gateOut: true,
            releases: true,
            edi: true,
            yard: true,
            clients: true,
            users: true,
            moduleAccess: true,
            reports: true,
            depotManagement: true
          },
          createdBy: "system"
        },
        'operator@depot.com': {
          id: '2',
          name: 'Jane Operator',
          email: 'operator@depot.com',
          role: 'operator',
          company: 'Container Depot Ltd',
          phone: '+1-555-1002',
          department: 'Operations',
          isActive: true,
          lastLogin: new Date('2025-01-11T07:15:00'),
          createdAt: new Date('2024-02-15'),
          yardAssignments: ['depot-tantarelli'], // Operator assigned to main depot
          moduleAccess: {
            dashboard: true,
            containers: true,
            gateIn: true,
            gateOut: true,
            releases: true,
            edi: false,
            yard: true,
            clients: false,
            users: false,
            moduleAccess: false,
            reports: false,
            depotManagement: true
          },
          createdBy: "system"
        },
        'supervisor@depot.com': {
          id: '3',
          name: 'Mike Supervisor',
          email: 'supervisor@depot.com',
          role: 'supervisor',
          company: 'Container Depot Ltd',
          phone: '+1-555-1003',
          department: 'Operations',
          isActive: true,
          lastLogin: new Date('2025-01-10T16:45:00'),
          createdAt: new Date('2024-01-20'),
          yardAssignments: ['depot-tantarelli', 'depot-vridi'], // Supervisor manages two depots
          moduleAccess: {
            dashboard: true,
            containers: true,
            gateIn: true,
            gateOut: true,
            releases: true,
            edi: true,
            yard: true,
            clients: true,
            users: false,
            moduleAccess: false,
            reports: true,
            depotManagement: true
          },
          createdBy: "system"
          depotManagement: true
        },
        'client@shipping.com': {
          id: '4',
          name: 'Sarah Client',
          email: 'client@shipping.com',
          role: 'client',
          company: 'Shipping Solutions Inc',
          phone: '+1-555-2001',
          department: 'Logistics',
          isActive: true,
          lastLogin: new Date('2025-01-09T14:20:00'),
          createdAt: new Date('2024-03-10'),
          clientCode: 'SHIP001',
          yardAssignments: ['depot-tantarelli'], // Client has access to main depot only
          moduleAccess: {
            dashboard: true,
            containers: true,
            gateIn: false,
            gateOut: false,
            releases: true,
            edi: false,
            yard: true,
            clients: false,
            users: false,
            moduleAccess: false,
            reports: false,
            depotManagement: true
          },
          createdBy: "system"
          depotManagement: true
        },
        'client2@maersk.com': {
          id: '5',
          name: 'John Maersk Client',
          email: 'client2@maersk.com',
          role: 'client',
          company: 'Maersk Line',
          phone: '+1-555-2002',
          department: 'Logistics',
          isActive: true,
          lastLogin: new Date('2025-01-08T11:30:00'),
          createdAt: new Date('2024-04-15'),
          clientCode: 'MAEU',
          yardAssignments: ['depot-tantarelli', 'depot-san-pedro'], // Maersk client has access to multiple yards
          moduleAccess: {
            dashboard: true,
            containers: true,
            gateIn: false,
            gateOut: false,
            releases: true,
            edi: false,
            yard: true,
            clients: false,
            users: false,
            moduleAccess: false,
            reports: false,
            depotManagement: true
          },
          createdBy: "system"
          depotManagement: true
        }
      };

      const mockUser = mockUsers[email];
      if (mockUser && password === 'demo123') {
        console.log('Authentication successful for:', mockUser.name);

        // Generate mock JWT token
        const tokenPayload = {
          userId: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };

        const mockToken = `header.${btoa(JSON.stringify(tokenPayload))}.signature`;

        // Store user data and token
        localStorage.setItem('depot_user', JSON.stringify(mockUser));
        localStorage.setItem('depot_token', mockToken);

        setUser(mockUser);
        setIsAuthenticated(true);
        console.log('User state updated, authentication complete');
      } else {
        console.log('Authentication failed: Invalid credentials');
        throw new Error('Invalid credentials. Please check your email and password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);

    // Clear authentication data
    localStorage.removeItem('depot_user');
    localStorage.removeItem('depot_token');
    localStorage.removeItem('depot_preferences');
    localStorage.removeItem('language');
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
