import React from 'react';

interface AlimentaireSwitchProps {
  value: 'divers' | 'alimentaire';
  onChange: (value: 'divers' | 'alimentaire') => void;
  disabled?: boolean;
}

export const AlimentaireSwitch: React.FC<AlimentaireSwitchProps> = ({ 
  value, 
  onChange, 
  disabled = false 
}) => {
  const isAlimentaire = value === 'alimentaire';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Container Classification *
      </label>
      <div className="flex items-center justify-center space-x-4 py-2">
        <span className={`text-base font-medium ${!isAlimentaire ? 'text-blue-600' : 'text-gray-500'}`}>
          DIVERS
        </span>
        <button
          type="button"
          onClick={() => !disabled && onChange(isAlimentaire ? 'divers' : 'alimentaire')}
          disabled={disabled}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isAlimentaire ? 'bg-green-600' : 'bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg ${
              isAlimentaire ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-base font-medium ${isAlimentaire ? 'text-green-600' : 'text-gray-500'}`}>
          ALIMENTAIRE
        </span>
      </div>
    </div>
  );
};