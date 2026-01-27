import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { containerTypeOptions } from './../constants';

// Re-export containerTypeOptions so other modules importing from this file continue to work
export { containerTypeOptions };

// Helper function to get available container types for a given size
export const getAvailableContainerTypes = (containerSize: '20ft' | '40ft', isHighCube: boolean = false) => {
  if (isHighCube && containerSize === '40ft') {
    return containerTypeOptions.filter(option =>
      (option.availableSizesHC as readonly string[]).includes(containerSize)
    );
  }
  return containerTypeOptions.filter(option =>
    (option.availableSizes as readonly string[]).includes(containerSize)
  );
};

// Helper function to validate container type and size combination
export const isValidContainerTypeAndSize = (containerType: string, containerSize: '20ft' | '40ft', isHighCube: boolean = false): boolean => {
  const option = containerTypeOptions.find(opt => opt.value === containerType);
  if (!option) return false;

  if (isHighCube && containerSize === '40ft') {
    return (option.availableSizesHC as readonly string[]).includes(containerSize);
  }

  return (option.availableSizes as readonly string[]).includes(containerSize);
};

interface ContainerTypeSelectProps {
  value: string; // base type (e.g., 'flat_rack')
  selectedIso?: string; // selected ISO code (e.g., '22P1')
  onChange: (value: string, iso?: string) => void;
  containerSize: '20ft' | '40ft';
  isHighCube?: boolean;
}

// Helper to build dropdown options based on container size and high cube flag
function getDropdownOptions(containerSize: '20ft' | '40ft', isHighCube: boolean = false) {
  if (containerSize === '20ft') {
    // 20ft containers: support multiple ISO codes per type
    return containerTypeOptions
      .filter(opt => opt.availableSizes.includes('20ft'))
      .flatMap(opt => {
        const codes = Array.isArray((opt as any).code20) ? (opt as any).code20 : [(opt as any).code20];
        return codes.map((c: string, idx: number) => ({
          key: `${opt.value}-20-${idx}`,
          value: opt.value,
          iso: c,
          label: opt.label,
          code: c,
          isHighCube: false,
        }));
      });
  }

  // For 40ft with High Cube enabled - only show HC variants when explicit HC codes exist
  if (isHighCube) {
    return containerTypeOptions
      .filter(opt => {
        const hc = (opt as any).code40HC;
        return hc !== undefined && hc !== null && (Array.isArray(hc) ? hc.length > 0 : !!hc);
      })
      .flatMap(opt => {
        const hcVal = (opt as any).code40HC;
        const codes = Array.isArray(hcVal) ? hcVal : [hcVal];
        return codes.map((c: string, idx: number) => ({
          key: `${opt.value}-40HC-${idx}`,
          value: opt.value,
          iso: c,
          label: opt.label + ' (High Cube)',
          code: c,
          isHighCube: true,
        }));
      });
  }

  // For 40ft without High Cube - show standard 40ft only (support multiple codes)
  return containerTypeOptions
    .filter(opt => opt.availableSizes && opt.availableSizes.includes('40ft'))
    .flatMap(opt => {
      const codes = Array.isArray((opt as any).code40) ? (opt as any).code40 : [(opt as any).code40];
      return codes.map((c: string, idx: number) => ({
        key: `${opt.value}-40-${idx}`,
        value: opt.value,
        iso: c,
        label: opt.label,
        code: c,
        isHighCube: false,
      }));
    });
}

export const ContainerTypeSelect: React.FC<ContainerTypeSelectProps> = ({ value, selectedIso, onChange, containerSize, isHighCube = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Build dropdown options
  const dropdownOptions = getDropdownOptions(containerSize, isHighCube);
  const selectedOption = dropdownOptions.find(opt => opt.value === value && (opt as any).iso === selectedIso) || dropdownOptions.find(opt => opt.value === value);

  // If current selection is not available for the new size/high cube combo, reset to default
  React.useEffect(() => {
    if (value && !dropdownOptions.find(opt => opt.value === value)) {
      onChange(dropdownOptions[0]?.value || ''); // Default to first available
    }
  }, [containerSize, isHighCube, value, onChange, dropdownOptions]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Container Type *
        </label>
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-input w-full flex items-center justify-between text-left cursor-pointer"
      >
        <div>
          <span className="truncate">
            {selectedOption ? selectedOption.label : 'Select container type'}
          </span>
          {selectedOption && (
            <span className="text-blue-600 font-medium ml-2">
              {selectedOption.code}
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
            {dropdownOptions.map((option) => (
              <li
                key={option.key}
                onClick={() => {
                  onChange(option.value, (option as any).iso);
                  setIsOpen(false);
                }}
                className={`px-4 py-2 cursor-pointer transition-colors ${
                  option.isHighCube
                    ? 'bg-blue-100 hover:bg-blue-200 border-b border-blue-200'
                    : 'hover:bg-blue-50'
                } ${
                  value === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="block font-medium">{option.label}</span>
                    {option.isHighCube && <span className="text-lg">✨</span>}
                  </div>
                  {option.code && (
                    <span className={`text-xs px-2 py-1 rounded font-medium ${
                      option.isHighCube
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {option.code}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
