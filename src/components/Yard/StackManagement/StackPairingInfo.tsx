import React from 'react';
import { Package, Info, Shield } from 'lucide-react';
import { YardStack } from '../../../types/yard';
import { stackService } from '../../../services/api';

interface StackPairingInfoProps {
  stacks: YardStack[];
}

export const StackPairingInfo: React.FC<StackPairingInfoProps> = ({ stacks }) => {
  // Filter out virtual stacks from the summary
  const physicalStacks = stacks.filter(s => !(s as any).isVirtual);
  
  const twentyFootCount = physicalStacks.filter(s => s.containerSize === '20ft').length;
  const fortyFootCount = physicalStacks.filter(s => s.containerSize === '40ft').length;
  const specialStackCount = physicalStacks.filter(s => s.isSpecialStack).length;
  const activeCount = physicalStacks.filter(s => s.isActive).length;

  const sections = Array.from(new Set(physicalStacks.map(s => s.sectionName || 'Main Section')));

  const generatePairs = () => {
    const pairs: Array<{
      stack1: number;
      stack2: number;
      virtualStack: number;
      section: string;
      bothMatch: boolean;
      both40ft: boolean;
    }> = [];

    const processed = new Set<number>();

    physicalStacks
      .filter(s => !s.isSpecialStack && s.isActive)
      .sort((a, b) => a.stackNumber - b.stackNumber)
      .forEach(stack => {
        if (processed.has(stack.stackNumber)) return;

        const adjacentNumber = stackService.getAdjacentStackNumber(stack.stackNumber);
        if (!adjacentNumber) return;

        const adjacentStack = physicalStacks.find(s => s.stackNumber === adjacentNumber);
        if (!adjacentStack || adjacentStack.isSpecialStack) return;

        const stack1 = Math.min(stack.stackNumber, adjacentNumber);
        const stack2 = Math.max(stack.stackNumber, adjacentNumber);
        const virtualStack = stackService.getVirtualStackNumber(stack1, stack2);

        const bothMatch = stack.containerSize === adjacentStack.containerSize;
        const both40ft = stack.containerSize === '40ft' && adjacentStack.containerSize === '40ft';

        pairs.push({
          stack1,
          stack2,
          virtualStack,
          section: stack.sectionName || 'Main Section',
          bothMatch,
          both40ft
        });

        processed.add(stack1);
        processed.add(stack2);
      });

    return pairs;
  };

  const pairs = generatePairs();
  const groupedPairs: Record<string, typeof pairs> = {};

  pairs.forEach(pair => {
    if (!groupedPairs[pair.section]) {
      groupedPairs[pair.section] = [];
    }
    groupedPairs[pair.section].push(pair);
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Stack Configuration Summary</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">{twentyFootCount}</div>
            <div className="text-sm text-blue-700">20ft Stacks</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="text-2xl font-bold text-orange-900">{fortyFootCount}</div>
            <div className="text-sm text-orange-700">40ft Stacks</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="text-2xl font-bold text-green-900">{activeCount}</div>
            <div className="text-sm text-green-700">Active</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4 text-purple-700" />
              <div className="text-2xl font-bold text-purple-900">{specialStackCount}</div>
            </div>
            <div className="text-sm text-purple-700">Special</div>
          </div>
        </div>

        {pairs.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Valid Pairs for 40ft Containers</h4>
            <div className="space-y-3">
              {Object.keys(groupedPairs).sort().map((section) => (
                <div key={section} className="space-y-2">
                  <div className="text-xs font-medium text-gray-600 uppercase">{section}</div>
                  <div className="flex flex-wrap gap-2">
                    {groupedPairs[section].map((pair) => (
                      <div
                        key={`${pair.stack1}-${pair.stack2}`}
                        className={`px-2 py-1 rounded text-center font-mono text-xs border transition-all ${
                          pair.both40ft
                            ? 'bg-orange-50 border-orange-200 text-orange-800 font-semibold'
                            : pair.bothMatch
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                        }`}
                        title={
                          pair.both40ft
                            ? `Virtual Stack S${pair.virtualStack.toString().padStart(2, '0')} - Both configured for 40ft`
                            : pair.bothMatch
                            ? 'Both stacks have matching configuration'
                            : 'Stacks have different configurations'
                        }
                      >
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-1">
                            <span>{pair.stack1.toString().padStart(2, '0')}</span>
                            <span>+</span>
                            <span>{pair.stack2.toString().padStart(2, '0')}</span>
                            {!pair.bothMatch && <span className="ml-1 text-yellow-600">⚠</span>}
                          </div>
                          {pair.both40ft && (
                            <div className="text-[10px] text-orange-600 font-semibold mt-0.5">
                              ↓ S{pair.virtualStack.toString().padStart(2, '0')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sections</h4>
          <div className="space-y-2">
            {sections.map((section, index) => {
              const sectionStacks = physicalStacks.filter(s => (s.sectionName || 'Main Section') === section);
              const section20ft = sectionStacks.filter(s => s.containerSize === '20ft').length;
              const section40ft = sectionStacks.filter(s => s.containerSize === '40ft').length;
              const sectionSpecial = sectionStacks.filter(s => s.isSpecialStack).length;

              return (
                <div key={`section-${index}`} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                  <span className="font-medium text-gray-700">{section}</span>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-blue-600">{section20ft} × 20ft</span>
                    <span className="text-orange-600">{section40ft} × 40ft</span>
                    {sectionSpecial > 0 && (
                      <span className="text-purple-600 flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        {sectionSpecial}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">Tantarelli Pairing Rules:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Only odd-numbered stacks exist physically (S03, S05, S07, etc.)</li>
              <li>Pairs skip one number: 03+05 (not 03+04), 07+09, etc.</li>
              <li>Virtual even stacks (S04, S08, etc.) exist when pairs are configured for 40ft</li>
              <li>Special stacks <Shield className="inline h-3 w-3" /> (1, 31, 101, 103) cannot be paired</li>
              <li>If 03+05 are paired, 05 cannot pair with 07 (next valid pair: 07+09)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
