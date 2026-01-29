import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, MapPin, Package, X, TrendingUp, AlertTriangle, Eye, Truck, Maximize2, Minimize2, Calendar, FileText } from 'lucide-react';
import { Container } from '../../types';
import { Yard, YardStack } from '../../types/yard';
import { useAuth } from '../../hooks/useAuth';
import { StackDetailsModal } from './StackDetailsModal';

// Helper function to calculate virtual location for 40ft containers
const getVirtualLocation = (container: Container, getStackConfiguration: (stackNum: number) => any): string => {
  // Handle both formats: "S01-R3-H3" and "S01R3H3"
  const match = container.location.match(/S(\d+)[-]?R(\d+)[-]?H(\d+)/);
  if (!match) return container.location;

  const stackNum = parseInt(match[1]);
  const row = match[2];
  const height = match[3];

  // For 40ft containers in paired stacks, show virtual stack location
  if (container.size === '40ft') {
    const config = getStackConfiguration(stackNum);
    if (config.pairedWith) {
      const virtualStackNum = Math.min(stackNum, config.pairedWith) + 1;
      return `S${virtualStackNum.toString().padStart(2, '0')}-R${row}-H${height}`;
    }
  }

  return container.location;
};

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
  isPaired?: boolean; // True if this is a physical stack paired with a virtual stack
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

export const YardLiveMap: React.FC<YardLiveMapProps> = ({ yard, containers: propContainers }) => {
  const { user, canViewAllData } = useAuth();
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [selectedStack, setSelectedStack] = useState<YardStack | null>(null);
  const [selectedStackViz, setSelectedStackViz] = useState<StackVisualization | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [highlightedStacks, setHighlightedStacks] = useState<number[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<Container[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stackRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const allContainers = useMemo(() => {
    return propContainers;
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

  const SPECIAL_STACKS = [1, 31, 101, 103];

  const getAdjacentStackNumberForUI = (stackNumber: number): number | null => {
    if (SPECIAL_STACKS.includes(stackNumber)) return null;

    const isValidPairStack = (num: number): boolean => {
      if (num >= 3 && num <= 29) {
        const validFirstNumbers = [3, 7, 11, 15, 19, 23, 27];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      } else if (num >= 33 && num <= 55) {
        const validFirstNumbers = [33, 37, 41, 45, 49, 53];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      } else if (num >= 61 && num <= 99) {
        const validFirstNumbers = [61, 65, 69, 73, 77, 81, 85, 89, 93, 97];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      }
      return false;
    };

    if (!isValidPairStack(stackNumber)) return null;

    let partnerNumber: number;

    if (stackNumber >= 3 && stackNumber <= 29) {
      const validFirstNumbers = [3, 7, 11, 15, 19, 23, 27];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else if (stackNumber >= 33 && stackNumber <= 55) {
      const validFirstNumbers = [33, 37, 41, 45, 49, 53];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else if (stackNumber >= 61 && stackNumber <= 99) {
      const validFirstNumbers = [61, 65, 69, 73, 77, 81, 85, 89, 93, 97];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else {
      return null;
    }

    return partnerNumber;
  };

  const getStackConfiguration = (stackNumber: number): { containerSize: '20ft' | '40ft'; isSpecialStack: boolean; pairedWith?: number } => {
    if (SPECIAL_STACKS.includes(stackNumber)) {
      return { containerSize: '20ft', isSpecialStack: true };
    }

    // Default 40ft configuration for demo stacks
    const DEFAULT_40FT_STACKS = [3, 5, 7, 9];
    const is40ftDefault = DEFAULT_40FT_STACKS.includes(stackNumber);

    const storedConfig = localStorage.getItem(`stack-config-${stackNumber}`);
    if (storedConfig) {
      const config = JSON.parse(storedConfig);
      const containerSize = config.containerSize === '40ft' ? '40ft' : '20ft';

      if (containerSize === '40ft') {
        const pairedWith = getAdjacentStackNumberForUI(stackNumber);
        return {
          containerSize,
          isSpecialStack: config.isSpecialStack || false,
          pairedWith: pairedWith || undefined
        };
      }

      return {
        containerSize,
        isSpecialStack: config.isSpecialStack || false
      };
    }

    // If no config and this is a default 40ft stack, configure it as 40ft
    if (is40ftDefault) {
      const pairedWith = getAdjacentStackNumberForUI(stackNumber);
      return {
        containerSize: '40ft',
        isSpecialStack: false,
        pairedWith: pairedWith || undefined
      };
    }

    return { containerSize: '20ft', isSpecialStack: false };
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

    // Only filter by status if it's not 'all' - but include all containers that are physically in the yard
    if (filterStatus !== 'all') {
      if (filterStatus === 'damaged') {
        filtered = filtered.filter(c => c.damage && c.damage.length > 0);
      } else if (filterStatus === 'empty') {
        // For empty filter, we want stacks with no containers
        // This is handled in the rendering logic, not here
      } else {
        filtered = filtered.filter(c => c.status === filterStatus);
      }
    } else {
      // For 'all' status, include containers that are physically in the yard
      // This includes: gate_in, in_depot, maintenance, cleaning
      filtered = filtered.filter(c => 
        c.status === 'gate_in' || 
        c.status === 'in_depot' || 
        c.status === 'maintenance' || 
        c.status === 'cleaning'
      );
    }

    if (selectedZone !== 'all' && yard) {
      const section = yard.sections.find(s => s.id === selectedZone);
      if (section) {
        const stackNumbers = section.stacks.map(s => s.stackNumber);
        filtered = filtered.filter(c => {
          // Handle both formats: "S01-R3-H3" and "S01R3H3"
          const match = c.location.match(/S(\d+)[-]?R\d+[-]?H\d+/);
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
    if (highlightedStacks.length > 0) {
      const timer = setTimeout(() => {
        setHighlightedStacks([]);
      }, 8000); // Augmenté à 8 secondes pour une meilleure visibilité
      return () => clearTimeout(timer);
    }
  }, [highlightedStacks]);

  const scrollToContainer = () => {
    if (!searchedContainer) return;

    const match = searchedContainer.location.match(/S(\d+)[-]?R\d+[-]?H\d+/);
    if (!match) return;

    const stackNumber = parseInt(match[1]);
    const stacksToHighlight: number[] = [];

    // Find the stack visualization that contains this container
    const containerStackViz = stacksData.find(stackViz => {
      // Check if this container is in the stack's container slots
      return stackViz.containerSlots.some(slot => slot.containerId === searchedContainer.id);
    });

    if (containerStackViz) {
      // If container is found in a virtual stack, highlight the virtual stack and its paired physical stacks
      if (containerStackViz.isVirtual) {
        stacksToHighlight.push(containerStackViz.stackNumber);
        
        // Also highlight the paired physical stacks
        const pairedPhysicalStacks = stacksData.filter(s => 
          !s.isVirtual && s.isPaired && s.pairedWith === containerStackViz.stackNumber
        );
        pairedPhysicalStacks.forEach(s => stacksToHighlight.push(s.stackNumber));

        // Scroll to virtual stack
        const virtualStackElement = stackRefs.current.get(containerStackViz.stackNumber);
        if (virtualStackElement) {
          virtualStackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedStacks(stacksToHighlight);
          return;
        }
      } else {
        // Container is in a physical stack
        stacksToHighlight.push(containerStackViz.stackNumber);
        
        // If this physical stack is paired with a virtual stack, also highlight the virtual stack
        if (containerStackViz.isPaired && containerStackViz.pairedWith) {
          stacksToHighlight.push(containerStackViz.pairedWith);
          
          // Also highlight the other paired physical stack
          const otherPairedStack = stacksData.find(s => 
            !s.isVirtual && s.isPaired && s.pairedWith === containerStackViz.pairedWith && s.stackNumber !== containerStackViz.stackNumber
          );
          if (otherPairedStack) {
            stacksToHighlight.push(otherPairedStack.stackNumber);
          }
        }

        // Scroll to physical stack
        const stackElement = stackRefs.current.get(containerStackViz.stackNumber);
        if (stackElement) {
          stackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedStacks(stacksToHighlight);
          return;
        }
      }
    } else {
      // Fallback: use the original logic if container not found in stacksData
      stacksToHighlight.push(stackNumber);
      
      // For 40ft containers, also try to highlight virtual stack
      if (searchedContainer.size === '40ft') {
        const config = getStackConfiguration(stackNumber);
        if (config.pairedWith) {
          const virtualStackNum = Math.min(stackNumber, config.pairedWith) + 1;
          stacksToHighlight.push(config.pairedWith, virtualStackNum);
        }
      }

      const stackElement = stackRefs.current.get(stackNumber);
      if (stackElement) {
        stackElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedStacks(stacksToHighlight);
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

        // Check if this stack is virtual (from database)
        const isVirtualStack = (stack as any).isVirtual === true;
        
        // For virtual stacks, render them directly - but only if they are active
        if (isVirtualStack && stack.isActive) {
          processedStacks.add(stack.stackNumber);
          
          // For virtual stacks, collect 40ft containers from BOTH paired physical stacks
          const virtualStackData = stack as any;
          const pairedStackIds = [virtualStackData.stack1Id, virtualStackData.stack2Id].filter(Boolean);
          const pairedPhysicalStacks = sortedStacks.filter(s => pairedStackIds.includes(s.id));
          const pairedStackNumbers = pairedPhysicalStacks.map(s => s.stackNumber);
          
          const virtualContainers = filteredContainers.filter(c => {
            // Only include 40ft containers from the paired physical stacks
            if (c.size !== '40ft') return false;
            const match = c.location.match(/S(\d+)[-]?R\d+[-]?H\d+/);
            return match && pairedStackNumbers.includes(parseInt(match[1]));
          });

          const containerSlots: ContainerSlot[] = virtualContainers.map(c => {
            // Handle both formats: "S01-R3-H3" and "S01R3H3"
            const locMatch = c.location.match(/S\d+[-]?R(\d+)[-]?H(\d+)/);
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
              client: c.clientName,
              transporter: 'Swift Transport',
              containerType: c.status === 'in_depot' ? 'FULL' : 'EMPTY'
            };
          });

          // Calculate proper capacity for virtual stack
          let virtualCapacity = stack.capacity;
          
          // If capacity is 0 or invalid, calculate it properly
          if (!virtualCapacity || virtualCapacity <= 0) {
            if (stack.rowTierConfig && stack.rowTierConfig.length > 0) {
              // Calculate from row-tier config
              virtualCapacity = stack.rowTierConfig.reduce((sum, config) => sum + config.maxTiers, 0);
            } else {
              // Uniform calculation
              virtualCapacity = stack.rows * stack.maxTiers;
            }
          }

          allStacks.push({
            stackNumber: stack.stackNumber,
            isVirtual: true,
            stack,
            section,
            zoneName,
            containerSize: '40ft',
            isSpecialStack: false,
            containerSlots,
            currentOccupancy: containerSlots.length,
            capacity: virtualCapacity, // Use calculated capacity
            rows: stack.rows,
            maxTiers: stack.maxTiers
          });

          return;
        }

        // Check if this physical stack is part of a virtual stack pairing
        const stackContainerSize = (stack as any).containerSize;
        let isPairedPhysicalStack = false;
        let pairedVirtualStackNumber: number | null = null;
        let pairedStackId: string | null = null;
        
        if (stackContainerSize === '40ft') {
          // Find any virtual stack that includes this physical stack in its pairing
          const virtualStack = sortedStacks.find(s => {
            if (!(s as any).isVirtual) return false;
            const virtualStackData = s as any;
            return virtualStackData.stack1Id === stack.id || virtualStackData.stack2Id === stack.id;
          });
          
          if (virtualStack) {
            pairedVirtualStackNumber = virtualStack.stackNumber;
            isPairedPhysicalStack = true;
            // Find the paired physical stack
            const virtualStackData = virtualStack as any;
            pairedStackId = virtualStackData.stack1Id === stack.id ? virtualStackData.stack2Id : virtualStackData.stack1Id;
          } else {
            // Fallback: Check if there's an adjacent 40ft stack that should be paired
            const config = getStackConfiguration(stack.stackNumber);
            if (config.pairedWith) {
              const adjacentStack = sortedStacks.find(s => s.stackNumber === config.pairedWith);
              if (adjacentStack && (adjacentStack as any).containerSize === '40ft') {
                // Both stacks are 40ft but no virtual stack exists yet
                pairedVirtualStackNumber = Math.min(stack.stackNumber, config.pairedWith) + 1;
                isPairedPhysicalStack = true;
                pairedStackId = adjacentStack.id;
              }
            }
          }
        }

        // Get stack configuration for container size and special stack info
        const config = getStackConfiguration(stack.stackNumber);

        // Calculate proper capacity for physical stack
        let physicalCapacity = stack.capacity;
        
        // If capacity is 0 or invalid, calculate it properly
        if (!physicalCapacity || physicalCapacity <= 0) {
          if (stack.rowTierConfig && stack.rowTierConfig.length > 0) {
            // Calculate from row-tier config
            physicalCapacity = stack.rowTierConfig.reduce((sum, config) => sum + config.maxTiers, 0);
          } else {
            // Uniform calculation
            physicalCapacity = stack.rows * stack.maxTiers;
          }
        }

        // For 40ft paired stacks, we need special handling
        if (isPairedPhysicalStack && pairedVirtualStackNumber) {
          // Get all 40ft containers from BOTH paired stacks (S03 and S05)
          const pairedStack = sortedStacks.find(s => s.id === pairedStackId);
          const bothStackNumbers = [stack.stackNumber, pairedStack?.stackNumber].filter(Boolean);
          
          const all40ftContainers = filteredContainers.filter(c => {
            if (c.size !== '40ft') return false;
            const match = c.location.match(/S(\d+)[-]?R\d+[-]?H\d+/);
            return match && bothStackNumbers.includes(parseInt(match[1]));
          });

          // Create container slots but don't show them in physical stacks (they'll be shown in virtual stack)
          const containerSlots: ContainerSlot[] = []; // Empty for physical stacks

          allStacks.push({
            stackNumber: stack.stackNumber,
            isVirtual: false,
            isPaired: true, // Mark as paired
            pairedWith: pairedVirtualStackNumber,
            stack,
            section,
            zoneName,
            containerSize: '40ft',
            isSpecialStack: config.isSpecialStack,
            containerSlots, // Empty - containers shown in virtual stack
            currentOccupancy: all40ftContainers.length, // Show same count as virtual stack
            capacity: physicalCapacity, // Use calculated capacity
            rows: stack.rows,
            maxTiers: stack.maxTiers
          });

          processedStacks.add(stack.stackNumber);
          return;
        }

        // Regular stack processing (for 20ft stacks or unpaired stacks)
        const stackContainers = filteredContainers.filter(c => {
          // Handle both formats: "S01-R3-H3" and "S01R3H3"
          const match = c.location.match(/S(\d+)[-]?R\d+[-]?H\d+/);
          return match && parseInt(match[1]) === stack.stackNumber;
        });

        const containerSlots: ContainerSlot[] = stackContainers.map(c => {
          // Handle both formats: "S01-R3-H3" and "S01R3H3"
          const locMatch = c.location.match(/S\d+[-]?R(\d+)[-]?H(\d+)/);
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
            client: c.clientName,
            transporter: 'Swift Transport',
            containerType: c.status === 'in_depot' ? 'FULL' : 'EMPTY'
          };
        });

        // Calculate proper capacity for regular stack
        let regularCapacity = stack.capacity;
        
        // If capacity is 0 or invalid, calculate it properly
        if (!regularCapacity || regularCapacity <= 0) {
          if (stack.rowTierConfig && stack.rowTierConfig.length > 0) {
            // Calculate from row-tier config
            regularCapacity = stack.rowTierConfig.reduce((sum, config) => sum + config.maxTiers, 0);
          } else {
            // Uniform calculation
            regularCapacity = stack.rows * stack.maxTiers;
          }
        }

        allStacks.push({
          stackNumber: stack.stackNumber,
          isVirtual: false,
          isPaired: isPairedPhysicalStack, // Mark if this is paired with a virtual stack
          pairedWith: pairedVirtualStackNumber ?? undefined, // Reference to virtual stack
          stack,
          section,
          zoneName,
          containerSize: config.containerSize,
          isSpecialStack: config.isSpecialStack,
          containerSlots,
          currentOccupancy: containerSlots.length,
          capacity: regularCapacity, // Use calculated capacity
          rows: stack.rows,
          maxTiers: stack.maxTiers
        });

        processedStacks.add(stack.stackNumber);
      });
    });

    // After processing all physical stacks, check for missing virtual stacks
    // and create them temporarily for 40ft paired stacks
    const virtualStacksToAdd: StackVisualization[] = [];
    const processedVirtualStacks = new Set<number>();
    
    allStacks.forEach(stackViz => {
      if (stackViz.isPaired && !stackViz.isVirtual && stackViz.pairedWith) {
        const virtualStackNumber = stackViz.pairedWith;
        
        // Check if virtual stack already exists or was already processed
        if (!processedVirtualStacks.has(virtualStackNumber) && 
            !allStacks.some(s => s.stackNumber === virtualStackNumber && s.isVirtual)) {
          
          processedVirtualStacks.add(virtualStackNumber);
          
          // Find the paired physical stack
          const pairedPhysicalStack = allStacks.find(s => 
            s.isPaired && !s.isVirtual && s.pairedWith === virtualStackNumber && s.stackNumber !== stackViz.stackNumber
          );
          
          if (pairedPhysicalStack) {
            // Get all 40ft containers from both paired stacks
            const bothStackNumbers = [stackViz.stackNumber, pairedPhysicalStack.stackNumber];
            const virtual40ftContainers = filteredContainers.filter(c => {
              if (c.size !== '40ft') return false;
              const match = c.location.match(/S(\d+)[-]?R\d+[-]?H\d+/);
              return match && bothStackNumbers.includes(parseInt(match[1]));
            });

            const virtualContainerSlots: ContainerSlot[] = virtual40ftContainers.map(c => {
              const locMatch = c.location.match(/S\d+[-]?R(\d+)[-]?H(\d+)/);
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
                client: c.clientName,
                transporter: 'Swift Transport',
                containerType: c.status === 'in_depot' ? 'FULL' : 'EMPTY'
              };
            });

            // Calculate proper capacity for virtual stack
            let virtualCapacity = stackViz.capacity;
            
            // If capacity is 0 or invalid, calculate it properly
            if (!virtualCapacity || virtualCapacity <= 0) {
              if (stackViz.stack?.rowTierConfig && stackViz.stack.rowTierConfig.length > 0) {
                // Calculate from row-tier config
                virtualCapacity = stackViz.stack.rowTierConfig.reduce((sum, config) => sum + config.maxTiers, 0);
              } else {
                // Uniform calculation
                virtualCapacity = stackViz.rows * stackViz.maxTiers;
              }
            }

            // Create temporary virtual stack
            virtualStacksToAdd.push({
              stackNumber: virtualStackNumber,
              isVirtual: true,
              isPaired: false,
              stack: {
                id: `virtual-${virtualStackNumber}`,
                stackNumber: virtualStackNumber,
                sectionId: stackViz.section.id,
                sectionName: stackViz.section.name,
                rows: stackViz.rows,
                maxTiers: stackViz.maxTiers,
                capacity: virtualCapacity, // Use calculated capacity
                currentOccupancy: virtual40ftContainers.length,
                containerSize: '40ft',
                position: stackViz.stack?.position || { x: 0, y: 0, z: 0 },
                dimensions: stackViz.stack?.dimensions || { width: 2.5, length: 12 },
                containerPositions: [],
                isActive: true,
                isVirtual: true,
                createdBy: 'system'
              } as any,
              section: stackViz.section,
              zoneName: stackViz.zoneName,
              containerSize: '40ft',
              isSpecialStack: false,
              containerSlots: virtualContainerSlots,
              currentOccupancy: virtual40ftContainers.length,
              capacity: virtualCapacity, // Use calculated capacity
              rows: stackViz.rows,
              maxTiers: stackViz.maxTiers
            });
          }
        }
      }
    });

    // Add the temporary virtual stacks
    allStacks.push(...virtualStacksToAdd);

    return allStacks.sort((a, b) => a.stackNumber - b.stackNumber);
  }, [yard, filteredContainers, selectedZone]);

  const stackContainers = useMemo(() => {
    if (!selectedStackViz) return [];

    // Use the containerSlots from the visualization which already has the correct containers
    const containerIds = selectedStackViz.containerSlots.map(slot => slot.containerId);
    return allContainers.filter(c => containerIds.includes(c.id));
  }, [selectedStackViz, allContainers]);

  const handleRowClick = (stackViz: StackVisualization, row: number) => {
    const rowContainers = stackViz.containerSlots.filter(s => s.row === row);
    if (rowContainers.length === 1) {
      const container = allContainers.find(c => c.id === rowContainers[0].containerId);
      if (container) {
        setSelectedContainer(container);
        setSelectedStack(null);
        setSelectedStackViz(null);
      }
    } else if (rowContainers.length > 1 || stackViz.stack) {
      setSelectedStack(stackViz.stack || null);
      setSelectedStackViz(stackViz);
      setSelectedContainer(null);
    }
  };

  const handleStackClick = (stackViz: StackVisualization) => {
    // Disable clicks on paired physical stacks (only allow virtual stack clicks)
    if (stackViz.isPaired && !stackViz.isVirtual) {
      return; // Do nothing for paired physical stacks
    }
    
    if (stackViz.stack) {
      setSelectedStack(stackViz.stack);
      setSelectedStackViz(stackViz);
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
      {!isFullscreen && (
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-bold text-gray-900 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                  {yard.name} - Live Map
                </h1>
                <p className="text-xs text-gray-600">
                  {yard.code} • {yard.currentOccupancy}/{yard.totalCapacity} ({stats.occupancyRate.toFixed(1)}%)
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Fullscreen Live Map"
            >
              <Maximize2 className="h-4 w-4" />
              Fullscreen
            </button>
          </div>

        <div className="grid grid-cols-5 gap-2 mb-2">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded px-2 py-1.5 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-blue-600 font-medium uppercase">Total</div>
                <div className="text-lg font-bold text-blue-900">{stats.total}</div>
              </div>
              <Package className="h-5 w-5 text-blue-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded px-2 py-1.5 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-green-600 font-medium uppercase">In Depot</div>
                <div className="text-lg font-bold text-green-900">{stats.inDepot}</div>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded px-2 py-1.5 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-orange-600 font-medium uppercase">Maintenance</div>
                <div className="text-lg font-bold text-orange-900">{stats.maintenance}</div>
              </div>
              <AlertTriangle className="h-5 w-5 text-orange-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded px-2 py-1.5 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-red-600 font-medium uppercase">Damaged</div>
                <div className="text-lg font-bold text-red-900">{stats.damaged}</div>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-600 opacity-50" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded px-2 py-1.5 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-600 font-medium uppercase">Empty</div>
                <div className="text-lg font-bold text-gray-900">{yard.totalCapacity - yard.currentOccupancy}</div>
              </div>
              <MapPin className="h-5 w-5 text-gray-600 opacity-50" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search container..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent font-mono"
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
                    <div className="text-xs text-gray-500">{container.clientName} • {getVirtualLocation(container, getStackConfiguration)}</div>
                  </div>
                ))}
              </div>
            )}

            {searchedContainer && !showSuggestions && (
              <div
                className="absolute top-full left-0 mt-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 shadow-lg z-10 flex items-center gap-2"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div>
                  <p className="text-xs text-green-700 font-medium">Found: {getVirtualLocation(searchedContainer, getStackConfiguration)}</p>
                  <p className="text-xs text-green-600">{searchedContainer.size} • {searchedContainer.type}</p>
                  {highlightedStacks.length > 0 && (
                    <p className="text-xs text-green-500 italic">Stack highlighted for {Math.ceil(8000/1000)}s</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    scrollToContainer();
                  }}
                  className="ml-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  {highlightedStacks.length > 0 ? 'Re-highlight' : 'View'}
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
            className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
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
            className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="gate_in">Gate In</option>
            <option value="in_depot">In Depot</option>
            <option value="gate_out">Gate Out</option>
            <option value="out_depot">Out Depot</option>
            <option value="maintenance">Maintenance</option>
            <option value="cleaning">Cleaning</option>
            <option value="damaged">Damaged</option>
            <option value="empty">Empty Stacks</option>
          </select>

          <div className="flex items-center gap-3 text-xs ml-auto">
            <span className="font-medium text-gray-600">Legend:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
              <span className="text-gray-600">Empty</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-gray-600">20ft</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-400 rounded" />
              <span className="text-gray-600">40ft</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-500 rounded" />
              <span className="text-gray-600">Maint.</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-gray-600">Damaged</span>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className="flex-1 p-4 overflow-auto relative">
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-white text-gray-700 hover:bg-gray-100 rounded-lg shadow-lg transition-colors border border-gray-300"
            title="Exit Fullscreen"
          >
            <Minimize2 className="h-4 w-4" />
            Exit Fullscreen
          </button>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
          {stacksData.filter(stackViz => {
            // Filter out inactive stacks (including inactive virtual stacks)
            if (stackViz.stack && !stackViz.stack.isActive) return false;
            // Apply empty filter
            return filterStatus !== 'empty' || stackViz.currentOccupancy === 0;
          }).map((stackViz) => {
            const occupancyPercent = (stackViz.currentOccupancy / stackViz.capacity) * 100;
            const displayName = stackViz.isVirtual
              ? `S${stackViz.stackNumber.toString().padStart(2, '0')} (Virtual)`
              : `S${stackViz.stackNumber.toString().padStart(2, '0')}`;

            // Render virtual stacks as orange circles with connection lines
            if (stackViz.isVirtual) {
              return (
                <div
                  key={`${stackViz.stackNumber}-virtual`}
                  ref={(el) => {
                    if (el) stackRefs.current.set(stackViz.stackNumber, el);
                  }}
                  className="flex items-center justify-center relative py-4"
                  style={{ gridColumn: 'span 1', minHeight: '200px' }}
                >
                  {/* Connection lines using pseudo-elements and borders */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Left line */}
                    <div className={`absolute left-0 top-1/2 w-1/3 h-1 bg-gradient-to-r transition-all duration-300 ${
                      highlightedStacks.includes(stackViz.stackNumber)
                        ? 'from-yellow-300 to-yellow-500 h-2 shadow-lg shadow-yellow-400/50'
                        : 'from-orange-400 to-orange-500'
                    }`} style={{ transform: 'translateY(-50%)' }}>
                      {highlightedStacks.includes(stackViz.stackNumber) && (
                        <div className="absolute inset-0 bg-yellow-400 opacity-40 animate-pulse"></div>
                      )}
                    </div>
                    {/* Right line */}
                    <div className={`absolute right-0 top-1/2 w-1/3 h-1 bg-gradient-to-l transition-all duration-300 ${
                      highlightedStacks.includes(stackViz.stackNumber)
                        ? 'from-yellow-300 to-yellow-500 h-2 shadow-lg shadow-yellow-400/50'
                        : 'from-orange-400 to-orange-500'
                    }`} style={{ transform: 'translateY(-50%)' }}>
                      {highlightedStacks.includes(stackViz.stackNumber) && (
                        <div className="absolute inset-0 bg-yellow-400 opacity-40 animate-pulse"></div>
                      )}
                    </div>
                  </div>

                  {/* Orange circle - reduced size */}
                  <div
                    className={`w-20 h-20 rounded-full bg-gradient-to-br cursor-pointer hover:scale-110 transition-all flex flex-col items-center justify-center relative z-10 ${
                      highlightedStacks.includes(stackViz.stackNumber)
                        ? 'from-yellow-300 to-yellow-500 border-4 border-yellow-400 shadow-2xl shadow-yellow-400/80 ring-8 ring-yellow-300/60 animate-pulse scale-125'
                        : 'from-orange-400 to-orange-600 border-4 border-orange-700 shadow-xl'
                    }`}
                    onClick={() => handleStackClick(stackViz)}
                    title={`Click to view ${stackViz.currentOccupancy} containers`}
                  >
                    <span className={`font-bold text-lg ${
                      highlightedStacks.includes(stackViz.stackNumber) ? 'text-gray-800' : 'text-white'
                    }`}>S{stackViz.stackNumber.toString().padStart(2, '0')}</span>
                    <span className={`text-[10px] font-semibold mt-0.5 ${
                      highlightedStacks.includes(stackViz.stackNumber) ? 'text-gray-700' : 'text-white'
                    }`}>{stackViz.currentOccupancy}/{stackViz.capacity}</span>
                  </div>
                </div>
              );
            }

            // Render regular stacks normally (or grayed out if paired)
            return (
              <div
                key={`${stackViz.stackNumber}-physical`}
                ref={(el) => {
                  if (el) stackRefs.current.set(stackViz.stackNumber, el);
                }}
                className={`rounded-lg border-2 transition-all overflow-hidden ${
                  stackViz.isPaired && !stackViz.isVirtual
                    ? 'cursor-not-allowed bg-gray-100 opacity-60 border-gray-300' 
                    : 'cursor-pointer bg-white hover:border-blue-400'
                } ${
                  highlightedStacks.includes(stackViz.stackNumber)
                    ? 'border-yellow-400 shadow-2xl shadow-yellow-400/60 ring-4 ring-yellow-300/50 animate-pulse scale-105 bg-yellow-50'
                    : stackViz.isPaired ? 'border-gray-300' : 'border-gray-200'
                }`}
                onClick={() => handleStackClick(stackViz)}
                title={
                  stackViz.isPaired && !stackViz.isVirtual
                    ? `Physical stack paired with virtual S${stackViz.pairedWith?.toString().padStart(2, '0')} - Click virtual stack to view containers`
                    : stackViz.currentOccupancy > 0 
                    ? `Click to view ${stackViz.currentOccupancy} containers`
                    : 'Click to view stack details'
                }
              >
                <div
                  className={`px-3 py-2 border-b ${stackViz.isPaired ? 'bg-gray-200' : ''}`}
                  style={!stackViz.isPaired ? {
                    backgroundColor: `${stackViz.section.color}15`,
                    borderColor: stackViz.section.color
                  } : {
                    borderColor: '#d1d5db'
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-bold text-base ${stackViz.isPaired ? 'text-gray-500' : ''}`}>
                      {displayName}
                      {stackViz.isPaired && (
                        <span className="ml-1 text-xs text-gray-400">
                          → S{stackViz.pairedWith?.toString().padStart(2, '0')}
                        </span>
                      )}
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
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Container Details</h3>
                    <p className="text-blue-100 text-sm font-mono">{selectedContainer.number}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedContainer(null)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <label className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Type</label>
                  </div>
                  <p className="text-lg font-bold text-blue-900 capitalize">{selectedContainer.type.replace('_', ' ')}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="h-4 w-4 text-purple-600" />
                    <label className="text-xs font-semibold text-purple-900 uppercase tracking-wide">Size</label>
                  </div>
                  <p className="text-lg font-bold text-purple-900">{selectedContainer.size}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <label className="text-xs font-semibold text-green-900 uppercase tracking-wide">Client</label>
                  </div>
                  <p className="text-lg font-bold text-green-900">{selectedContainer.clientName}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="h-4 w-4 text-orange-600" />
                    <label className="text-xs font-semibold text-orange-900 uppercase tracking-wide">Location</label>
                  </div>
                  <p className="text-lg font-bold text-orange-900 font-mono">{getVirtualLocation(selectedContainer, getStackConfiguration)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3 block">Status</label>
                <span className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-lg ${
                  selectedContainer.status === 'gate_in' ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
                  selectedContainer.status === 'in_depot' ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                  selectedContainer.status === 'gate_out' ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' :
                  selectedContainer.status === 'out_depot' ? 'bg-gray-100 text-gray-800 border-2 border-gray-300' :
                  selectedContainer.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                  selectedContainer.status === 'cleaning' ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' :
                  'bg-gray-100 text-gray-800 border-2 border-gray-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    selectedContainer.status === 'gate_in' ? 'bg-blue-500' :
                    selectedContainer.status === 'in_depot' ? 'bg-green-500' :
                    selectedContainer.status === 'gate_out' ? 'bg-orange-500' :
                    selectedContainer.status === 'out_depot' ? 'bg-gray-500' :
                    selectedContainer.status === 'maintenance' ? 'bg-yellow-500' :
                    selectedContainer.status === 'cleaning' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`} />
                  {selectedContainer.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {selectedContainer.damage && selectedContainer.damage.length > 0 && (
                <div className="bg-red-50 p-4 rounded-xl border-2 border-red-200">
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <label className="text-sm font-bold text-red-900 uppercase tracking-wide">Damage Report</label>
                  </div>
                  <div className="space-y-2">
                    {selectedContainer.damage.map((d, i) => (
                      <div key={i} className="flex items-start space-x-2 bg-white p-2 rounded-lg">
                        <span className="w-2 h-2 bg-red-500 rounded-full mt-1.5 flex-shrink-0" />
                        <p className="text-sm text-red-800 font-medium">{d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedContainer.gateInDate && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <label className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Gate In Date</label>
                  </div>
                  <p className="text-base font-bold text-blue-900">
                    {new Date(selectedContainer.gateInDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setSelectedContainer(null)}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedStack && !selectedContainer && (
        <StackDetailsModal
          stack={selectedStack}
          stackViz={selectedStackViz}
          containers={stackContainers}
          onClose={() => { 
            setSelectedStack(null); 
            setSelectedStackViz(null); 
          }}
          onSelectContainer={(container) => {
            setSelectedContainer(container);
            setSelectedStack(null);
            setSelectedStackViz(null);
          }}
        />
      )}
    </div>
  );
};
