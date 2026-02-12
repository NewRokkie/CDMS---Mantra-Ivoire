import React, { createContext, ReactNode } from 'react';
import type { User as AppUser, ModuleAccess } from '../types';

export interface SyncStatus {
    isHealthy: boolean;
    lastSyncAt?: Date;
    inconsistencyCount: number;
    failedSyncCount: number;
    nextScheduledSync?: Date;
}

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode; value: AuthContextType }> = ({ children, value }) => {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
