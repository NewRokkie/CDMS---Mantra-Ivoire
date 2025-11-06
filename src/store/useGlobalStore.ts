import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Container, Client, User, BookingReference } from '../types';
import { GateInOperation, GateOutOperation, AuditLogEntry } from '../types/operations';
import { MOCK_CONTAINERS, MOCK_CLIENTS, MOCK_USERS, MOCK_RELEASE_ORDERS } from '../data/mockData';

interface GlobalStore {
  containers: Container[];
  clients: Client[];
  users: User[];
  bookingReferences: BookingReference[];
  gateInOperations: GateInOperation[];
  gateOutOperations: GateOutOperation[];
  auditLogs: AuditLogEntry[];

  addContainer: (container: Container) => void;
  updateContainer: (id: string, updates: Partial<Container>) => void;
  deleteContainer: (id: string) => void;
  getContainerById: (id: string) => Container | undefined;
  getContainersByClient: (clientCode: string) => Container[];
  getContainersByYard: (yardId: string) => Container[];
  getContainersByStatus: (status: Container['status']) => Container[];

  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
  getClientByCode: (code: string) => Client | undefined;

  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  getUserById: (id: string) => User | undefined;

  addBookingReference: (order: BookingReference) => void;
  updateBookingReference: (id: string, updates: Partial<BookingReference>) => void;
  deleteBookingReference: (id: string) => void;
  getBookingReferenceById: (id: string) => BookingReference | undefined;
  getBookingReferencesByClient: (clientCode: string) => BookingReference[];
  getBookingReferencesByStatus: (status: BookingReference['status']) => BookingReference[];

  addGateInOperation: (operation: GateInOperation) => void;
  updateGateInOperation: (id: string, updates: Partial<GateInOperation>) => void;
  getGateInOperations: (filters?: { yardId?: string; status?: string; dateRange?: [Date, Date] }) => GateInOperation[];

  addGateOutOperation: (operation: GateOutOperation) => void;
  updateGateOutOperation: (id: string, updates: Partial<GateOutOperation>) => void;
  getGateOutOperations: (filters?: { yardId?: string; status?: string; dateRange?: [Date, Date] }) => GateOutOperation[];

  addAuditLog: (log: AuditLogEntry) => void;
  getAuditLogs: (filters?: { entityType?: string; entityId?: string; userId?: string; dateRange?: [Date, Date] }) => AuditLogEntry[];

  processGateIn: (data: {
    containerNumber: string;
    clientCode: string;
    containerType: string;
    containerSize: string;
    transportCompany: string;
    driverName: string;
    vehicleNumber: string;
    location: string;
    weight?: number;
    operatorId: string;
    operatorName: string;
    yardId: string;
    damageReported?: boolean;
    damageDescription?: string;
    damageAssessment?: {
      hasDamage: boolean;
      damageType?: string;
      damageDescription?: string;
      assessmentStage: 'assignment' | 'inspection'; // Updated to reflect new workflow
      assessedBy: string;
      assessedAt: Date;
    };
  }) => { success: boolean; containerId?: string; error?: string };

  processGateOut: (data: {
    bookingReferenceId: string;
    containerIds: string[];
    transportCompany: string;
    driverName: string;
    vehicleNumber: string;
    operatorId: string;
    operatorName: string;
    yardId: string;
  }) => { success: boolean; error?: string };

  initializeStore: () => void;
  resetStore: () => void;
}

export const useGlobalStore = create<GlobalStore>()(
  devtools(
    persist(
      (set, get) => ({
        containers: [],
        clients: [],
        users: [],
        bookingReferences: [],
        gateInOperations: [],
        gateOutOperations: [],
        auditLogs: [],

        addContainer: (container) =>
          set((state) => {
            const auditLog: AuditLogEntry = {
              id: `audit-${Date.now()}`,
              entityType: 'container',
              entityId: container.id,
              action: 'create',
              userId: container.createdBy,
              userName: container.createdBy,
              userRole: 'system',
              timestamp: new Date(),
              description: `Container ${container.number} added to system`
            };

            return {
              containers: [...state.containers, container],
              auditLogs: [...state.auditLogs, auditLog]
            };
          }),

        updateContainer: (id, updates) =>
          set((state) => {
            const oldContainer = state.containers.find(c => c.id === id);
            const changes = oldContainer ? Object.keys(updates).map(key => ({
              field: key,
              oldValue: (oldContainer as any)[key],
              newValue: (updates as any)[key]
            })) : [];

            const auditLog: AuditLogEntry = {
              id: `audit-${Date.now()}`,
              entityType: 'container',
              entityId: id,
              action: 'update',
              userId: updates.updatedBy || 'system',
              userName: updates.updatedBy || 'System',
              userRole: 'system',
              timestamp: new Date(),
              changes,
              description: `Container ${oldContainer?.number} updated`
            };

            return {
              containers: state.containers.map(c =>
                c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
              ),
              auditLogs: [...state.auditLogs, auditLog]
            };
          }),

        deleteContainer: (id) =>
          set((state) => {
            const container = state.containers.find(c => c.id === id);
            const auditLog: AuditLogEntry = {
              id: `audit-${Date.now()}`,
              entityType: 'container',
              entityId: id,
              action: 'delete',
              userId: 'system',
              userName: 'System',
              userRole: 'system',
              timestamp: new Date(),
              description: `Container ${container?.number} deleted`
            };

            return {
              containers: state.containers.filter(c => c.id !== id),
              auditLogs: [...state.auditLogs, auditLog]
            };
          }),

        getContainerById: (id) => get().containers.find(c => c.id === id),

        getContainersByClient: (clientCode) =>
          get().containers.filter(c => c.clientCode === clientCode),

        getContainersByYard: (yardId) =>
          get().containers.filter(c => c.location?.includes(yardId)),

        getContainersByStatus: (status) =>
          get().containers.filter(c => c.status === status),

        addClient: (client) =>
          set((state) => ({
            clients: [...state.clients, client]
          })),

        updateClient: (id, updates) =>
          set((state) => ({
            clients: state.clients.map(c =>
              c.id === id ? { ...c, ...updates, updatedAt: new Date() } : c
            )
          })),

        deleteClient: (id) =>
          set((state) => ({
            clients: state.clients.filter(c => c.id !== id)
          })),

        getClientById: (id) => get().clients.find(c => c.id === id),

        getClientByCode: (code) => get().clients.find(c => c.code === code),

        addUser: (user) =>
          set((state) => ({
            users: [...state.users, user]
          })),

        updateUser: (id, updates) =>
          set((state) => ({
            users: state.users.map(u =>
              u.id === id ? { ...u, ...updates } : u
            )
          })),

        deleteUser: (id) =>
          set((state) => ({
            users: state.users.filter(u => u.id !== id)
          })),

        getUserById: (id) => get().users.find(u => u.id === id),

        addBookingReference: (order: BookingReference) =>
          set((state) => {
            const auditLog: AuditLogEntry = {
              id: `audit-${Date.now()}`,
              entityType: 'booking_reference',
              entityId: order.id,
              action: 'create',
              userId: order.createdBy,
              userName: order.createdBy,
              userRole: 'system',
              timestamp: new Date(),
              description: `Release order ${order.bookingNumber} created for ${order.clientName}`
            };

            return {
              bookingReferences: [...state.bookingReferences, order],
              auditLogs: [...state.auditLogs, auditLog]
            };
          }),

        updateBookingReference: (id, updates) =>
          set((state) => ({
            bookingReferences: state.bookingReferences.map(br =>
              br.id === id ? { ...br, ...updates } : br
            )
          })),

        deleteBookingReference: (id) =>
          set((state) => ({
            bookingReferences: state.bookingReferences.filter(br => br.id !== id)
          })),

        getBookingReferenceById: (id) => get().bookingReferences.find(br => br.id === id),

        getBookingReferencesByClient: (clientCode) =>
          get().bookingReferences.filter(br => br.clientCode === clientCode),

        getBookingReferencesByStatus: (status) =>
          get().bookingReferences.filter(br => br.status === status),

        addGateInOperation: (operation) =>
          set((state) => ({
            gateInOperations: [...state.gateInOperations, operation]
          })),

        updateGateInOperation: (id, updates) =>
          set((state) => ({
            gateInOperations: state.gateInOperations.map(op =>
              op.id === id ? { ...op, ...updates } : op
            )
          })),

        getGateInOperations: (filters) => {
          let operations = get().gateInOperations;

          if (filters?.yardId) {
            operations = operations.filter(op => op.yardId === filters.yardId);
          }

          if (filters?.status) {
            operations = operations.filter(op => op.status === filters.status);
          }

          if (filters?.dateRange) {
            const [start, end] = filters.dateRange;
            operations = operations.filter(op =>
              op.createdAt >= start && op.createdAt <= end
            );
          }

          return operations;
        },

        addGateOutOperation: (operation) =>
          set((state) => ({
            gateOutOperations: [...state.gateOutOperations, operation]
          })),

        updateGateOutOperation: (id, updates) =>
          set((state) => ({
            gateOutOperations: state.gateOutOperations.map(op =>
              op.id === id ? { ...op, ...updates } : op
            )
          })),

        getGateOutOperations: (filters) => {
          let operations = get().gateOutOperations;

          if (filters?.yardId) {
            operations = operations.filter(op => op.yardId === filters.yardId);
          }

          if (filters?.status) {
            operations = operations.filter(op => op.status === filters.status);
          }

          if (filters?.dateRange) {
            const [start, end] = filters.dateRange;
            operations = operations.filter(op =>
              op.createdAt >= start && op.createdAt <= end
            );
          }

          return operations;
        },

        addAuditLog: (log) =>
          set((state) => ({
            auditLogs: [...state.auditLogs, log]
          })),

        getAuditLogs: (filters) => {
          let logs = get().auditLogs;

          if (filters?.entityType) {
            logs = logs.filter(log => log.entityType === filters.entityType);
          }

          if (filters?.entityId) {
            logs = logs.filter(log => log.entityId === filters.entityId);
          }

          if (filters?.userId) {
            logs = logs.filter(log => log.userId === filters.userId);
          }

          if (filters?.dateRange) {
            const [start, end] = filters.dateRange;
            logs = logs.filter(log =>
              log.timestamp >= start && log.timestamp <= end
            );
          }

          return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        },

        processGateIn: (data) => {
          const client = get().getClientByCode(data.clientCode);
          if (!client) {
            return { success: false, error: 'Client not found' };
          }

          const existingContainer = get().containers.find(
            c => c.number === data.containerNumber
          );

          if (existingContainer) {
            return { success: false, error: 'Container already exists in system' };
          }

          const containerId = `cont-${Date.now()}`;
          const operationId = `gi-${Date.now()}`;

          const newContainer: Container = {
            id: containerId,
            number: data.containerNumber,
            type: data.containerType as any,
            size: data.containerSize as any,
            status: 'in_depot',
            location: data.location,
            gateInDate: new Date(),
            client: client.name,
            clientId: client.id,
            clientCode: client.code,
            weight: data.weight,
            createdBy: data.operatorName,
            createdAt: new Date(),
            updatedAt: new Date(),
            damage: data.damageAssessment?.hasDamage && data.damageAssessment.damageDescription
              ? [data.damageAssessment.damageDescription]
              : (data.damageReported && data.damageDescription ? [data.damageDescription] : undefined)
          };

          const gateInOperation: GateInOperation = {
            id: operationId,
            containerNumber: data.containerNumber,
            containerId,
            clientCode: data.clientCode,
            clientName: client.name,
            containerType: data.containerType,
            containerSize: data.containerSize,
            transportCompany: data.transportCompany,
            driverName: data.driverName,
            vehicleNumber: data.vehicleNumber,
            assignedLocation: data.location,
            damageReported: data.damageAssessment?.hasDamage || data.damageReported || false,
            damageDescription: data.damageAssessment?.damageDescription || data.damageDescription,
            damageAssessment: data.damageAssessment,
            weight: data.weight,
            status: 'completed',
            operatorId: data.operatorId,
            operatorName: data.operatorName,
            createdAt: new Date(),
            completedAt: new Date(),
            yardId: data.yardId,
            ediTransmitted: false
          };

          get().addContainer(newContainer);
          get().addGateInOperation(gateInOperation);

          return { success: true, containerId };
        },

        processGateOut: (data) => {
          const bookingReference = get().getBookingReferenceById(data.bookingReferenceId);
          if (!bookingReference) {
            return { success: false, error: 'Booking reference not found' };
          }

          const containers = data.containerIds
            .map(id => get().getContainerById(id))
            .filter(Boolean) as Container[];

          if (containers.length !== data.containerIds.length) {
            return { success: false, error: 'One or more containers not found' };
          }

          const operationId = `go-${Date.now()}`;

          const gateOutOperation: GateOutOperation = {
            id: operationId,
            date: new Date(),
            bookingNumber: bookingReference.bookingNumber,
            clientCode: bookingReference.clientCode || '',
            clientName: bookingReference.clientName,
            bookingType: bookingReference.bookingType,
            totalContainers: bookingReference.totalContainers,
            processedContainers: data.containerIds.length,
            remainingContainers: bookingReference.remainingContainers - data.containerIds.length,
            transportCompany: data.transportCompany,
            driverName: data.driverName,
            vehicleNumber: data.vehicleNumber,
            status: 'completed',
            createdBy: data.operatorName,
            createdAt: new Date(),
            completedAt: new Date(),
            yardId: data.yardId,
            ediTransmitted: false,
            processedContainerIds: data.containerIds,
            bookingReferenceId: data.bookingReferenceId
          };

          data.containerIds.forEach(id => {
            get().updateContainer(id, {
              status: 'out_depot',
              gateOutDate: new Date(),
              updatedBy: data.operatorName
            });
          });

          get().updateBookingReference(data.bookingReferenceId, {
            remainingContainers: bookingReference.remainingContainers - data.containerIds.length,
            status: bookingReference.remainingContainers - data.containerIds.length === 0
              ? 'completed'
              : 'in_process'
          });

          get().addGateOutOperation(gateOutOperation);

          return { success: true };
        },

        initializeStore: () => {
          const state = get();
          if (state.containers.length === 0) {
            set({
              containers: MOCK_CONTAINERS,
              clients: MOCK_CLIENTS,
              users: MOCK_USERS,
              bookingReferences: MOCK_RELEASE_ORDERS,
              gateInOperations: [],
              gateOutOperations: [],
              auditLogs: []
            });
          }
        },

        resetStore: () => {
          set({
            containers: MOCK_CONTAINERS,
            clients: MOCK_CLIENTS,
            users: MOCK_USERS,
            bookingReferences: MOCK_RELEASE_ORDERS,
            gateInOperations: [],
            gateOutOperations: [],
            auditLogs: []
          });
        }
      }),
      {
        name: 'depot-storage',
        partialize: (state) => ({
          containers: state.containers,
          clients: state.clients,
          users: state.users,
          bookingReferences: state.bookingReferences,
          gateInOperations: state.gateInOperations,
          gateOutOperations: state.gateOutOperations,
          auditLogs: state.auditLogs
        })
      }
    )
  )
);
