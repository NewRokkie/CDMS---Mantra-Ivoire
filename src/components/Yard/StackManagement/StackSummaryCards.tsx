import React from 'react';
import { Package, Shield, Grid3x3, Users, TrendingUp } from 'lucide-react';
import { YardStack } from '../../../types/yard';
import { stackService } from '../../../services/api';
import { useLanguage } from '../../../hooks/useLanguage';

interface StackSummaryCardsProps {
  stacks: YardStack[];
}

export const StackSummaryCards: React.FC<StackSummaryCardsProps> = ({ stacks }) => {
  const { t } = useLanguage();
  
  // Filter out virtual stacks for calculations
  const physicalStacks = stacks.filter(s => !(s as any).isVirtual);
  
  // Calculate statistics
  const totalStacks = physicalStacks.length;
  const specialStacks = physicalStacks.filter(s => s.isSpecialStack).length;
  const regularStacks = physicalStacks.filter(s => !s.isSpecialStack).length;
  const stacks20ft = physicalStacks.filter(s => s.containerSize === '20ft').length;
  const assignedStacks = physicalStacks.filter(s => s.assignedClientCode).length;
  
  // Calculate 40ft stacks (count paired stacks as 1 logical 40ft stack)
  const stacks40ftPhysical = physicalStacks.filter(s => s.containerSize === '40ft');
  
  // Use the stackService's pairing logic to count logical 40ft stacks
  const counted40ftStacks = new Set<number>();
  let logical40ftCount = 0;
  
  stacks40ftPhysical.forEach(stack => {
    if (counted40ftStacks.has(stack.stackNumber)) {
      return; // Already counted as part of a pair
    }
    
    // Get the adjacent stack number using the service's logic
    const adjacentStackNumber = stackService.getAdjacentStackNumber(stack.stackNumber);
    
    if (adjacentStackNumber) {
      // Check if the adjacent stack is also 40ft
      const adjacentStack = stacks40ftPhysical.find(s => s.stackNumber === adjacentStackNumber);
      
      if (adjacentStack) {
        // Both stacks in the pair are 40ft - count as 1 logical stack
        counted40ftStacks.add(stack.stackNumber);
        counted40ftStacks.add(adjacentStackNumber);
        logical40ftCount += 1;
      } else {
        // Only one stack in the pair is 40ft - this shouldn't happen in normal operation
        // but we'll count it as 1 logical stack anyway
        counted40ftStacks.add(stack.stackNumber);
        logical40ftCount += 1;
      }
    } else {
      // Stack cannot be paired (special stack or invalid number) - count as individual
      counted40ftStacks.add(stack.stackNumber);
      logical40ftCount += 1;
    }
  });

  const cards = [
    {
      title: t('stack.stats.total'),
      value: totalStacks,
      subtitle: t('stack.stats.all'),
      icon: Package,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900'
    },
    {
      title: t('stack.stats.40ft'),
      value: logical40ftCount,
      subtitle: t('stack.stats.logicalPairs'),
      icon: Grid3x3,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      textColor: 'text-orange-900'
    },
    {
      title: t('stack.stats.20ft'),
      value: stacks20ft,
      subtitle: t('stack.stats.single'),
      icon: Package,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      textColor: 'text-green-900'
    },
    {
      title: t('stack.stats.special'),
      value: specialStacks,
      subtitle: t('stack.stats.buffer'),
      icon: Shield,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-900'
    },
    {
      title: t('stack.stats.regular'),
      value: regularStacks,
      subtitle: t('stack.stats.standardOps'),
      icon: TrendingUp,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-900'
    },
    {
      title: t('stack.stats.clientAssigned'),
      value: assignedStacks,
      subtitle: t('stack.stats.unassignedCount').replace('{count}', (totalStacks - assignedStacks).toString()),
      icon: Users,
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      textColor: 'text-indigo-900'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`${card.bgColor} rounded-xl p-4 border ${card.borderColor} transition-all duration-200 hover:shadow-md`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 ${card.iconBg} rounded-lg border ${card.borderColor}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </div>
            <div className="space-y-1">
              <div className={`text-2xl font-bold ${card.textColor}`}>
                {card.value}
              </div>
              <div className="text-xs font-medium text-gray-600">
                {card.title}
              </div>
              <div className="text-xs text-gray-500">
                {card.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
