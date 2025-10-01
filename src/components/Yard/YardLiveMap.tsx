import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, MapPin, Package, X, TrendingUp, AlertTriangle, Eye, Truck } from 'lucide-react';
import { Container } from '../../types';
import { Yard, YardStack } from '../../types/yard';
import { useAuth } from '../../hooks/useAuth';

interface YardLiveMapProps {
  yard: Yard | null;
  containers: Container[];
}

interface ContainerSlot {
  containerId: string;
  containerNumber: string;
  containerSize: '20ft' | '40ft';
  row: number;
  tier: number;
  status: 'occupied' | 'priority' | 'damaged';
  client?: string;
  transporter?: string;
  containerType?: string;
}

interface StackVisualization {
  stackNumber: number;
  isVirtual: boolean;
  pairedWith?: number;
  stack?: YardStack;
  section: any;
  zoneName: string;
  containerSize: '20ft' | '40ft';
  isSpecialStack: boolean;
  containerSlots: ContainerSlot[];
  currentOccupancy: number;
  capacity: number;
  rows: number;
  maxTiers: number;
}

const generateMockContainers = (): Container[] => {
  const mockContainers: Container[] = [
    // Zone A - Stack 1 (20ft, special)
    { id: 'c1', number: 'MAEU1234567', type: 'standard', size: '20ft', status: 'in_depot', location: 'S01-R1-H1', client: 'Maersk Line', clientCode: 'MAEU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c2', number: 'MAEU1234568', type: 'standard', size: '20ft', status: 'in_depot', location: 'S01-R1-H2', client: 'Maersk Line', clientCode: 'MAEU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c3', number: 'MAEU1234569', type: 'reefer', size: '20ft', status: 'in_depot', location: 'S01-R1-H3', client: 'Maersk Line', clientCode: 'MAEU', createdBy: 'System', gateInDate: new Date() },

    // Zone A - Stack 3 (20ft)
    { id: 'c4', number: 'MSCU2345678', type: 'standard', size: '20ft', status: 'in_depot', location: 'S03-R1-H1', client: 'MSC', clientCode: 'MSCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c5', number: 'MSCU2345679', type: 'standard', size: '20ft', status: 'in_depot', location: 'S03-R2-H1', client: 'MSC', clientCode: 'MSCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c6', number: 'MSCU2345680', type: 'open_top', size: '20ft', status: 'maintenance', location: 'S03-R3-H1', client: 'MSC', clientCode: 'MSCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c7', number: 'MSCU2345681', type: 'standard', size: '20ft', status: 'in_depot', location: 'S03-R1-H2', client: 'MSC', clientCode: 'MSCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c8', number: 'MSCU2345682', type: 'standard', size: '20ft', status: 'in_depot', location: 'S03-R2-H2', client: 'MSC', clientCode: 'MSCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c9', number: 'MSCU2345683', type: 'standard', size: '20ft', status: 'in_depot', location: 'S03-R4-H1', client: 'MSC', clientCode: 'MSCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c30', number: 'MSCU2345690', type: 'standard', size: '20ft', status: 'in_depot', location: 'S03-R1-H3', client: 'MSC', clientCode: 'MSCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c31', number: 'MSCU2345691', type: 'standard', size: '20ft', status: 'in_depot', location: 'S03-R2-H3', client: 'MSC', clientCode: 'MSCU', createdBy: 'System', gateInDate: new Date() },

    // Add 40ft containers that span S03 and S05 (creating virtual S04)
    { id: 'c40', number: 'CMAU4000001', type: 'standard', size: '40ft', status: 'in_depot', location: 'S04-R1-H1', client: 'CMA CGM', clientCode: 'CMDU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c41', number: 'CMAU4000002', type: 'standard', size: '40ft', status: 'in_depot', location: 'S04-R1-H2', client: 'CMA CGM', clientCode: 'CMDU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c42', number: 'CMAU4000003', type: 'standard', size: '40ft', status: 'in_depot', location: 'S04-R2-H1', client: 'CMA CGM', clientCode: 'CMDU', createdBy: 'System', gateInDate: new Date() },

    // Zone A - Stack 5 (20ft)
    { id: 'c10', number: 'CMDU3456789', type: 'standard', size: '20ft', status: 'in_depot', location: 'S05-R1-H1', client: 'CMA CGM', clientCode: 'CMDU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c11', number: 'CMDU3456790', type: 'hi_cube', size: '20ft', status: 'in_depot', location: 'S05-R2-H1', client: 'CMA CGM', clientCode: 'CMDU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c12', number: 'CMDU3456791', type: 'standard', size: '20ft', status: 'in_depot', location: 'S05-R3-H1', client: 'CMA CGM', clientCode: 'CMDU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c13', number: 'CMDU3456792', type: 'standard', size: '20ft', status: 'in_depot', location: 'S05-R4-H1', client: 'CMA CGM', clientCode: 'CMDU', damage: ['Minor dent'], createdBy: 'System', gateInDate: new Date() },

    // Zone B - Stack 33 (20ft)
    { id: 'c14', number: 'HLCU4567890', type: 'standard', size: '20ft', status: 'in_depot', location: 'S33-R1-H1', client: 'Hapag-Lloyd', clientCode: 'HLCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c15', number: 'HLCU4567891', type: 'reefer', size: '20ft', status: 'in_depot', location: 'S33-R2-H1', client: 'Hapag-Lloyd', clientCode: 'HLCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c16', number: 'HLCU4567892', type: 'standard', size: '20ft', status: 'in_depot', location: 'S33-R3-H1', client: 'Hapag-Lloyd', clientCode: 'HLCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c17', number: 'HLCU4567893', type: 'standard', size: '20ft', status: 'in_depot', location: 'S33-R1-H2', client: 'Hapag-Lloyd', clientCode: 'HLCU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c18', number: 'HLCU4567894', type: 'standard', size: '20ft', status: 'in_depot', location: 'S33-R2-H2', client: 'Hapag-Lloyd', clientCode: 'HLCU', createdBy: 'System', gateInDate: new Date() },

    // Zone B - Stack 35 (20ft)
    { id: 'c19', number: 'ONEY5678901', type: 'standard', size: '20ft', status: 'in_depot', location: 'S35-R1-H1', client: 'ONE', clientCode: 'ONEY', createdBy: 'System', gateInDate: new Date() },
    { id: 'c20', number: 'ONEY5678902', type: 'standard', size: '20ft', status: 'in_depot', location: 'S35-R2-H1', client: 'ONE', clientCode: 'ONEY', createdBy: 'System', gateInDate: new Date() },

    // Zone C - Stack 61 (20ft)
    { id: 'c21', number: 'EGLV6789012', type: 'standard', size: '20ft', status: 'in_depot', location: 'S61-R1-H1', client: 'Evergreen', clientCode: 'EGLV', createdBy: 'System', gateInDate: new Date() },
    { id: 'c22', number: 'EGLV6789013', type: 'standard', size: '20ft', status: 'in_depot', location: 'S61-R2-H1', client: 'Evergreen', clientCode: 'EGLV', createdBy: 'System', gateInDate: new Date() },
    { id: 'c23', number: 'EGLV6789014', type: 'flat_rack', size: '20ft', status: 'in_depot', location: 'S61-R3-H1', client: 'Evergreen', clientCode: 'EGLV', createdBy: 'System', gateInDate: new Date() },
    { id: 'c24', number: 'EGLV6789015', type: 'standard', size: '20ft', status: 'in_depot', location: 'S61-R4-H1', client: 'Evergreen', clientCode: 'EGLV', createdBy: 'System', gateInDate: new Date() },
    { id: 'c25', number: 'EGLV6789016', type: 'standard', size: '20ft', status: 'in_depot', location: 'S61-R5-H1', client: 'Evergreen', clientCode: 'EGLV', createdBy: 'System', gateInDate: new Date() },
    { id: 'c26', number: 'EGLV6789017', type: 'standard', size: '20ft', status: 'in_depot', location: 'S61-R6-H1', client: 'Evergreen', clientCode: 'EGLV', createdBy: 'System', gateInDate: new Date() },

    // Zone C - Stack 101 (20ft, special - 1 row only)
    { id: 'c27', number: 'YMLU7890123', type: 'standard', size: '20ft', status: 'in_depot', location: 'S101-R1-H1', client: 'Yang Ming', clientCode: 'YMLU', createdBy: 'System', gateInDate: new Date() },
    { id: 'c28', number: 'YMLU7890124', type: 'standard', size: '20ft', status: 'in_depot', location: 'S101-R1-H2', client: 'Yang Ming', clientCode: 'YMLU', createdBy: 'System', gateInDate: new Date() },
  ];

  return mockContainers;
};

export const YardLiveMap: React.FC<YardLiveMapProps> = ({ yard, containers: propContainers }) => {
  const { user, canViewAllData } = useAuth();
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [selectedStack, setSelectedStack] = useState<YardStack | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [highlightedContainer, setHighlightedContainer] = useState<string | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<Container[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const stackRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const allContainers = useMemo(() => {
    const mockContainers = generateMockContainers();
    const containerMap = new Map<string, Container>();
    propContainers.forEach(c => containerMap.set(c.id, c));
    mockContainers.forEach(c => {
      if (!containerMap.has(c.id)) {
        containerMap.set(c.id, c);
      }
    });
    return Array.from(containerMap.values());
  }, [propContainers]);

  const zones = useMemo(() => {
    if (!yard) return [];
    return yard.sections.map((section, index) => {
      const stacks = section.stacks;
      const totalCapacity = stacks.reduce((sum, s) => sum + s.capacity, 0);
      const occupied = stacks.reduce((sum, s) => sum + s.currentOccupancy, 0);
      const zoneName = `Zone ${String.fromCharCode(65 + index)}`;
      return {
        id: section.id,
        name: zoneName,
        color: section.color || '#3b82f6',
        capacity: totalCapacity,
        occupied,
        percentage: totalCapacity > 0 ? (occupied / totalCapacity) * 100 : 0
      };
    });
  }, [yard]);

  const getStackConfiguration = (stackNumber: number): { containerSize: '20ft' | '40ft'; isSpecialStack: boolean; pairedWith?: number } => {
    const isOdd = stackNumber % 2 === 1;

    if (stackNumber === 1 || stackNumber === 101 || stackNumber === 103) {
      return { containerSize: '20ft', isSpecialStack: true };
    }

    const storedConfig = localStorage.getItem(`stack-config-${stackNumber}`);
    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      return {
        containerSize: config.containerSize === '40feet' ? '40ft' : '20ft',
        isSpecialStack: config.isSpecialStack || false
      };
    }

    // Check if this odd stack is paired with the next odd stack for 40ft
    if (isOdd) {
      const nextOdd = stackNumber + 2;
      const pairedConfig = localStorage.getItem(`stack-config-${stackNumber}-paired`);
      if (pairedConfig) {
        const paired = JSON.parse(pairedConfig);
        if (paired.is40ft) {
          return { containerSize: '40ft', isSpecialStack: false, pairedWith: nextOdd };
        }
      }
    }

    return { containerSize: isOdd ? '20ft' : '40ft', isSpecialStack: false };
  };

  const validateContainerInput = (input: string): string => {
    let cleaned = input.replace(/-/g, '').toUpperCase();
    cleaned = cleaned.substring(0, 11);
    const letters = cleaned.substring(0, 4).replace(/[^A-Z]/g, '');
    const numbers = cleaned.substring(4).replace(/[^0-9]/g, '');
    return letters + numbers;
  };

  const handleSearchChange = (value: string) => {
    const validated = validateContainerInput(value);
    setSearchTerm(validated);

    if (validated.length >= 2) {
      const suggestions = allContainers.filter(c =>
        c.number.toUpperCase().startsWith(validated)
      ).slice(0, 5);
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const filteredContainers = useMemo(() => {
    let filtered = allContainers;

    if (!canViewAllData() && user?.clientCode) {
      filtered = filtered.filter(c => c.clientCode === user.clientCode);
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'damaged') {
        filtered = filtered.filter(c => c.damage && c.damage.length > 0);
      } else {
        filtered = filtered.filter(c => c.status === filterStatus);
      }
    }

    if (selectedZone !== 'all' && yard) {
      const section = yard.sections.find(s => s.id === selectedZone);
      if (section) {
        const stackNumbers = section.stacks.map(s => s.stackNumber);
        filtered = filtered.filter(c => {
          const match = c.location.match(/S(\d+)-R\d+-H\d+/);
          return match && stackNumbers.includes(parseInt(match[1]));
        });
      }
    }

    return filtered;
  }, [allContainers, filterStatus, selectedZone, canViewAllData, user, yard]);

  const searchedContainer = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const found = allContainers.find(c =>
      c.number.toUpperCase() === searchTerm.toUpperCase()
    );
    return found || null;
  }, [allContainers, searchTerm]);

  useEffect(() => {
    if (searchedContainer) {
      setHighlightedContainer(searchedContainer.id);
      const timer = setTimeout(() => {
        setHighlightedContainer(null);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setHighlightedContainer(null);
    }
  }, [searchedContainer]);

  const scrollToContainer = () => {
    if (!searchedContainer) return;
    const match = searchedContainer.location.match(/S(\d+)-R\d+-H\d+/);
    if (match) {
      const stackNumber = parseInt(match[1]);
      const stackElement = stackRefs.current.get(stackNumber);
      if (stackElement) {
        stackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const stats = useMemo(() => {
    const total = allContainers.length;
    const inDepot = allContainers.filter(c => c.status === 'in_depot').length;
    const maintenance = allContainers.filter(c => c.status === 'maintenance').length;
    const damaged = allContainers.filter(c => c.damage && c.damage.length > 0).length;
    const occupancyRate = yard ? ((yard.currentOccupancy / yard.totalCapacity) * 100) : 0;

    return { total, inDepot, maintenance, damaged, occupancyRate };
  }, [allContainers, yard]);

  const stacksData = useMemo(() => {
    if (!yard) return [];

    const allStacks: StackVisualization[] = [];
    const processedStacks = new Set<number>();

    yard.sections.forEach((section, sectionIndex) => {
      if (selectedZone !== 'all' && section.id !== selectedZone) {
        return;
      }

      const zoneName = `Zone ${String.fromCharCode(65 + sectionIndex)}`;
      const sortedStacks = [...section.stacks].sort((a, b) => a.stackNumber - b.stackNumber);

      sortedStacks.forEach(stack => {
        if (processedStacks.has(stack.stackNumber)) return;

        const config = getStackConfiguration(stack.stackNumber);

        // If this is an odd stack configured for 40ft pairing
        if (config.containerSize === '40ft' && config.pairedWith && stack.stackNumber % 2 === 1) {
          const nextOddStack = sortedStacks.find(s => s.stackNumber === config.pairedWith);
          if (nextOddStack) {
            // Create virtual stack between the two odd stacks
            const virtualStackNumber = stack.stackNumber + 1;

            // Get 40ft containers assigned to this virtual stack
            const virtual40ftContainers = filteredContainers.filter(c => {
              const match = c.location.match(/S(\d+)-R\d+-H\d+/);
              return match && parseInt(match[1]) === virtualStackNumber && c.size === '40ft';
            });

            const containerSlots: ContainerSlot[] = virtual40ftContainers.map(c => {
              const locMatch = c.location.match(/S\d+-R(\d+)-H(\d+)/);
              const row = locMatch ? parseInt(locMatch[1]) : 1;
              const tier = locMatch ? parseInt(locMatch[2]) : 1;

              let status: ContainerSlot['status'] = 'occupied';
              if (c.damage && c.damage.length > 0) status = 'damaged';
              else if (c.status === 'maintenance') status = 'priority';

              return {
                containerId: c.id,
                containerNumber: c.number,
                containerSize: c.size,
                row,
                tier,
                status,
                client: c.client,
                transporter: 'Swift Transport',
                containerType: c.status === 'in_depot' ? 'FULL' : 'EMPTY'
              };
            });

            const virtualCapacity = stack.rows * stack.maxTiers;

            // Add the first odd stack (20ft)
            const stack1Containers = filteredContainers.filter(c => {
              const match = c.location.match(/S(\d+)-R\d+-H\d+/);
              return match && parseInt(match[1]) === stack.stackNumber && c.size === '20ft';
            });

            const stack1Slots: ContainerSlot[] = stack1Containers.map(c => {
              const locMatch = c.location.match(/S\d+-R(\d+)-H(\d+)/);
              const row = locMatch ? parseInt(locMatch[1]) : 1;
              const tier = locMatch ? parseInt(locMatch[2]) : 1;

              let status: ContainerSlot['status'] = 'occupied';
              if (c.damage && c.damage.length > 0) status = 'damaged';
              else if (c.status === 'maintenance') status = 'priority';

              return {
                containerId: c.id,
                containerNumber: c.number,
                containerSize: c.size,
                row,
                tier,
                status,
                client: c.client,
                transporter: 'Swift Transport',
                containerType: c.status === 'in_depot' ? 'FULL' : 'EMPTY'
              };
            });

            allStacks.push({
              stackNumber: stack.stackNumber,
              isVirtual: false,
              stack,
              section,
              zoneName,
              containerSize: '20ft',
              isSpecialStack: false,
              containerSlots: stack1Slots,
              currentOccupancy: stack1Slots.length,
              capacity: stack.rows * stack.maxTiers,
              rows: stack.rows,
              maxTiers: stack.maxTiers
            });

            // Add virtual 40ft stack
            allStacks.push({
              stackNumber: virtualStackNumber,
              isVirtual: true,
              pairedWith: config.pairedWith,
              section,
              zoneName,
              containerSize: '40ft',
              isSpecialStack: false,
              containerSlots,
              currentOccupancy: containerSlots.length,
              capacity: virtualCapacity,
              rows: stack.rows,
              maxTiers: stack.maxTiers
            });

            // Add the second odd stack (20ft)
            const stack2Containers = filteredContainers.filter(c => {
              const match = c.location.match(/S(\d+)-R\d+-H\d+/);
              return match && parseInt(match[1]) === nextOddStack.stackNumber && c.size === '20ft';
            });

            const stack2Slots: ContainerSlot[] = stack2Containers.map(c => {
              const locMatch = c.location.match(/S\d+-R(\d+)-H(\d+)/);
              const row = locMatch ? parseInt(locMatch[1]) : 1;
              const tier = locMatch ? parseInt(locMatch[2]) : 1;

              let status: ContainerSlot['status'] = 'occupied';
              if (c.damage && c.damage.length > 0) status = 'damaged';
              else if (c.status === 'maintenance') status = 'priority';

              return {
                containerId: c.id,
                containerNumber: c.number,
                containerSize: c.size,
                row,
                tier,
                status,
                client: c.client,
                transporter: 'Swift Transport',
                containerType: c.status === 'in_depot' ? 'FULL' : 'EMPTY'
              };
            });

            allStacks.push({
              stackNumber: nextOddStack.stackNumber,
              isVirtual: false,
              stack: nextOddStack,
              section,
              zoneName,
              containerSize: '20ft',
              isSpecialStack: false,
              containerSlots: stack2Slots,
              currentOccupancy: stack2Slots.length,
              capacity: nextOddStack.rows * nextOddStack.maxTiers,
              rows: nextOddStack.rows,
              maxTiers: nextOddStack.maxTiers
            });

            processedStacks.add(stack.stackNumber);
            processedStacks.add(nextOddStack.stackNumber);
            return;
          }
        }

        // Regular stack processing
        const stackContainers = filteredContainers.filter(c => {
          const match = c.location.match(/S(\d+)-R\d+-H\d+/);
          return match && parseInt(match[1]) === stack.stackNumber;
        });

        const containerSlots: ContainerSlot[] = stackContainers.map(c => {
          const locMatch = c.location.match(/S\d+-R(\d+)-H(\d+)/);
          const row = locMatch ? parseInt(locMatch[1]) : 1;
          const tier = locMatch ? parseInt(locMatch[2]) : 1;

          let status: ContainerSlot['status'] = 'occupied';
          if (c.damage && c.damage.length > 0) status = 'damaged';
          else if (c.status === 'maintenance') status = 'priority';

          return {
            containerId: c.id,
            containerNumber: c.number,
            containerSize: c.size,
            row,
            tier,
            status,
            client: c.client,
            transporter: 'Swift Transport',
            containerType: c.status === 'in_depot' ? 'FULL' : 'EMPTY'
          };
        });

        allStacks.push({
          stackNumber: stack.stackNumber,
          isVirtual: false,
          stack,
          section,
          zoneName,
          containerSize: config.containerSize,
          isSpecialStack: config.isSpecialStack,
          containerSlots,
          currentOccupancy: containerSlots.length,
          capacity: stack.rows * stack.maxTiers,
          rows: stack.rows,
          maxTiers: stack.maxTiers
        });

        processedStacks.add(stack.stackNumber);
      });
    });

    return allStacks.sort((a, b) => a.stackNumber - b.stackNumber);
  }, [yard, filteredContainers, selectedZone]);

  const stackContainers = useMemo(() => {
    if (!selectedStack) return [];
    return filteredContainers.filter(c => {
      const match = c.location.match(/S(\d+)-R\d+-H\d+/);
      return match && parseInt(match[1]) === selectedStack.stackNumber;
    });
  }, [selectedStack, filteredContainers]);

  const handleRowClick = (stackViz: StackVisualization, row: number) => {
    const rowContainers = stackViz.containerSlots.filter(s => s.row === row);
    if (rowContainers.length === 1) {
      const container = allContainers.find(c => c.id === rowContainers[0].containerId);
      if (container) {
        setSelectedContainer(container);
        setSelectedStack(null);
      }
    } else if (rowContainers.length > 1 || stackViz.stack) {
      setSelectedStack(stackViz.stack || null);
      setSelectedContainer(null);
    }
  };

  const handleStackClick = (stackViz: StackVisualization) => {
    if (stackViz.stack) {
      setSelectedStack(stackViz.stack);
      setSelectedContainer(null);
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 50) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const renderStackRows = (stackViz: StackVisualization) => {
    const { rows, containerSize, isSpecialStack, containerSlots } = stackViz;

    // For all stacks, show individual rows
    return (
      <div className="flex flex-col gap-1">
        {Array.from({ length: rows }, (_, rowIndex) => {
          const row = rowIndex + 1;
          const rowContainers = containerSlots.filter(s => s.row === row);
          const count = rowContainers.length;
          const hasContainer = count > 0;
          const hasDamaged = rowContainers.some(s => s.status === 'damaged');
          const hasPriority = rowContainers.some(s => s.status === 'priority');
          const is40ft = containerSize === '40ft' && !isSpecialStack;

          let bgColor = 'bg-green-100 border-green-300';
          if (hasContainer) {
            if (hasDamaged) bgColor = 'bg-red-500 border-red-600';
            else if (hasPriority) bgColor = 'bg-purple-500 border-purple-600';
            else if (is40ft) bgColor = 'bg-orange-400 border-orange-600';
            else bgColor = 'bg-blue-500 border-blue-600';
          }

          return (
            <div
              key={row}
              className={`h-8 rounded-lg border-2 transition-all cursor-pointer hover:opacity-80 flex items-center justify-center relative ${bgColor}`}
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick(stackViz, row);
              }}
              title={hasContainer ? `Row ${row} - ${count} container(s)` : `Row ${row} - Empty`}
            >
              {is40ft && hasContainer && (
                <div className="absolute top-0 right-0 bg-orange-600 text-white text-[9px] px-1 rounded-bl font-bold">
                  40ft
                </div>
              )}
              <span className={`text-sm font-bold ${hasContainer ? 'text-white' : 'text-gray-500'}`}>
                {hasContainer ? count : 0}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (!yard) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No yard selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <MapPin className="h-6 w-6 mr-3 text-blue-600" />
              {yard.name} - Live Map
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {yard.code} • Capacity: {yard.currentOccupancy}/{yard.totalCapacity} ({stats.occupancyRate.toFixed(1)}%)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg px-4 py-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-600 font-medium uppercase">Total Containers</div>
                <div className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</div>
              </div>
              <Package className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg px-4 py-3 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-green-600 font-medium uppercase">In Depot</div>
                <div className="text-2xl font-bold text-green-900 mt-1">{stats.inDepot}</div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg px-4 py-3 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-orange-600 font-medium uppercase">Maintenance</div>
                <div className="text-2xl font-bold text-orange-900 mt-1">{stats.maintenance}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg px-4 py-3 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-red-600 font-medium uppercase">Damaged</div>
                <div className="text-2xl font-bold text-red-900 mt-1">{stats.damaged}</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Legend:</span>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-green-100 border-2 border-green-300 rounded" />
                <span className="text-gray-700">Empty</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-blue-500 border-2 border-blue-600 rounded" />
                <span className="text-gray-700">20ft Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-orange-400 border-2 border-orange-600 rounded" />
                <span className="text-gray-700">40ft Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-purple-500 border-2 border-purple-600 rounded" />
                <span className="text-gray-700">Maintenance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 bg-red-500 border-2 border-red-600 rounded" />
                <span className="text-gray-700">Damaged</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search container number..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              maxLength={11}
            />

            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-60 overflow-auto">
                {searchSuggestions.map(container => (
                  <div
                    key={container.id}
                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      setSearchTerm(container.number);
                      setShowSuggestions(false);
                    }}
                  >
                    <div className="font-mono text-sm font-medium text-gray-900">{container.number}</div>
                    <div className="text-xs text-gray-500">{container.client} • {container.location}</div>
                  </div>
                ))}
              </div>
            )}

            {searchedContainer && !showSuggestions && (
              <div className="absolute top-full left-0 mt-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 shadow-lg z-10 flex items-center gap-2">
                <div>
                  <p className="text-xs text-green-700 font-medium">Found: {searchedContainer.location}</p>
                  <p className="text-xs text-green-600">{searchedContainer.size} • {searchedContainer.type}</p>
                </div>
                <button
                  onClick={scrollToContainer}
                  className="ml-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  View
                </button>
              </div>
            )}
            {searchTerm && !searchedContainer && !showSuggestions && (
              <div className="absolute top-full left-0 mt-1 bg-red-50 border border-red-200 rounded px-2 py-1 text-xs text-red-700 whitespace-nowrap z-10">
                Container not found
              </div>
            )}
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Zones</option>
            {zones.map(zone => (
              <option key={zone.id} value={zone.id}>
                {zone.name} ({zone.percentage.toFixed(0)}%)
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="in_depot">In Depot</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
            <option value="damaged">Damaged</option>
          </select>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
          {stacksData.map((stackViz) => {
            const occupancyPercent = (stackViz.currentOccupancy / stackViz.capacity) * 100;
            const displayName = stackViz.isVirtual
              ? `S${stackViz.stackNumber.toString().padStart(2, '0')} (Virtual)`
              : `S${stackViz.stackNumber.toString().padStart(2, '0')}`;

            return (
              <div
                key={`${stackViz.stackNumber}-${stackViz.isVirtual ? 'virtual' : 'physical'}`}
                ref={(el) => {
                  if (el) stackRefs.current.set(stackViz.stackNumber, el);
                }}
                className={`bg-white rounded-lg border-2 transition-all overflow-hidden cursor-pointer ${
                  stackViz.isVirtual ? 'border-orange-300 bg-orange-50/30' : 'border-gray-200 hover:border-blue-400'
                }`}
                onClick={() => handleStackClick(stackViz)}
              >
                <div
                  className="px-3 py-2 border-b"
                  style={{
                    backgroundColor: stackViz.isVirtual ? '#fed7aa20' : `${stackViz.section.color}15`,
                    borderColor: stackViz.isVirtual ? '#fb923c' : stackViz.section.color
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-base">{displayName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      stackViz.containerSize === '40ft' ? 'bg-orange-100 text-orange-700 font-medium' : 'bg-blue-100 text-blue-700 font-medium'
                    }`}>
                      {stackViz.containerSize}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressBarColor(occupancyPercent)}`}
                      style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-center text-gray-600 mt-1">
                    {stackViz.currentOccupancy}/{stackViz.capacity} ({occupancyPercent.toFixed(0)}%)
                  </div>
                </div>

                <div className="p-3">
                  {renderStackRows(stackViz)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContainer(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <Package className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Container Details</h3>
              </div>
              <button
                onClick={() => setSelectedContainer(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Container Number</label>
                <p className="font-mono text-lg font-bold text-gray-900 mt-1">{selectedContainer.number}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Type</label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{selectedContainer.type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Size</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedContainer.size}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Client</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContainer.client}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Location</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContainer.location}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                <div className="mt-1">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    selectedContainer.status === 'in_depot' ? 'bg-green-100 text-green-800' :
                    selectedContainer.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                    selectedContainer.status === 'cleaning' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedContainer.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedContainer.damage && selectedContainer.damage.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Damage Report</label>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    {selectedContainer.damage.map((d, i) => (
                      <p key={i} className="text-sm text-red-700 flex items-center">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                        {d}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {selectedContainer.gateInDate && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Gate In Date</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(selectedContainer.gateInDate).toLocaleDateString()} {new Date(selectedContainer.gateInDate).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedContainer(null)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStack && !selectedContainer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStack(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Stack S{selectedStack.stackNumber.toString().padStart(2, '0')} Details</h3>
              <button
                onClick={() => setSelectedStack(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Rows</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedStack.rows}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Max Tiers</label>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedStack.maxTiers}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase block mb-2">Occupancy</label>
                  <p className="text-sm text-gray-900 mb-2">
                    {selectedStack.currentOccupancy} / {selectedStack.capacity} containers
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        getProgressBarColor((selectedStack.currentOccupancy / selectedStack.capacity) * 100)
                      }`}
                      style={{ width: `${Math.min((selectedStack.currentOccupancy / selectedStack.capacity) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {((selectedStack.currentOccupancy / selectedStack.capacity) * 100).toFixed(1)}% occupied
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 min-h-0">
              <h4 className="font-bold text-gray-900 mb-3">Containers in this Stack ({stackContainers.length})</h4>
              {stackContainers.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transporter Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container Size</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Design</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Height</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stackContainers.map((container) => {
                        const match = container.location.match(/S\d+-R\d+-H(\d+)/);
                        const height = match ? `H${match[1]}` : '-';
                        const containerType = container.status === 'in_depot' ? 'FULL' : 'EMPTY';
                        const transporter = 'Swift Transport';

                        return (
                          <tr
                            key={container.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedContainer(container);
                              setSelectedStack(null);
                            }}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-mono text-sm font-medium text-gray-900">{container.number}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{container.client}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              <div className="flex items-center">
                                <Truck className="h-4 w-4 mr-1 text-gray-400" />
                                {transporter}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                container.size === '40ft' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {container.size}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                containerType === 'FULL' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {containerType}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">
                              {container.type.replace('_', ' ')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700">
                                {height}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No containers in this stack
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => setSelectedStack(null)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
