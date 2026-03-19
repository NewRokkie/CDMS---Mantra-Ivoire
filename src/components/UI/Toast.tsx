/**
 * Composant Toast moderne et élégant pour les notifications
 * Design glassmorphism avec animations fluides
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  X,
  Sparkles
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

interface ToastStyles {
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  iconBg: string;
  shadow: string;
  progressColor: string;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  duration = 5000,
  onClose
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [startTime] = useState(Date.now());
  const [remainingTime, setRemainingTime] = useState(duration);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  }, [id, onClose]);

  // Progress bar and auto-close logic
  useEffect(() => {
    if (duration <= 0) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        const elapsed = Date.now() - startTime;
        const newRemaining = Math.max(0, duration - elapsed);
        setRemainingTime(newRemaining);
        setProgress((newRemaining / duration) * 100);

        if (newRemaining <= 0) {
          handleClose();
        }
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration, isPaused, startTime, handleClose]);

  // Get styles based on type
  const getStyles = (): ToastStyles => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="h-5 w-5" />,
          gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
          borderColor: 'border-emerald-500/30',
          iconBg: 'bg-emerald-500/20 text-emerald-400',
          shadow: 'shadow-emerald-500/20',
          progressColor: 'bg-emerald-500'
        };
      case 'error':
        return {
          icon: <XCircle className="h-5 w-5" />,
          gradient: 'from-rose-500/10 via-red-500/5 to-transparent',
          borderColor: 'border-rose-500/30',
          iconBg: 'bg-rose-500/20 text-rose-400',
          shadow: 'shadow-rose-500/20',
          progressColor: 'bg-rose-500'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
          borderColor: 'border-amber-500/30',
          iconBg: 'bg-amber-500/20 text-amber-400',
          shadow: 'shadow-amber-500/20',
          progressColor: 'bg-amber-500'
        };
      case 'info':
        return {
          icon: <Info className="h-5 w-5" />,
          gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
          borderColor: 'border-blue-500/30',
          iconBg: 'bg-blue-500/20 text-blue-400',
          shadow: 'shadow-blue-500/20',
          progressColor: 'bg-blue-500'
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`
        relative overflow-hidden
        min-w-[320px] max-w-[420px]
        rounded-2xl border backdrop-blur-xl
        bg-white/80 dark:bg-slate-900/80
        ${styles.borderColor}
        ${styles.shadow}
        shadow-lg
        transition-all duration-300 ease-out
        ${isExiting 
          ? 'opacity-0 translate-x-full scale-95' 
          : 'opacity-100 translate-x-0 scale-100 animate-in slide-in-from-right-full'
        }
        hover:scale-[1.02] hover:shadow-xl
        group
      `}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background gradient effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-50`} />
      
      {/* Subtle sparkle effect for success */}
      {type === 'success' && (
        <div className="absolute top-2 right-2 opacity-30">
          <Sparkles className="h-3 w-3 text-emerald-400 animate-pulse" />
        </div>
      )}

      {/* Main content */}
      <div className="relative flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`
          flex-shrink-0 flex items-center justify-center
          w-10 h-10 rounded-xl
          ${styles.iconBg}
          transition-transform duration-300 group-hover:scale-110
        `}>
          {styles.icon}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="
            flex-shrink-0
            p-1.5 rounded-lg
            text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
            hover:bg-slate-100 dark:hover:bg-slate-800
            transition-all duration-200
            opacity-0 group-hover:opacity-100
            focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-300
          "
          aria-label="Fermer la notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200/50 dark:bg-slate-700/50">
          <div
            className={`h-full ${styles.progressColor} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Hook personnalisé pour utiliser le toast avec des animations supplémentaires
export const useAnimatedToast = () => {
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; message: string }>>([]);

  const addToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    toasts,
    addToast,
    removeToast,
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    warning: (message: string) => addToast('warning', message),
    info: (message: string) => addToast('info', message)
  };
};

export default Toast;
