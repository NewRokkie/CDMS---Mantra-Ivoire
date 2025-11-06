import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { NotificationProps } from '../types';

export const NotificationArea: React.FC<NotificationProps> = ({
  notification,
  onDismiss
}) => {
  const { type, message, show, autoHide = true, duration = 1500 } = notification;

  useEffect(() => {
    if (show && autoHide && type === 'success') {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, autoHide, duration, type, onDismiss]);

  if (!show) return null;

  const getNotificationStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-100 text-green-800 border border-green-200',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'error':
        return {
          container: 'bg-red-100 text-red-800 border border-red-200',
          icon: AlertCircle,
          iconColor: 'text-red-600'
        };
      case 'warning':
        return {
          container: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
          icon: AlertTriangle,
          iconColor: 'text-yellow-600'
        };
      case 'info':
        return {
          container: 'bg-blue-100 text-blue-800 border border-blue-200',
          icon: Info,
          iconColor: 'text-blue-600'
        };
      default:
        return {
          container: 'bg-gray-100 text-gray-800 border border-gray-200',
          icon: Info,
          iconColor: 'text-gray-600'
        };
    }
  };

  const styles = getNotificationStyles();
  const IconComponent = styles.icon;

  return (
    <div className={`mt-4 p-3 rounded-lg flex items-center space-x-2 animate-slide-in-down ${styles.container}`}>
      <IconComponent className={`h-5 w-5 flex-shrink-0 ${styles.iconColor}`} />
      <span className="text-sm font-medium flex-1">{message}</span>
      {type === 'error' && (
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800 ml-2"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
};