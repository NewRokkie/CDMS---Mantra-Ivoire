import React from 'react';
import { useTheme } from '../../../hooks/useTheme';

interface TransactionSwitchProps {
  value: 'Retour Livraison' | 'Transfert (IN)';
  onChange: (value: 'Retour Livraison' | 'Transfert (IN)') => void;
  disabled?: boolean;
}

export const TransactionSwitch: React.FC<TransactionSwitchProps> = ({ 
  value, 
  onChange, 
  disabled = false 
}) => {
  const { theme } = useTheme();
  const isTransfert = value === 'Transfert (IN)';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Transaction *
      </label>
      <div className="flex items-center justify-center space-x-4 py-2">
        <span className={`text-base font-medium ${!isTransfert ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
          Retour Livraison
        </span>
        <button
          type="button"
          onClick={() => !disabled && onChange(isTransfert ? 'Retour Livraison' : 'Transfert (IN)')}
          disabled={disabled}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
            isTransfert ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg ${
              isTransfert ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-base font-medium ${isTransfert ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
          Transfert (IN)
        </span>
      </div>
    </div>
  );
};