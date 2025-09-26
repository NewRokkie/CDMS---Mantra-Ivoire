/**
 * Adaptateur de Base de Données - Transition entre PostgreSQL et Supabase
 * Permet un basculement facile entre les deux systèmes selon la configuration
 */

import { DatabaseService, dbService } from './database/DatabaseService';
import { UserService, userService } from './database/UserService';
import { ContainerService, containerService } from './database/ContainerService';

import {
  SupabaseServices,
  userSupabaseService,
  containerSupabaseService,
  supabaseService
} from './supabase';

import { User, Container } from '../types';

// Interface unifiée pour les services de base de données
export interface UnifiedDatabaseService {
  // Services de base
  testConnection(): Promise<any>;
  healthCheck(): Promise<boolean>;

  // Services utilisateurs
  authenticateUser(email: string, password: string): Promise<User | null>;
  getUserById(userId: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: any): Promise<User | null>;
  updateUser(userId: string, updates: Partial<User>): Promise<User | null>;
  deleteUser(userId: string): Promise<boolean>;

  // Services conteneurs
  getAllContainers(filters?: any): Promise<Container[]>;
  getContainerByNumber(containerNumber: string): Promise<Container | null>;
  getContainerById(containerId: string): Promise<Container | null>;
  createContainer(containerData: any): Promise<Container | null>;
  updateContainer(containerId: string, updates: Partial<Container>): Promise<Container | null>;
  deleteContainer(containerId: string): Promise<boolean>;
  processGateIn(containerNumber: string, containerData: any, performedBy?: string): Promise<Container | null>;
  processGateOut(containerNumber: string, gateOutData: any, performedBy?: string): Promise<boolean>;
  searchContainers(searchTerm: string): Promise<Container[]>;
}

class PostgreSQLAdapter implements UnifiedDatabaseService {
  // Services PostgreSQL existants
  private dbService = dbService;
  private userService = userService;
  private containerService = containerService;

  async testConnection() {
    return this.dbService.testConnection();
  }

  async healthCheck(): Promise<boolean> {
    return this.dbService.healthCheck();
  }

  // Méthodes utilisateurs
  async authenticateUser(email: string, password: string): Promise<User | null> {
    return this.userService.authenticateUser(email, password);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userService.getUserById(userId);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }

  async createUser(userData: any): Promise<User | null> {
    return this.userService.createUser(userData);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    return this.userService.updateUser(userId, updates);
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.userService.deleteUser(userId);
  }

  // Méthodes conteneurs
  async getAllContainers(filters?: any): Promise<Container[]> {
    return this.containerService.getAllContainers(filters);
  }

  async getContainerByNumber(containerNumber: string): Promise<Container | null> {
    return this.containerService.getContainerByNumber(containerNumber);
  }

  async getContainerById(containerId: string): Promise<Container | null> {
    return this.containerService.getContainerById(containerId);
  }

  async createContainer(containerData: any): Promise<Container | null> {
    return this.containerService.createContainer(containerData);
  }

  async updateContainer(containerId: string, updates: Partial<Container>): Promise<Container | null> {
    return this.containerService.updateContainer(containerId, updates);
  }

  async deleteContainer(containerId: string): Promise<boolean> {
    return this.containerService.deleteContainer(containerId);
  }

  async processGateIn(containerNumber: string, containerData: any, performedBy?: string): Promise<Container | null> {
    return this.containerService.processGateIn(containerNumber, containerData, performedBy);
  }

  async processGateOut(containerNumber: string, gateOutData: any, performedBy?: string): Promise<boolean> {
    return this.containerService.processGateOut(containerNumber, gateOutData, performedBy);
  }

  async searchContainers(searchTerm: string): Promise<Container[]> {
    return this.containerService.searchContainers(searchTerm);
  }
}

class SupabaseAdapter implements UnifiedDatabaseService {
  // Services Supabase
  private supabaseService = supabaseService;
  private userService = userSupabaseService;
  private containerService = containerSupabaseService;

  async testConnection() {
    return this.supabaseService.testConnection();
  }

  async healthCheck(): Promise<boolean> {
    return this.supabaseService.healthCheck();
  }

  // Méthodes utilisateurs
  async authenticateUser(email: string, password: string): Promise<User | null> {
    return this.userService.authenticateUser(email, password);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userService.getUserById(userId);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }

  async createUser(userData: any): Promise<User | null> {
    return this.userService.createUser(userData);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    return this.userService.updateUser(userId, updates);
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.userService.deleteUser(userId);
  }

  // Méthodes conteneurs
  async getAllContainers(filters?: any): Promise<Container[]> {
    return this.containerService.getAllContainers(filters);
  }

  async getContainerByNumber(containerNumber: string): Promise<Container | null> {
    return this.containerService.getContainerByNumber(containerNumber);
  }

  async getContainerById(containerId: string): Promise<Container | null> {
    return this.containerService.getContainerById(containerId);
  }

  async createContainer(containerData: any): Promise<Container | null> {
    return this.containerService.createContainer(containerData);
  }

  async updateContainer(containerId: string, updates: Partial<Container>): Promise<Container | null> {
    return this.containerService.updateContainer(containerId, updates);
  }

  async deleteContainer(containerId: string): Promise<boolean> {
    return this.containerService.deleteContainer(containerId);
  }

  async processGateIn(containerNumber: string, containerData: any, performedBy?: string): Promise<Container | null> {
    return this.containerService.processGateIn(containerNumber, containerData, performedBy);
  }

  async processGateOut(containerNumber: string, gateOutData: any, performedBy?: string): Promise<boolean> {
    return this.containerService.processGateOut(containerNumber, gateOutData, performedBy);
  }

  async searchContainers(searchTerm: string): Promise<Container[]> {
    return this.containerService.searchContainers(searchTerm);
  }
}

// Adaptateur principal qui choisit automatiquement le bon service
class DatabaseAdapterService implements UnifiedDatabaseService {
  private adapter: UnifiedDatabaseService;
  private useSupabase: boolean;

  constructor() {
    // Déterminer quel service utiliser selon la configuration
    this.useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true';

    if (this.useSupabase) {
      console.log('🚀 Utilisation de Supabase comme base de données');
      this.adapter = new SupabaseAdapter();
    } else {
      console.log('🔧 Utilisation de PostgreSQL comme base de données (mode legacy)');
      this.adapter = new PostgreSQLAdapter();
    }
  }

  // Méthodes déléguées
  async testConnection() {
    return this.adapter.testConnection();
  }

  async healthCheck(): Promise<boolean> {
    return this.adapter.healthCheck();
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    return this.adapter.authenticateUser(email, password);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.adapter.getUserById(userId);
  }

  async getAllUsers(): Promise<User[]> {
    return this.adapter.getAllUsers();
  }

  async createUser(userData: any): Promise<User | null> {
    return this.adapter.createUser(userData);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    return this.adapter.updateUser(userId, updates);
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.adapter.deleteUser(userId);
  }

  async getAllContainers(filters?: any): Promise<Container[]> {
    return this.adapter.getAllContainers(filters);
  }

  async getContainerByNumber(containerNumber: string): Promise<Container | null> {
    return this.adapter.getContainerByNumber(containerNumber);
  }

  async getContainerById(containerId: string): Promise<Container | null> {
    return this.adapter.getContainerById(containerId);
  }

  async createContainer(containerData: any): Promise<Container | null> {
    return this.adapter.createContainer(containerData);
  }

  async updateContainer(containerId: string, updates: Partial<Container>): Promise<Container | null> {
    return this.adapter.updateContainer(containerId, updates);
  }

  async deleteContainer(containerId: string): Promise<boolean> {
    return this.adapter.deleteContainer(containerId);
  }

  async processGateIn(containerNumber: string, containerData: any, performedBy?: string): Promise<Container | null> {
    return this.adapter.processGateIn(containerNumber, containerData, performedBy);
  }

  async processGateOut(containerNumber: string, gateOutData: any, performedBy?: string): Promise<boolean> {
    return this.adapter.processGateOut(containerNumber, gateOutData, performedBy);
  }

  async searchContainers(searchTerm: string): Promise<Container[]> {
    return this.adapter.searchContainers(searchTerm);
  }

  // Méthodes utilitaires
  isUsingSupabase(): boolean {
    return this.useSupabase;
  }

  getCurrentAdapter(): string {
    return this.useSupabase ? 'Supabase' : 'PostgreSQL';
  }

  async switchToSupabase(): Promise<void> {
    if (!this.useSupabase) {
      this.useSupabase = true;
      this.adapter = new SupabaseAdapter();
      console.log('🔄 Basculé vers Supabase');
    }
  }

  async switchToPostgreSQL(): Promise<void> {
    if (this.useSupabase) {
      this.useSupabase = false;
      this.adapter = new PostgreSQLAdapter();
      console.log('🔄 Basculé vers PostgreSQL');
    }
  }
}

// Instance singleton de l'adaptateur
export const databaseAdapter = new DatabaseAdapterService();

// Export des adaptateurs individuels pour usage direct si nécessaire
export { PostgreSQLAdapter, SupabaseAdapter };

// Initialiser l'adaptateur
databaseAdapter.testConnection().then(() => {
  console.log(`✅ Adaptateur de base de données initialisé (${databaseAdapter.getCurrentAdapter()})`);
}).catch(error => {
  console.error('❌ Échec de l\'initialisation de l\'adaptateur:', error);
});
