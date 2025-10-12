import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  leftLabel: string;
  rightLabel: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, leftLabel, rightLabel, disabled = false }) => {
  return (
    <div className="space-y-4">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="flex items-center justify-center space-x-4 py-2">
        <span className={`text-base font-medium ${!checked ? 'text-blue-600' : 'text-gray-500'}`}>
          {leftLabel}
        </span>
        <button
          type="button"
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            checked ? 'bg-blue-600' : 'bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg ${
              checked ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-base font-medium ${checked ? 'text-blue-600' : 'text-gray-500'}`}>
          {rightLabel}
        </span>
      </div>
    </div>
  );
};
