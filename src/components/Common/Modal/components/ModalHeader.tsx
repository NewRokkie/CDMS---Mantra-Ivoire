import React from 'react';
import { X } from 'lucide-react';
import { ModalHeaderProps } from '../types';

export const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  subtitle,
  icon: Icon,
  onClose,
  showCloseButton = true,
  gradient = 'from-white/70 to-gray-50/50 dark:from-gray-800/70 dark:to-gray-900/50',
  iconColor = 'text-white bg-blue-600 shadow-lg shadow-blue-500/30',
  children
}) => {
  return (
    <div className={`relative overflow-hidden border-b border-gray-200/50 dark:border-gray-700/50 backdrop-blur-xl bg-gradient-to-r ${gradient} rounded-t-2xl animate-in fade-in slide-in-from-bottom-2 duration-400 flex-shrink-0`}>
      
      {/* Lueur décorative subtile */}
      <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />

      <div className="relative px-4 sm:px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Conteneur d'icône optimisé */}
            {Icon && (
              <div className={`shrink-0 p-2.5 rounded-xl transition-transform hover:scale-110 ${iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            )}
            
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight tracking-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {subtitle}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bouton de fermeture avec micro-interactions */}
          <div className="flex items-center">
            {showCloseButton && onClose && (
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="group shrink-0 text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 active:scale-90"
              >
                <X className="h-5 w-5 transition-transform group-hover:rotate-90 duration-300" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Contenu additionnel (ex: Onglets, Filtres) */}
      {children && (
        <div className="px-4 sm:px-6 pb-4 animate-in fade-in duration-500">
          {children}
        </div>
      )}
    </div>
  );
};