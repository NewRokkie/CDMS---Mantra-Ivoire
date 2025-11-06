import { useState, useCallback } from 'react';
import { NotificationState } from '../types';

export const useModal = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationState>({
    type: 'info',
    message: '',
    show: false,
    autoHide: true,
    duration: 1500
  });

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Clear notification when closing modal
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  const showNotification = useCallback((
    type: NotificationState['type'],
    message: string,
    options?: { autoHide?: boolean; duration?: number }
  ) => {
    setNotification({
      type,
      message,
      show: true,
      autoHide: options?.autoHide ?? (type === 'success'),
      duration: options?.duration ?? 1500
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  const setLoadingState = useCallback((loading: boolean, message?: string) => {
    setIsLoading(loading);
  }, []);

  return {
    isOpen,
    isLoading,
    notification,
    openModal,
    closeModal,
    showNotification,
    hideNotification,
    setLoadingState
  };
};