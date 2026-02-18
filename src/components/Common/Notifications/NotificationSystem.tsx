import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
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

  const clearAll = useCallback(() => {
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
      duration: notification.duration ?? (notification.type === 'error' ? 8000 : 5000)
    };

    // Empêcher l'ajout de notifications avec le même titre et message que la dernière
    const isDuplicate = notifications.some(
      n => n.title === newNotification.title && n.message === newNotification.message
    );

    if (isDuplicate) {
      return; // Ne pas ajouter de notification dupliquée
    }

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    if (newNotification.duration && newNotification.duration > 0) {
      const timeoutId = setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);

      // Store timeout reference
      timeoutRefs.current.set(id, timeoutId);
    }
  }, [removeNotification, notifications.length]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const { type, title, message, action } = notification;

  const getIcon = () => {
    switch (type) {
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

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className={`
      ${getStyles()}
      border rounded-lg p-4 shadow-lg backdrop-blur-sm
      transform transition-all duration-300 ease-in-out
      animate-in slide-in-from-right-full
    `}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-gilroy-bold">{title}</h4>
          {message && (
            <p className="text-sm font-gilroy opacity-90 mt-1">{message}</p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-gilroy-medium underline hover:no-underline mt-2"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Utility hooks for common notification types
export const useSuccessNotification = () => {
  const { addNotification } = useNotifications();

  return useCallback((title: string, message?: string) => {
    addNotification({
      type: 'success',
      title,
      message
    });
  }, [addNotification]);
};

export const useErrorNotification = () => {
  const { addNotification } = useNotifications();

  return useCallback((title: string, message?: string) => {
    addNotification({
      type: 'error',
      title,
      message,
      duration: 8000 // Longer duration for errors
    });
  }, [addNotification]);
};

export const useInfoNotification = () => {
  const { addNotification } = useNotifications();

  return useCallback((title: string, message?: string) => {
    addNotification({
      type: 'info',
      title,
      message
    });
  }, [addNotification]);
};

export const useWarningNotification = () => {
  const { addNotification } = useNotifications();

  return useCallback((title: string, message?: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: 7000
    });
  }, [addNotification]);
};
