import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Home, X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Yard, Container } from '../../types';

interface YardCanvas2DProps {
  yard: Yard;
  containers: Container[];
  selectedContainer: Container | null;
  onContainerSelect: (container: Container | null) => void;
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

export const YardCanvas2D: React.FC<YardCanvas2DProps> = ({
  yard,
  containers,
  selectedContainer,
  onContainerSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0
  });
  
  const [hoveredSlot, setHoveredSlot] = useState<ContainerSlot | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [containerSlots, setContainerSlots] = useState<ContainerSlot[]>([]);

  // Generate container slots from yard data
  const generateContainerSlots = useCallback(() => {
    const slots: ContainerSlot[] = [];
    const slotWidth = 60;
    const slotHeight = 25;
    const stackSpacing = 80;
    const rowSpacing = 30;
    const sectionSpacing = 120;

    let currentY = 50;

    yard.sections.forEach((section, sectionIndex) => {
      const sectionColor = section.color || '#3b82f6';
      let currentX = 50;

      // Sort stacks by stack number for consistent layout
      const sortedStacks = [...section.stacks].sort((a, b) => a.stackNumber - b.stackNumber);

      sortedStacks.forEach((stack, stackIndex) => {
        // Calculate stack position
        const stackX = currentX + (stackIndex * stackSpacing);
        
        // Generate slots for each row and tier in the stack
        for (let row = 0; row < stack.rows; row++) {
          for (let tier = 0; tier < stack.maxTiers; tier++) {
            const slotX = stackX + (row * (slotWidth * 0.7)); // Overlap for angled effect
            const slotY = currentY + (tier * rowSpacing);
            
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

  // Draw the yard view
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
    ctx.fillRect(-2000, -1000, 4000, 2000);

    // Draw section backgrounds
    let currentY = 50;
    const sectionSpacing = 120;
    
    yard.sections.forEach((section, index) => {
      const sectionHeight = Math.max(...section.stacks.map(s => s.maxTiers)) * 30 + 40;
      const sectionWidth = section.stacks.length * 80 + 100;
      
      // Section background
      ctx.fillStyle = section.color + '20' || '#3b82f620';
      ctx.fillRect(30, currentY - 20, sectionWidth, sectionHeight);
      
      // Section border
      ctx.strokeStyle = section.color || '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, currentY - 20, sectionWidth, sectionHeight);
      
      // Section label
      ctx.fillStyle = section.color || '#3b82f6';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(section.name, 40, currentY - 5);
      
      currentY += sectionSpacing;
    });

    // Draw container slots
    containerSlots.forEach(slot => {
      const isSelected = selectedContainer?.id === slot.container?.id;
      const isHovered = hoveredSlot?.id === slot.id;
      
      ctx.save();
      
      // Apply angled transformation for 3D effect
      ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
      ctx.rotate(-Math.PI / 12); // 15-degree angle
      ctx.translate(-slot.width / 2, -slot.height / 2);
      
      if (slot.isOccupied && slot.container) {
        // Draw occupied slot with container color
        ctx.fillStyle = isSelected ? '#f97316' : getContainerColor(slot.container);
        ctx.fillRect(0, 0, slot.width, slot.height);
        
        // Add depth effect
        ctx.fillStyle = isSelected ? '#ea580c' : getContainerColor(slot.container) + 'CC';
        ctx.fillRect(2, -2, slot.width, slot.height);
        
        // Container border
        ctx.strokeStyle = isSelected ? '#c2410c' : '#000000';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(0, 0, slot.width, slot.height);
        
        // Container number (if zoom is sufficient)
        if (viewState.zoom > 1.5) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(8, 10 * viewState.zoom)}px Arial`;
          ctx.textAlign = 'center';
          ctx.fillText(
            slot.container.number.slice(-4),
            slot.width / 2,
            slot.height / 2 + 3
          );
        }
      } else {
        // Draw empty slot
        ctx.fillStyle = isHovered ? '#e5e7eb' : '#f3f4f6';
        ctx.fillRect(0, 0, slot.width, slot.height);
        
        // Empty slot border
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(0, 0, slot.width, slot.height);
        ctx.setLineDash([]);
      }
      
      // Highlight effect for hovered or selected slots
      if (isHovered || isSelected) {
        ctx.strokeStyle = isSelected ? '#f97316' : '#3b82f6';
        ctx.lineWidth = 3;
        ctx.strokeRect(-2, -2, slot.width + 4, slot.height + 4);
      }
      
      ctx.restore();
    });

    // Draw stack labels
    const drawnStacks = new Set<number>();
    containerSlots.forEach(slot => {
      if (!drawnStacks.has(slot.stackNumber)) {
        drawnStacks.add(slot.stackNumber);
        
        // Find the top-left slot of this stack for label positioning
        const stackSlots = containerSlots.filter(s => s.stackNumber === slot.stackNumber);
        const minX = Math.min(...stackSlots.map(s => s.x));
        const minY = Math.min(...stackSlots.map(s => s.y));
        
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${Math.max(12, 14 * viewState.zoom)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(
          `S${slot.stackNumber.toString().padStart(2, '0')}`,
          minX + 30,
          minY - 10
        );
      }
    });

    ctx.restore();
  }, [viewState, containerSlots, selectedContainer, hoveredSlot, yard]);

  // Handle mouse events
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    setMousePosition({ x: e.clientX, y: e.clientY });

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
    let foundSlot: ContainerSlot | null = null;
    for (const slot of containerSlots) {
      // Check if mouse is within slot bounds (considering rotation)
      const centerX = slot.x + slot.width / 2;
      const centerY = slot.y + slot.height / 2;
      
      // Simple bounding box check (could be enhanced for rotated rectangles)
      if (worldX >= slot.x - 10 && worldX <= slot.x + slot.width + 10 &&
          worldY >= slot.y - 10 && worldY <= slot.y + slot.height + 10) {
        foundSlot = slot;
        break;
      }
    }
    
    setHoveredSlot(foundSlot);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.button === 0) { // Left click
      if (hoveredSlot?.container) {
        onContainerSelect(hoveredSlot.container);
      } else {
        onContainerSelect(null);
      }
    } else if (e.button === 1 || e.button === 2) { // Middle or right click for panning
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
      zoom: Math.max(0.3, Math.min(3, prev.zoom * zoomFactor))
    }));
  };

  const handleResetView = () => {
    setViewState({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0
    });
    onContainerSelect(null);
    setHoveredSlot(null);
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
      zoom: Math.max(0.3, prev.zoom * 0.8)
    }));
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
          zoom: 2,
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

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className="relative w-full h-full bg-gray-100 overflow-hidden">
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

      {/* Hover Tooltip */}
      {hoveredSlot && hoveredSlot.container && (
        <div 
          className="absolute pointer-events-none z-50 bg-gray-900 text-white rounded-lg p-3 shadow-xl max-w-xs"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="font-semibold text-sm">{hoveredSlot.container.number}</div>
          <div className="text-xs opacity-90 space-y-1 mt-1">
            <div>Row {hoveredSlot.row} • Tier {hoveredSlot.tier}</div>
            <div>Client: {hoveredSlot.container.client}</div>
            <div>Type: {hoveredSlot.container.type} • {hoveredSlot.container.size}</div>
            <div>Status: {hoveredSlot.container.status.replace('_', ' ')}</div>
            {hoveredSlot.container.damage && hoveredSlot.container.damage.length > 0 && (
              <div className="text-red-300">⚠ Damaged</div>
            )}
          </div>
          
          {/* Status badge */}
          <div className="mt-2">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              hoveredSlot.container.damage && hoveredSlot.container.damage.length > 0
                ? 'bg-red-500 text-white'
                : hoveredSlot.container.status === 'in_depot'
                ? 'bg-blue-500 text-white'
                : hoveredSlot.container.status === 'maintenance'
                ? 'bg-orange-500 text-white'
                : 'bg-green-500 text-white'
            }`}>
              {hoveredSlot.container.damage && hoveredSlot.container.damage.length > 0 
                ? 'Damaged' 
                : hoveredSlot.container.status === 'in_depot'
                ? 'In Depot'
                : hoveredSlot.container.status.replace('_', ' ')
              }
            </span>
          </div>
        </div>
      )}

      {/* Selected Container Info */}
      {selectedContainer && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg font-medium flex items-center space-x-3 max-w-md">
          <span className="text-xl">📍</span>
          <div className="flex-1">
            <div className="font-bold">{selectedContainer.number}</div>
            <div className="text-sm opacity-90">{selectedContainer.location}</div>
          </div>
          <button
            onClick={() => onContainerSelect(null)}
            className="hover:bg-orange-600 rounded p-1 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 rounded-lg p-4 shadow-lg">
        <div className="text-sm font-semibold text-gray-900 mb-3">Legend</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-blue-500 rounded transform -rotate-12"></div>
            <span>In Depot</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-red-500 rounded transform -rotate-12"></div>
            <span>Damaged</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-orange-500 rounded transform -rotate-12"></div>
            <span>Maintenance</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-2 bg-gray-300 border border-gray-400 rounded transform -rotate-12"></div>
            <span>Available</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
          <div>Zoom: {Math.round(viewState.zoom * 100)}%</div>
          <div>Containers: {containers.length}</div>
          <div>Stacks: {yard.sections.reduce((sum, s) => sum + s.stacks.length, 0)}</div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-lg p-3 shadow-lg max-w-xs">
        <div className="text-sm font-semibold text-gray-900 mb-2">Controls</div>
        <div className="text-xs text-gray-600 space-y-1">
          <div>• Click containers to select</div>
          <div>• Right-click + drag to pan</div>
          <div>• Scroll to zoom</div>
          <div>• Hover for details</div>
        </div>
      </div>
    </div>
  );
};