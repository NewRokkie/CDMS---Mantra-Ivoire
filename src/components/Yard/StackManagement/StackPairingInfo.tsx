import React from 'react';
import { Package } from 'lucide-react';

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
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <Package className="h-5 w-5 text-green-600 mt-0.5" />
        <div>
          <h4 className="font-medium text-green-900 mb-2">Valid Stack Pairs for 40feet Containers</h4>
          <div className="text-sm text-green-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {configurations
                .filter(config => !config.isSpecialStack && canAssign40Feet(config.stackNumber))
                .reduce((pairs: string[], config) => {
                  const adjacent = getAdjacentStackNumber(config.stackNumber);
                  if (adjacent) {
                    const pairStr = `${Math.min(config.stackNumber, adjacent).toString().padStart(2, '0')}+${Math.max(config.stackNumber, adjacent).toString().padStart(2, '0')}`;
                    if (!pairs.includes(pairStr)) {
                      pairs.push(pairStr);
                    }
                  }
                  return pairs;
                }, [])
                .sort()
                .map(pair => {
                  const [stack1, stack2] = pair.split('+').map(Number);
                  const config1 = configurations.find(c => c.stackNumber === stack1);
                  const config2 = configurations.find(c => c.stackNumber === stack2);
                  const bothSame = config1?.containerSize === config2?.containerSize;
                  const both40feet = config1?.containerSize === '40feet' && config2?.containerSize === '40feet';
                  
                  return (
                    <div 
                      key={pair} 
                      className={`px-2 py-1 rounded text-center font-mono text-xs ${
                        both40feet 
                          ? 'bg-orange-200 text-orange-800 font-bold' 
                          : bothSame 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                      title={
                        both40feet 
                          ? 'Both stacks configured for 40feet' 
                          : bothSame 
                          ? 'Both stacks have matching configuration' 
                          : 'Stacks have different configurations'
                      }
                    >
                      {pair}
                      {!bothSame && <span className="ml-1">⚠</span>}
                      {both40feet && <span className="ml-1">🔶</span>}
                    </div>
                  );
                })
              }
            </div>
            <div className="mt-2 text-xs">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-100 rounded"></div>
                  <span>Matching 20feet</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-orange-200 rounded"></div>
                  <span>Matching 40feet</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                  <span>Mismatched</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};