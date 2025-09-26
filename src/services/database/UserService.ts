/**
 * User Service - Database-connected user management
 * Handles authentication, user CRUD operations, and module access
 */

import { dbService } from './DatabaseService';
import { User, ModuleAccess } from '../../types';

export interface DatabaseUser {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  role: 'client' | 'admin' | 'operator' | 'supervisor';
  company?: string;
  phone?: string;
  department?: string;
  avatar_url?: string;
  client_code?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface UserModuleAccess {
  user_id: string;
  module_name: string;
  has_access: boolean;
}

export interface UserYardAssignment {
  user_id: string;
  yard_id: string;
  is_active: boolean;
}

export class UserService {

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      // In production, password would be hashed and compared
      // For now, we'll use the demo accounts from our database
      const user = await dbService.selectOne<DatabaseUser>(
        'users',
        '*',
        { email, is_active: true }
      );

      if (!user) {
        throw new Error('User not found or inactive');
      }

      // For demo purposes, accept 'demo123' for all users
      if (password !== 'demo123') {
        throw new Error('Invalid password');
      }

      // Update last login
      await dbService.update('users',
        { last_login: new Date().toISOString() },
        { id: user.id }
      );

      // Get module access
      const moduleAccess = await this.getUserModuleAccess(user.id);

      // Get yard assignments
      const yardAssignments = await this.getUserYardAssignments(user.id);

      return this.mapDatabaseUserToUser(user, moduleAccess, yardAssignments);
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const user = await dbService.selectOne<DatabaseUser>(
        'users',
        '*',
        { id: userId, is_active: true }
      );

      if (!user) return null;

      const moduleAccess = await this.getUserModuleAccess(userId);
      const yardAssignments = await this.getUserYardAssignments(userId);

      return this.mapDatabaseUserToUser(user, moduleAccess, yardAssignments);
    } catch (error) {
      console.error('Failed to get user by ID:', error);
      return null;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    try {
      const users = await dbService.select<DatabaseUser>(
        'users',
        '*',
        undefined,
        'name ASC'
      );

      const usersWithAccess = await Promise.all(
        users.map(async (user) => {
          const moduleAccess = await this.getUserModuleAccess(user.id);
          const yardAssignments = await this.getUserYardAssignments(user.id);
          return this.mapDatabaseUserToUser(user, moduleAccess, yardAssignments);
        })
      );

      return usersWithAccess;
    } catch (error) {
      console.error('Failed to get all users:', error);
      return [];
    }
  }

  /**
   * Create new user
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User | null> {
    try {
      // Insert user
      const newUser = await dbService.insert<DatabaseUser>('users', {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        company: userData.company,
        phone: userData.phone,
        department: userData.department,
        avatar_url: userData.avatar,
        client_code: userData.clientCode,
        is_active: userData.isActive,
      });

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Set module access
      await this.setUserModuleAccess(newUser.id, userData.moduleAccess);

      // Set yard assignments
      if (userData.yardAssignments) {
        await this.setUserYardAssignments(newUser.id, userData.yardAssignments);
      }

      return this.getUserById(newUser.id);
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const updateData: Partial<DatabaseUser> = {
        name: updates.name,
        email: updates.email,
        role: updates.role,
        company: updates.company,
        phone: updates.phone,
        department: updates.department,
        avatar_url: updates.avatar,
        client_code: updates.clientCode,
        is_active: updates.isActive,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof DatabaseUser] === undefined) {
          delete updateData[key as keyof DatabaseUser];
        }
      });

      await dbService.update('users', updateData, { id: userId });

      // Update module access if provided
      if (updates.moduleAccess) {
        await this.setUserModuleAccess(userId, updates.moduleAccess);
      }

      // Update yard assignments if provided
      if (updates.yardAssignments) {
        await this.setUserYardAssignments(userId, updates.yardAssignments);
      }

      return this.getUserById(userId);
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      await dbService.delete('users', { id: userId });
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  /**
   * Get user module access
   */
  private async getUserModuleAccess(userId: string): Promise<ModuleAccess> {
    try {
      const access = await dbService.select<UserModuleAccess>(
        'user_module_access',
        'module_name, has_access',
        { user_id: userId }
      );

      const moduleAccess: Partial<ModuleAccess> = {};
      access.forEach(item => {
        (moduleAccess as any)[item.module_name] = item.has_access;
      });

      // Set defaults for missing modules
      const defaultAccess: ModuleAccess = {
        dashboard: false,
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
        operationsReports: false,
      };

      return { ...defaultAccess, ...moduleAccess };
    } catch (error) {
      console.error('Failed to get user module access:', error);
      return {
        dashboard: false,
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
        operationsReports: false,
      };
    }
  }

  /**
   * Get user yard assignments
   */
  private async getUserYardAssignments(userId: string): Promise<string[]> {
    try {
      const assignments = await dbService.select<UserYardAssignment>(
        'user_yard_assignments',
        'yard_id',
        { user_id: userId, is_active: true }
      );

      return assignments.map(a => a.yard_id);
    } catch (error) {
      console.error('Failed to get user yard assignments:', error);
      return [];
    }
  }

  /**
   * Set user module access
   */
  private async setUserModuleAccess(userId: string, moduleAccess: ModuleAccess): Promise<void> {
    try {
      // Delete existing access
      await dbService.delete('user_module_access', { user_id: userId });

      // Insert new access
      const operations = Object.entries(moduleAccess).map(([module, hasAccess]) => ({
        query: 'INSERT INTO user_module_access (user_id, module_name, has_access) VALUES ($1, $2, $3)',
        params: [userId, module, hasAccess]
      }));

      if (operations.length > 0) {
        await dbService.transaction(operations);
      }
    } catch (error) {
      console.error('Failed to set user module access:', error);
      throw error;
    }
  }

  /**
   * Set user yard assignments
   */
  private async setUserYardAssignments(userId: string, yardIds: string[]): Promise<void> {
    try {
      // Delete existing assignments
      await dbService.delete('user_yard_assignments', { user_id: userId });

      // Insert new assignments
      const operations = yardIds.map(yardId => ({
        query: 'INSERT INTO user_yard_assignments (user_id, yard_id) VALUES ($1, $2)',
        params: [userId, yardId]
      }));

      if (operations.length > 0) {
        await dbService.transaction(operations);
      }
    } catch (error) {
      console.error('Failed to set user yard assignments:', error);
      throw error;
    }
  }

  /**
   * Map database user to application user interface
   */
  private mapDatabaseUserToUser(
    dbUser: DatabaseUser,
    moduleAccess: ModuleAccess,
    yardAssignments: string[]
  ): User {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      company: dbUser.company,
      avatar: dbUser.avatar_url,
      phone: dbUser.phone,
      department: dbUser.department,
      isActive: dbUser.is_active,
      lastLogin: dbUser.last_login ? new Date(dbUser.last_login) : undefined,
      createdAt: new Date(dbUser.created_at),
      createdBy: dbUser.created_by || 'system',
      updatedBy: dbUser.updated_by,
      moduleAccess,
      clientCode: dbUser.client_code,
      yardAssignments,
    };
  }

  /**
   * Check if user has access to specific module
   */
  async hasModuleAccess(userId: string, moduleName: keyof ModuleAccess): Promise<boolean> {
    try {
      const access = await dbService.selectOne<UserModuleAccess>(
        'user_module_access',
        'has_access',
        { user_id: userId, module_name: moduleName }
      );

      return access?.has_access || false;
    } catch (error) {
      console.error('Failed to check module access:', error);
      return false;
    }
  }

  /**
   * Check if user has access to specific yard
   */
  async hasYardAccess(userId: string, yardId: string): Promise<boolean> {
    try {
      const assignment = await dbService.selectOne<UserYardAssignment>(
        'user_yard_assignments',
        'is_active',
        { user_id: userId, yard_id: yardId, is_active: true }
      );

      return assignment?.is_active || false;
    } catch (error) {
      console.error('Failed to check yard access:', error);
      return false;
    }
  }

  /**
   * Get users with access to specific yard
   */
  async getUsersByYard(yardId: string): Promise<User[]> {
    try {
      const users = await dbService.query<DatabaseUser>(`
        SELECT u.* FROM users u
        JOIN user_yard_assignments uya ON u.id = uya.user_id
        WHERE uya.yard_id = $1 AND uya.is_active = true AND u.is_active = true
        ORDER BY u.name
      `, [yardId]);

      const usersWithAccess = await Promise.all(
        users.rows.map(async (user) => {
          const moduleAccess = await this.getUserModuleAccess(user.id);
          const yardAssignments = await this.getUserYardAssignments(user.id);
          return this.mapDatabaseUserToUser(user, moduleAccess, yardAssignments);
        })
      );

      return usersWithAccess;
    } catch (error) {
      console.error('Failed to get users by yard:', error);
      return [];
    }
  }

  /**
   * Update user last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      await dbService.update('users',
        { last_login: new Date().toISOString() },
        { id: userId }
      );
    } catch (error) {
      console.error('Failed to update last login:', error);
    }
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<any[]> {
    try {
      return await dbService.select(
        'user_sessions',
        '*',
        { user_id: userId, is_active: true },
        'last_activity DESC'
      );
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Create user session
   */
  async createUserSession(userId: string, sessionToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      await dbService.insert('user_sessions', {
        user_id: userId,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        is_active: true,
      });
    } catch (error) {
      console.error('Failed to create user session:', error);
    }
  }

  /**
   * Invalidate user session
   */
  async invalidateUserSession(sessionToken: string): Promise<void> {
    try {
      await dbService.update('user_sessions',
        { is_active: false },
        { session_token: sessionToken }
      );
    } catch (error) {
      console.error('Failed to invalidate session:', error);
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: User['role']): Promise<User[]> {
    try {
      const users = await dbService.select<DatabaseUser>(
        'users',
        '*',
        { role, is_active: true },
        'name ASC'
      );

      const usersWithAccess = await Promise.all(
        users.map(async (user) => {
          const moduleAccess = await this.getUserModuleAccess(user.id);
          const yardAssignments = await this.getUserYardAssignments(user.id);
          return this.mapDatabaseUserToUser(user, moduleAccess, yardAssignments);
        })
      );

      return usersWithAccess;
    } catch (error) {
      console.error('Failed to get users by role:', error);
      return [];
    }
  }

  /**
   * Search users by name or email
   */
  async searchUsers(searchTerm: string): Promise<User[]> {
    try {
      const users = await dbService.query<DatabaseUser>(`
        SELECT * FROM users
        WHERE (LOWER(name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1))
        AND is_active = true
        ORDER BY name ASC
        LIMIT 50
      `, [`%${searchTerm}%`]);

      const usersWithAccess = await Promise.all(
        users.rows.map(async (user) => {
          const moduleAccess = await this.getUserModuleAccess(user.id);
          const yardAssignments = await this.getUserYardAssignments(user.id);
          return this.mapDatabaseUserToUser(user, moduleAccess, yardAssignments);
        })
      );

      return usersWithAccess;
    } catch (error) {
      console.error('Failed to search users:', error);
      return [];
    }
  }

  /**
   * Grant module access to user
   */
  async grantModuleAccess(userId: string, moduleName: keyof ModuleAccess): Promise<void> {
    try {
      const exists = await dbService.exists('user_module_access', {
        user_id: userId,
        module_name: moduleName
      });

      if (exists) {
        await dbService.update('user_module_access',
          { has_access: true },
          { user_id: userId, module_name: moduleName }
        );
      } else {
        await dbService.insert('user_module_access', {
          user_id: userId,
          module_name: moduleName,
          has_access: true,
        });
      }
    } catch (error) {
      console.error('Failed to grant module access:', error);
      throw error;
    }
  }

  /**
   * Revoke module access from user
   */
  async revokeModuleAccess(userId: string, moduleName: keyof ModuleAccess): Promise<void> {
    try {
      await dbService.update('user_module_access',
        { has_access: false },
        { user_id: userId, module_name: moduleName }
      );
    } catch (error) {
      console.error('Failed to revoke module access:', error);
      throw error;
    }
  }

  /**
   * Assign user to yard
   */
  async assignUserToYard(userId: string, yardId: string): Promise<void> {
    try {
      const exists = await dbService.exists('user_yard_assignments', {
        user_id: userId,
        yard_id: yardId
      });

      if (exists) {
        await dbService.update('user_yard_assignments',
          { is_active: true },
          { user_id: userId, yard_id: yardId }
        );
      } else {
        await dbService.insert('user_yard_assignments', {
          user_id: userId,
          yard_id: yardId,
          is_active: true,
        });
      }
    } catch (error) {
      console.error('Failed to assign user to yard:', error);
      throw error;
    }
  }

  /**
   * Remove user from yard
   */
  async removeUserFromYard(userId: string, yardId: string): Promise<void> {
    try {
      await dbService.update('user_yard_assignments',
        { is_active: false },
        { user_id: userId, yard_id: yardId }
      );
    } catch (error) {
      console.error('Failed to remove user from yard:', error);
      throw error;
    }
  }
}

// Singleton instance
export const userService = new UserService();
