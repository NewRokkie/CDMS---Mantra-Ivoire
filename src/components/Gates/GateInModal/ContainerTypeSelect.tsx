import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Container type options with codes
export const containerTypeOptions = [
  { value: 'standard', label: 'Standard', code20: '22G1', code40: '42G1' },
  { value: 'hi_cube', label: 'Hi-Cube', code20: '25G1', code40: '45G1' },
  { value: 'hard_top', label: 'Hard Top', code20: '22H1', code40: '42H1' },
  { value: 'ventilated', label: 'Ventilated', code20: '22V1', code40: '42V1' },
  { value: 'reefer', label: 'Reefer', code20: '22R1', code40: '42R1' },
  { value: 'tank', label: 'Tank', code20: '22T1', code40: '42T1' },
  { value: 'flat_rack', label: 'Flat Rack', code20: '22P1', code40: '42P1' },
  { value: 'open_top', label: 'Open Top', code20: '22U1', code40: '42U1' },
];

interface ContainerTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  containerSize: '20ft' | '40ft';
}

export const ContainerTypeSelect: React.FC<ContainerTypeSelectProps> = ({ value, onChange, containerSize }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = containerTypeOptions.find(option => option.value === value);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Container Type *
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-input w-full flex items-center justify-between text-left cursor-pointer"
      >
        <div>
          <span className="truncate">
            {selectedOption ? selectedOption.label : 'Select container type'} -
          </span>
          {selectedOption && (
            <span className="text-blue-600 font-medium">
              {containerSize === '20ft' ? selectedOption.code20 : selectedOption.code40}
            </span>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
          <ul className="py-1">
            {containerTypeOptions.map((option) => (
              <li
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`px-4 py-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                  value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="block font-medium">{option.label}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {containerSize === '20ft' ? option.code20 : option.code40}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
