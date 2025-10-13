import React from 'react';
import { Package, Info } from 'lucide-react';
import { YardStack } from '../../../types/yard';

interface StackPairingInfoProps {
  stacks: YardStack[];
}

export const StackPairingInfo: React.FC<StackPairingInfoProps> = ({ stacks }) => {
  const twentyFootCount = stacks.filter(s => s.containerSize === '20feet').length;
  const fortyFootCount = stacks.filter(s => s.containerSize === '40feet').length;
  const activeCount = stacks.filter(s => s.isActive).length;

  const sections = Array.from(new Set(stacks.map(s => s.sectionName || 'Main Section')));

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Stack Configuration Summary</h3>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">{twentyFootCount}</div>
            <div className="text-sm text-blue-700">20ft Stacks</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
            <div className="text-2xl font-bold text-orange-900">{fortyFootCount}</div>
            <div className="text-sm text-orange-700">40ft Stacks</div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="text-2xl font-bold text-green-900">{activeCount}</div>
          <div className="text-sm text-green-700">Active Stacks</div>
        </div>

        <div className="pt-3 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sections</h4>
          <div className="space-y-2">
            {sections.map((section, index) => {
              const sectionStacks = stacks.filter(s => (s.sectionName || 'Main Section') === section);
              const section20ft = sectionStacks.filter(s => s.containerSize === '20feet').length;
              const section40ft = sectionStacks.filter(s => s.containerSize === '40feet').length;

              return (
                <div key={`section-${index}`} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2">
                  <span className="font-medium text-gray-700">{section}</span>
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="text-blue-600">{section20ft} × 20ft</span>
                    <span className="text-orange-600">{section40ft} × 40ft</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-blue-50 rounded-lg p-3 border border-blue-200">
          <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">Stack Pairing Rules:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>20ft containers can be stored in any stack</li>
              <li>40ft containers require adjacent paired stacks</li>
              <li>Changing one stack to 40ft automatically pairs it with an adjacent stack</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
