import React from 'react';

interface TransactionOutSwitchProps {
  value: 'Positionnement' | 'Transfert (OUT)';
  onChange: (value: 'Positionnement' | 'Transfert (OUT)') => void;
  disabled?: boolean;
}

export const TransactionOutSwitch: React.FC<TransactionOutSwitchProps> = ({ 
  value, 
  onChange, 
  disabled = false 
}) => {
  const isTransfert = value === 'Transfert (OUT)';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Transaction Type *
      </label>
      <div className="flex items-center justify-center space-x-4 py-2">
        <span className={`text-base font-medium ${!isTransfert ? 'text-blue-600' : 'text-gray-500'}`}>
          Positionnement
        </span>
        <button
          type="button"
          onClick={() => !disabled && onChange(isTransfert ? 'Positionnement' : 'Transfert (OUT)')}
          disabled={disabled}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isTransfert ? 'bg-orange-600' : 'bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg ${
              isTransfert ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-base font-medium ${isTransfert ? 'text-orange-600' : 'text-gray-500'}`}>
          Transfert (OUT)
        </span>
      </div>
    </div>
  );
};