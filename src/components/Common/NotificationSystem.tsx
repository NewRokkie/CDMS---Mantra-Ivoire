import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timeoutRefs = useRef(new Map<string, NodeJS.Timeout>());
  const idCounter = useRef(0);

  // Fonction pour nettoyer toutes les notifications
  const clearNotifications = useCallback(() => {
    // Nettoyer tous les timers
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();

    // Réinitialiser les notifications
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));

    // Clear the timeout if it exists
    if (timeoutRefs.current.has(id)) {
      clearTimeout(timeoutRefs.current.get(id)!);
      timeoutRefs.current.delete(id);
    }
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    // Limiter le nombre de notifications affichées simultanément
    const MAX_NOTIFICATIONS = 5;
    if (notifications.length >= MAX_NOTIFICATIONS) {
      // Supprimer la plus ancienne notification si la limite est atteinte
      const oldestNotification = notifications[0];
      if (oldestNotification) {
        removeNotification(oldestNotification.id);
      }
    }

    const id = `${Date.now()}-${idCounter.current++}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? (notification.type === 'error' ? 7000 : 5000),
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration if duration is not 0
    if (newNotification.duration && newNotification.duration > 0) {
      const timeoutId = setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);

      // Store timeout reference
      timeoutRefs.current.set(id, timeoutId);
    }
  }, [removeNotification, notifications.length]);

  const showSuccess = useCallback((title: string, message?: string) => {
    addNotification({ type: 'success', title, message });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string) => {
    addNotification({ type: 'error', title, message, duration: 7000 });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string) => {
    addNotification({ type: 'warning', title, message });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string) => {
    addNotification({ type: 'info', title, message });
  }, [addNotification]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        width: '360px',
        maxWidth: 'calc(100vw - 2rem)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRemove }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div
      className={`w-full ${getBackgroundColor()} border rounded-xl shadow-lg p-4`}
      style={{ pointerEvents: 'auto', boxSizing: 'border-box' }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">
            {notification.title}
          </p>
          {notification.message && (
            <p className="mt-1 text-sm text-gray-600 leading-snug break-words">
              {notification.message}
            </p>
          )}
        </div>
        <button
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
          onClick={() => onRemove(notification.id)}
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
