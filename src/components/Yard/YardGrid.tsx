import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Home, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { Yard, Container } from '../../types';

interface YardGridProps {
  yard: Yard;
  containers: Container[];
  selectedContainer: Container | null;
  hoveredContainer: Container | null;
  onContainerSelect: (container: Container | null) => void;
  onContainerHover: (container: Container | null) => void;
  viewMode: 'overview' | 'detailed';
}

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
}

interface ContainerSlot {
  id: string;
  stackNumber: number;
  sectionId: string;
  sectionName: string;
  row: number;
  tier: number;
  x: number;
  y: number;
  width: number;
  height: number;
  container: Container | null;
  isOccupied: boolean;
  sectionColor: string;
}

export const YardGrid: React.FC<YardGridProps> = ({
  yard,
  containers,
  selectedContainer,
  hoveredContainer,
  onContainerSelect,
  onContainerHover,
  viewMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 0.8,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });
  
  const [containerSlots, setContainerSlots] = useState<ContainerSlot[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Generate container slots from yard data
  const generateContainerSlots = useCallback(() => {
    const slots: ContainerSlot[] = [];
    const slotWidth = 80;
    const slotHeight = 30;
    const stackSpacing = 100;
    const rowSpacing = 35;
    const tierSpacing = 8;
    const sectionSpacing = 150;

    let currentY = 100;

    yard.sections.forEach((section) => {
      const sectionColor = section.color || '#3b82f6';
      let currentX = 100;

      // Sort stacks by stack number for consistent layout
      const sortedStacks = [...section.stacks].sort((a, b) => a.stackNumber - b.stackNumber);

      sortedStacks.forEach((stack, stackIndex) => {
        // Calculate stack position with proper spacing
        const stackX = currentX + (stackIndex * stackSpacing);
        
        // Generate slots for each row and tier in the stack
        for (let row = 0; row < stack.rows; row++) {
          for (let tier = 0; tier < stack.maxTiers; tier++) {
            const slotX = stackX + (row * (slotWidth * 0.6)); // Overlap for angled effect
            const slotY = currentY + (tier * tierSpacing);
            
            // Find container in this position
            const containerInSlot = containers.find(container => {
              const locationMatch = container.location.match(/Stack S(\d+)-Row (\d+)-Tier (\d+)/);
              if (locationMatch) {
                const [, stackNum, rowNum, tierNum] = locationMatch;
                return parseInt(stackNum) === stack.stackNumber &&
                       parseInt(rowNum) === row + 1 &&
                       parseInt(tierNum) === tier + 1;
              }
              return false;
            });

            slots.push({
              id: `${stack.id}-${row}-${tier}`,
              stackNumber: stack.stackNumber,
              sectionId: section.id,
              sectionName: section.name,
              row: row + 1,
              tier: tier + 1,
              x: slotX,
              y: slotY,
              width: slotWidth,
              height: slotHeight,
              container: containerInSlot || null,
              isOccupied: !!containerInSlot,
              sectionColor
            });
          }
        }
      });

      currentY += sectionSpacing;
    });

    setContainerSlots(slots);
  }, [yard, containers]);

  // Initialize slots when data changes
  useEffect(() => {
    generateContainerSlots();
  }, [generateContainerSlots]);

  // Get container color based on status and condition
  const getContainerColor = (container: Container): string => {
    if (container.damage && container.damage.length > 0) {
      return '#ef4444'; // Red for damaged
    }
    
    switch (container.status) {
      case 'in_depot':
        return '#3b82f6'; // Blue for in depot
      case 'out_depot':
        return '#10b981'; // Green for out depot
      case 'maintenance':
        return '#f59e0b'; // Orange for maintenance
      case 'cleaning':
        return '#8b5cf6'; // Purple for cleaning
      default:
        return '#6b7280'; // Gray for others
    }
  };

  // Draw the yard grid
  const drawYard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const container = containerRef.current;
    if (container) {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(viewState.zoom, viewState.zoom);
    ctx.translate(viewState.offsetX, viewState.offsetY);

    // Draw background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-3000, -2000, 6000, 4000);

    // Draw section backgrounds
    const sectionsByY = new Map<string, { y: number; height: number; color: string; name: string }>();
    
    containerSlots.forEach(slot => {
      if (!sectionsByY.has(slot.sectionId)) {
        const sectionSlots = containerSlots.filter(s => s.sectionId === slot.sectionId);
        const minY = Math.min(...sectionSlots.map(s => s.y));
        const maxY = Math.max(...sectionSlots.map(s => s.y + s.height));
        const minX = Math.min(...sectionSlots.map(s => s.x));
        const maxX = Math.max(...sectionSlots.map(s => s.x + s.width));
        
        sectionsByY.set(slot.sectionId, {
          y: minY - 30,
          height: maxY - minY + 60,
          color: slot.sectionColor,
          name: slot.sectionName
        });
      }
    });

    // Draw sections
    sectionsByY.forEach((sectionData, sectionId) => {
      const sectionSlots = containerSlots.filter(s => s.sectionId === sectionId);
      const minX = Math.min(...sectionSlots.map(s => s.x));
      const maxX = Math.max(...sectionSlots.map(s => s.x + s.width));
      const sectionWidth = maxX - minX + 100;
      
      // Section background
      ctx.fillStyle = sectionData.color + '15';
      ctx.fillRect(minX - 50, sectionData.y, sectionWidth, sectionData.height);
      
      // Section border
      ctx.strokeStyle = sectionData.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(minX - 50, sectionData.y, sectionWidth, sectionData.height);
      
      // Section label
      ctx.fillStyle = sectionData.color;
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(sectionData.name, minX - 40, sectionData.y + 25);
    });

    // Draw container slots
    containerSlots.forEach(slot => {
      const isSelected = selectedContainer?.id === slot.container?.id;
      const isHovered = hoveredContainer?.id === slot.container?.id;
      
      ctx.save();
      
      // Apply angled transformation for 2D perspective
      ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
      ctx.rotate(-Math.PI / 12); // 15-degree angle like in your image
      ctx.translate(-slot.width / 2, -slot.height / 2);
      
      if (slot.isOccupied && slot.container) {
        // Draw occupied slot with container color
        const baseColor = getContainerColor(slot.container);
        ctx.fillStyle = isSelected ? '#f97316' : baseColor;
        ctx.fillRect(0, 0, slot.width, slot.height);
        
        // Add subtle shadow for depth
        ctx.fillStyle = isSelected ? '#ea580c' : baseColor + 'DD';
        ctx.fillRect(3, 3, slot.width, slot.height);
        
        // Container border
        ctx.strokeStyle = isSelected ? '#c2410c' : '#ffffff';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(0, 0, slot.width, slot.height);
        
        // Container number (if zoom is sufficient)
        if (viewState.zoom > 0.6) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(10, 12 * viewState.zoom)}px Arial`;
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 2;
          ctx.fillText(
            slot.container.number.slice(-4),
            slot.width / 2,
            slot.height / 2 + 4
          );
          ctx.shadowBlur = 0;
        }
      } else {
        // Draw empty slot
        ctx.fillStyle = isHovered ? '#e5e7eb' : '#f3f4f6';
        ctx.fillRect(0, 0, slot.width, slot.height);
        
        // Empty slot border
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(0, 0, slot.width, slot.height);
        ctx.setLineDash([]);
      }
      
      // Highlight effect for hovered or selected slots
      if (isHovered || isSelected) {
        ctx.strokeStyle = isSelected ? '#f97316' : '#3b82f6';
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.strokeRect(-3, -3, slot.width + 6, slot.height + 6);
      }
      
      ctx.restore();
    });

    // Draw stack labels
    const drawnStacks = new Set<number>();
    containerSlots.forEach(slot => {
      if (!drawnStacks.has(slot.stackNumber)) {
        drawnStacks.add(slot.stackNumber);
        
        // Find the bottom-left slot of this stack for label positioning
        const stackSlots = containerSlots.filter(s => s.stackNumber === slot.stackNumber);
        const minX = Math.min(...stackSlots.map(s => s.x));
        const maxY = Math.max(...stackSlots.map(s => s.y));
        
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${Math.max(14, 16 * viewState.zoom)}px Arial`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255,255,255,0.8)';
        ctx.shadowBlur = 3;
        ctx.fillText(
          `S${slot.stackNumber.toString().padStart(2, '0')}`,
          minX + 40,
          maxY + 50
        );
        ctx.shadowBlur = 0;
      }
    });

    ctx.restore();
  }, [viewState, containerSlots, selectedContainer, hoveredContainer, yard]);

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (viewState.isDragging) {
      const deltaX = mouseX - viewState.lastMouseX;
      const deltaY = mouseY - viewState.lastMouseY;
      
      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX / prev.zoom,
        offsetY: prev.offsetY + deltaY / prev.zoom,
        lastMouseX: mouseX,
        lastMouseY: mouseY
      }));
      return;
    }

    // Convert mouse coordinates to world coordinates
    const worldX = (mouseX - canvas.width / 2) / viewState.zoom - viewState.offsetX;
    const worldY = (mouseY - canvas.height / 2) / viewState.zoom - viewState.offsetY;

    // Find hovered slot
    let foundContainer: Container | null = null;
    for (const slot of containerSlots) {
      if (slot.container && 
          worldX >= slot.x - 10 && worldX <= slot.x + slot.width + 10 &&
          worldY >= slot.y - 10 && worldY <= slot.y + slot.height + 10) {
        foundContainer = slot.container;
        break;
      }
    }
    
    onContainerHover(foundContainer);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.button === 0) { // Left click
      const worldX = (mouseX - canvas.width / 2) / viewState.zoom - viewState.offsetX;
      const worldY = (mouseY - canvas.height / 2) / viewState.zoom - viewState.offsetY;

      // Find clicked container
      let clickedContainer: Container | null = null;
      for (const slot of containerSlots) {
        if (slot.container && 
            worldX >= slot.x - 10 && worldX <= slot.x + slot.width + 10 &&
            worldY >= slot.y - 10 && worldY <= slot.y + slot.height + 10) {
          clickedContainer = slot.container;
          break;
        }
      }
      
      onContainerSelect(clickedContainer);
    } else if (e.button === 2) { // Right click for panning
      e.preventDefault();
      setViewState(prev => ({
        ...prev,
        isDragging: true,
        lastMouseX: mouseX,
        lastMouseY: mouseY
      }));
    }
  };

  const handleMouseUp = () => {
    setViewState(prev => ({ ...prev, isDragging: false }));
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.2, Math.min(3, prev.zoom * zoomFactor))
    }));
  };

  const handleResetView = () => {
    setViewState({
      zoom: 0.8,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0
    });
    onContainerSelect(null);
  };

  const handleZoomIn = () => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.min(3, prev.zoom * 1.2)
    }));
  };

  const handleZoomOut = () => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.2, prev.zoom * 0.8)
    }));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Focus on selected container
  useEffect(() => {
    if (selectedContainer) {
      const containerSlot = containerSlots.find(slot => 
        slot.container?.id === selectedContainer.id
      );
      
      if (containerSlot) {
        setViewState(prev => ({
          ...prev,
          zoom: 1.5,
          offsetX: -containerSlot.x - containerSlot.width / 2,
          offsetY: -containerSlot.y - containerSlot.height / 2
        }));
      }
    }
  }, [selectedContainer, containerSlots]);

  // Draw canvas
  useEffect(() => {
    drawYard();
  }, [drawYard]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className={`relative bg-gray-50 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'w-full h-full'}`}>
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </div>

      {/* Control Panel */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button
          onClick={toggleFullscreen}
          className="p-3 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors group"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-5 w-5 group-hover:text-blue-600 transition-colors" />
          ) : (
            <Maximize2 className="h-5 w-5 group-hover:text-blue-600 transition-colors" />
          )}
        </button>
        
        <button
          onClick={handleResetView}
          className="p-3 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors group"
          title="Reset View"
        >
          <Home className="h-5 w-5 group-hover:text-blue-600 transition-colors" />
        </button>
        
        <button
          onClick={handleZoomIn}
          className="p-3 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors group"
          title="Zoom In"
        >
          <ZoomIn className="h-5 w-5 group-hover:text-blue-600 transition-colors" />
        </button>
        
        <button
          onClick={handleZoomOut}
          className="p-3 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors group"
          title="Zoom Out"
        >
          <ZoomOut className="h-5 w-5 group-hover:text-blue-600 transition-colors" />
        </button>
      </div>

      {/* Selected Container Info */}
      {selectedContainer && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-4 rounded-xl shadow-xl font-medium flex items-center space-x-4 max-w-md animate-slide-in-up">
          <div className="p-2 bg-orange-600 rounded-lg">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-lg">{selectedContainer.number}</div>
            <div className="text-sm opacity-90">{selectedContainer.location}</div>
            <div className="text-xs opacity-75">{selectedContainer.client}</div>
          </div>
          <button
            onClick={() => onContainerSelect(null)}
            className="hover:bg-orange-600 rounded-lg p-2 transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 rounded-xl p-4 shadow-xl border border-gray-200">
        <div className="text-sm font-semibold text-gray-900 mb-3">Container Status</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-3 bg-blue-500 rounded transform -rotate-12 shadow-sm"></div>
            <span className="font-medium">In Depot</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-3 bg-red-500 rounded transform -rotate-12 shadow-sm"></div>
            <span className="font-medium">Damaged</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-3 bg-orange-500 rounded transform -rotate-12 shadow-sm"></div>
            <span className="font-medium">Maintenance</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-3 bg-purple-500 rounded transform -rotate-12 shadow-sm"></div>
            <span className="font-medium">Cleaning</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-3 bg-gray-300 border border-gray-400 rounded transform -rotate-12"></div>
            <span className="font-medium">Available</span>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Zoom:</span>
            <span className="font-medium">{Math.round(viewState.zoom * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Containers:</span>
            <span className="font-medium">{containers.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Stacks:</span>
            <span className="font-medium">{yard.sections.reduce((sum, s) => sum + s.stacks.length, 0)}</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-xl p-4 shadow-xl border border-gray-200 max-w-xs">
        <div className="text-sm font-semibold text-gray-900 mb-2">Navigation</div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• <strong>Click</strong> containers to select</div>
          <div>• <strong>Right-click + drag</strong> to pan</div>
          <div>• <strong>Scroll wheel</strong> to zoom</div>
          <div>• <strong>Hover</strong> for container details</div>
        </div>
      </div>

      {/* Fullscreen Exit Button */}
      {isFullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-20 p-3 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};