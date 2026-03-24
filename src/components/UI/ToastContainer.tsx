/**
 * Conteneur pour les toasts de notification
 * Positionnement optimisé avec animations fluides
 */

import React from 'react';
import { Toast, ToastType } from './Toast';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="
        fixed top-4 right-auto left-1/2 -translate-x-1/2 z-[9999]
        flex flex-col gap-3
        w-[420px] max-w-[calc(100vw-2rem)]
        p-4
        lg:left-auto lg:right-4 lg:translate-x-0
      "
      style={{ pointerEvents: 'none' }}
    >
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          <Toast
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={onClose}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
