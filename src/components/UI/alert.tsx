/**
 * Composant Alert moderne et élégant
 * Design glassmorphism avec variantes enrichies
 */

import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  X,
  AlertOctagon
} from 'lucide-react';

export type AlertVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

interface AlertProps {
  className?: string;
  variant?: AlertVariant;
  children: React.ReactNode;
  onDismiss?: () => void;
  title?: string;
  icon?: React.ReactNode;
}

interface AlertDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

// Configuration des styles par variante
const variantStyles: Record<AlertVariant, {
  container: string;
  icon: React.ReactNode;
  iconBg: string;
  borderColor: string;
  gradient: string;
  shadow: string;
}> = {
  default: {
    container: 'bg-slate-50/80 dark:bg-slate-900/80 border-slate-200/50 dark:border-slate-700/50',
    icon: <Info className="h-5 w-5" />,
    iconBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
    borderColor: 'border-slate-200/50 dark:border-slate-700/50',
    gradient: 'from-slate-500/5 via-transparent to-transparent',
    shadow: 'shadow-slate-500/10',
  },
  destructive: {
    container: 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-800/30',
    icon: <XCircle className="h-5 w-5" />,
    iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    borderColor: 'border-rose-200/50 dark:border-rose-800/30',
    gradient: 'from-rose-500/10 via-red-500/5 to-transparent',
    shadow: 'shadow-rose-500/10',
  },
  success: {
    container: 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30',
    icon: <CheckCircle2 className="h-5 w-5" />,
    iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-200/50 dark:border-emerald-800/30',
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent',
    shadow: 'shadow-emerald-500/10',
  },
  warning: {
    container: 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30',
    icon: <AlertTriangle className="h-5 w-5" />,
    iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200/50 dark:border-amber-800/30',
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    shadow: 'shadow-amber-500/10',
  },
  info: {
    container: 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30',
    icon: <Info className="h-5 w-5" />,
    iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200/50 dark:border-blue-800/30',
    gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
    shadow: 'shadow-blue-500/10',
  },
};

export const Alert: React.FC<AlertProps> = ({ 
  className = '', 
  variant = 'default', 
  children,
  onDismiss,
  title,
  icon
}) => {
  const styles = variantStyles[variant];

  return (
    <div 
      className={`
        relative overflow-hidden
        rounded-xl border backdrop-blur-xl
        ${styles.container}
        ${styles.borderColor}
        ${styles.shadow}
        shadow-sm
        transition-all duration-300
        hover:shadow-md
        group
        ${className}
      `}
      role="alert"
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-60`} />
      
      {/* Content */}
      <div className="relative flex gap-3 p-4">
        {/* Icon */}
        <div className={`
          flex-shrink-0 flex items-center justify-center
          w-10 h-10 rounded-xl
          ${styles.iconBg}
          transition-transform duration-300 group-hover:scale-110
        `}>
          {icon || styles.icon}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {title && (
            <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {title}
            </h5>
          )}
          <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {children}
          </div>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="
              flex-shrink-0
              p-1.5 rounded-lg
              text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-all duration-200
              opacity-0 group-hover:opacity-100
              focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-300
            "
            aria-label="Fermer l'alerte"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Bottom accent line */}
      <div className={`
        absolute bottom-0 left-0 right-0 h-0.5
        bg-gradient-to-r ${styles.gradient.replace('/5', '/30').replace('/10', '/40')}
        opacity-50
      `} />
    </div>
  );
};

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={`text-sm [&_p]:leading-relaxed ${className}`}>
      {children}
    </div>
  );
};

// Composant Alert enrichi avec icône personnalisée
export const AlertWithIcon: React.FC<AlertProps> = (props) => {
  return <Alert {...props} />;
};

// Composant Alert compact pour les formulaires
export const AlertCompact: React.FC<Omit<AlertProps, 'children'> & { message: string }> = ({ 
  message,
  ...props 
}) => {
  const styles = variantStyles[props.variant || 'default'];

  return (
    <div 
      className={`
        relative overflow-hidden
        rounded-lg border backdrop-blur-xl
        ${styles.container}
        ${styles.borderColor}
        shadow-sm
        transition-all duration-300
        ${props.className || ''}
      `}
      role="alert"
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${styles.gradient} opacity-50`} />
      
      <div className="relative flex items-center gap-2 px-3 py-2">
        <div className={`${styles.iconBg} rounded-lg p-1`}>
          {props.icon || styles.icon}
        </div>
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 flex-1">
          {message}
        </span>
        {props.onDismiss && (
          <button
            onClick={props.onDismiss}
            className="
              p-1 rounded
              text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-colors
            "
            aria-label="Fermer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
