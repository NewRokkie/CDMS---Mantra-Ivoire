import React from 'react';
import { Package, Info } from 'lucide-react';
import { Tooltip } from './Tooltip'; // Assuming you have a Tooltip component

interface StackConfiguration {
  stackId: string;
  stackNumber: number;
  sectionId: string;
  sectionName: string;
  containerSize: '20feet' | '40feet';
  isSpecialStack: boolean;
  lastModified: Date;
  modifiedBy: string;
}

interface StackPairingInfoProps {
  configurations: StackConfiguration[];
  canAssign40Feet: (stackNumber: number) => boolean;
  getAdjacentStackNumber: (stackNumber: number) => number | null;
}

export const StackPairingInfo: React.FC<StackPairingInfoProps> = ({
  configurations,
  canAssign40Feet,
  getAdjacentStackNumber
}) => {
  const formatPair = (stack1: number, stack2: number) => {
    // If both are odd numbers, return the even number between them with 'S' prefix
    if (stack1 % 2 !== 0 && stack2 % 2 !== 0) {
      const evenNumber = Math.min(stack1, stack2) + 1;
      return `S${evenNumber.toString().padStart(2, '0')}`;
    }
    // Otherwise return the normal pair
    return `${Math.min(stack1, stack2).toString().padStart(2, '0')}+${Math.max(stack1, stack2).toString().padStart(2, '0')}`;
  };

  const validPairs = configurations
    .filter(config => !config.isSpecialStack && canAssign40Feet(config.stackNumber))
    .reduce((pairs: {display: string; stack1: number; stack2: number}[], config) => {
      const adjacent = getAdjacentStackNumber(config.stackNumber);
      if (adjacent) {
        const display = formatPair(config.stackNumber, adjacent);
        const stack1 = Math.min(config.stackNumber, adjacent);
        const stack2 = Math.max(config.stackNumber, adjacent);
        
        if (!pairs.some(p => p.display === display)) {
          pairs.push({display, stack1, stack2});
        }
      }
      return pairs;
    }, [])
    .sort((a, b) => a.display.localeCompare(b.display));

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-start space-x-4 p-5">
        <div className="bg-green-100 p-2 rounded-lg">
          <Package className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 text-lg">Valid Stack Pairs for 40ft Containers</h4>
            <Tooltip content="Pairs of stacks that can accommodate 40ft containers. S-prefixed numbers represent the midpoint between two odd-numbered stacks.">
              <Info className="h-4 w-4 text-gray-400 hover:text-gray-500 cursor-pointer" />
            </Tooltip>
          </div>
          
          {validPairs.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                {validPairs.map(({display, stack1, stack2}) => {
                  const config1 = configurations.find(c => c.stackNumber === stack1);
                  const config2 = configurations.find(c => c.stackNumber === stack2);
                  const bothSame = config1?.containerSize === config2?.containerSize;
                  const both40feet = config1?.containerSize === '40feet' && config2?.containerSize === '40feet';
                  const isSpecialFormat = display.startsWith('S');
                  
                  return (
                    <div 
                      key={display} 
                      className={`
                        px-3 py-2 rounded-md text-center font-mono text-sm 
                        border transition-all hover:shadow-md cursor-default
                        ${
                          both40feet 
                            ? 'bg-orange-50 border-orange-200 text-orange-800 font-semibold' 
                            : bothSame 
                            ? 'bg-green-50 border-green-200 text-green-800' 
                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        }
                        ${isSpecialFormat ? 'ring-1 ring-blue-200 bg-blue-50' : ''}
                      `}
                      title={
                        isSpecialFormat 
                          ? `Midpoint between stacks ${stack1} and ${stack2}`
                          : both40feet 
                          ? 'Both stacks configured for 40ft' 
                          : bothSame 
                          ? 'Both stacks have matching configuration' 
                          : 'Stacks have different configurations'
                      }
                    >
                      <div className="flex items-center justify-center">
                        {display}
                        {!bothSame && <span className="ml-1.5 text-yellow-600">⚠</span>}
                        {both40feet && <span className="ml-1.5 text-orange-500">🔶</span>}
                        {isSpecialFormat && <span className="ml-1.5 text-blue-500">✨</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span>Matching 20ft</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                  <span>Matching 40ft</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                  <span>Mismatched</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                  <span>Odd+Odd Midpoint</span>
                </div>
              </div>
            </>
          ) : (
            <div className="py-4 text-center text-gray-500 bg-gray-50 rounded-md">
              No valid stack pairs available for 40ft containers
            </div>
          )}
        </div>
      </div>
    </div>
  );
};