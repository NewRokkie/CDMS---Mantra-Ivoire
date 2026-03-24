import { useState, useCallback } from 'react';

export const useModal = (initialOpen = false) => {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isLoading, setIsLoading] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const setLoadingState = useCallback((loading: boolean, _message?: string) => {
    setIsLoading(loading);
  }, []);

  return {
    isOpen,
    isLoading,
    openModal,
    closeModal,
    setLoadingState
  };
};
