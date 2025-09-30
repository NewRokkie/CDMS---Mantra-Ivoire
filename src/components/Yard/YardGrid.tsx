import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Container } from '../../types';
import { Yard } from '../../types/yard';

interface YardGridProps {
  yard: Yard | null;
  containers: Container[];
  selectedContainer: Container | null;
  onContainerSelect: (container: Container | null) => void;
  zoomLevel: number;
  viewMode: 'overview' | 'detailed';
  selectedZone: string;
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
  sectionId: string;
  sectionColor: string;
}

export const YardGrid: React.FC<YardGridProps> = ({
  yard,
  containers,
  selectedContainer,
  onContainerSelect,
  zoomLevel,
  viewMode,
  selectedZone
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSlot, setHoveredSlot] = useState<ContainerSlot | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Generate container slots from yard data
  const generateSlots = useCallback((): ContainerSlot[] => {
    if (!yard) return [];

    const slots: ContainerSlot[] = [];
    const slotWidth = 60;
    const slotHeight = 30;
    const stackSpacing = 80;
    const rowSpacing = 40;
    const tierSpacing = 35;

    yard.sections.forEach((section, sectionIndex) => {
      const sectionColors = ['#3b82f6', '#f59e0b', '#10b981']; // Blue, Orange, Green
      const sectionColor = sectionColors[sectionIndex % sectionColors.length];
      
      section.stacks.forEach((stack, stackIndex) => {
        // Calculate base position for this stack
        const baseX = 100 + (stackIndex * stackSpacing) + (sectionIndex * 400);
        const baseY = 100 + (sectionIndex * 200);

        // Generate slots for each position in the stack
        for (let row = 1; row <= stack.rows; row++) {
          for (let tier = 1; tier <= stack.maxTiers; tier++) {
            const slotX = baseX + ((row - 1) * rowSpacing);
            const slotY = baseY - ((tier - 1) * tierSpacing);

            // Find container at this position
            const container = containers.find(c => {
              const locationMatch = c.location.match(/Stack S(\d+)-Row (\d+)-Tier (\d+)/);
              if (locationMatch) {
                const [, stackNum, rowNum, tierNum] = locationMatch;
                return parseInt(stackNum) === stack.stackNumber && 
                       parseInt(rowNum) === row && 
                       parseInt(tierNum) === tier;
              }
              return false;
            });

            slots.push({
              id: `${stack.id}-${row}-${tier}`,
              stackNumber: stack.stackNumber,
              row,
              tier,
              x: slotX,
              y: slotY,
              width: slotWidth,
              height: slotHeight,
              container: container || null,
              sectionId: section.id,
              sectionColor
            });
          }
        }
      });
    });

    return slots;
  }, [yard, containers]);

  const slots = generateSlots();

  // Draw the yard on canvas
  const drawYard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Apply zoom and pan
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);

    // Draw section backgrounds
    if (yard) {
      yard.sections.forEach((section, index) => {
        const sectionColors = ['rgba(59, 130, 246, 0.1)', 'rgba(245, 158, 11, 0.1)', 'rgba(16, 185, 129, 0.1)'];
        ctx.fillStyle = sectionColors[index % sectionColors.length];
        
        // Calculate section bounds
        const sectionSlots = slots.filter(slot => slot.sectionId === section.id);
        if (sectionSlots.length > 0) {
          const minX = Math.min(...sectionSlots.map(s => s.x)) - 20;
          const maxX = Math.max(...sectionSlots.map(s => s.x + s.width)) + 20;
          const minY = Math.min(...sectionSlots.map(s => s.y)) - 20;
          const maxY = Math.max(...sectionSlots.map(s => s.y + s.height)) + 20;
          
          ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
          
          // Draw section label
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 14px Inter';
          ctx.fillText(section.name, minX + 10, minY + 25);
        }
      });
    }

    // Draw container slots
    slots.forEach(slot => {
      // Skip if zone filter is active and slot doesn't match
      if (selectedZone !== 'all') {
        const stackNumber = slot.stackNumber;
        const inZone = 
          (selectedZone === 'top' && stackNumber <= 31) ||
          (selectedZone === 'center' && stackNumber > 31 && stackNumber <= 55) ||
          (selectedZone === 'bottom' && stackNumber > 55);
        
        if (!inZone) return;
      }

      ctx.save();
      
      // Rotate for angled appearance (15 degrees)
      ctx.translate(slot.x + slot.width / 2, slot.y + slot.height / 2);
      ctx.rotate(15 * Math.PI / 180);
      ctx.translate(-slot.width / 2, -slot.height / 2);

      // Determine slot color
      let fillColor = '#e5e7eb'; // Default gray for empty
      let strokeColor = '#d1d5db';
      let strokeWidth = 1;

      if (slot.container) {
        // Color based on container status
        switch (slot.container.status) {
          case 'in_depot':
            fillColor = '#3b82f6'; // Blue
            break;
          case 'maintenance':
            fillColor = '#f59e0b'; // Orange
            break;
          case 'cleaning':
            fillColor = '#8b5cf6'; // Purple
            break;
          default:
            fillColor = '#6b7280'; // Gray
        }

        // Red for damaged containers
        if (slot.container.damage && slot.container.damage.length > 0) {
          fillColor = '#ef4444'; // Red
        }

        // Highlight selected container
        if (selectedContainer && slot.container.id === selectedContainer.id) {
          strokeColor = '#fbbf24'; // Yellow
          strokeWidth = 3;
        }

        // Highlight hovered container
        if (hoveredSlot && slot.id === hoveredSlot.id) {
          strokeColor = '#ffffff';
          strokeWidth = 2;
        }
      }

      // Draw slot
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.fillRect(0, 0, slot.width, slot.height);
      ctx.strokeRect(0, 0, slot.width, slot.height);

      // Draw container number if occupied
      if (slot.container && zoomLevel > 0.8) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(8, 10 * zoomLevel)}px Inter`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const text = slot.container.number.slice(-4);
        ctx.fillText(text, slot.width / 2, slot.height / 2);
      }

      // Draw stack number label
      if (slot.row === 1 && slot.tier === 1 && zoomLevel > 0.6) {
        ctx.fillStyle = '#374151';
        ctx.font = `bold ${Math.max(10, 12 * zoomLevel)}px Inter`;
        ctx.textAlign = 'center';
        ctx.fillText(`S${slot.stackNumber.toString().padStart(2, '0')}`, slot.width / 2, -10);
      }

      ctx.restore();
    });

    ctx.restore();
  }, [slots, selectedContainer, hoveredSlot, zoomLevel, panOffset, selectedZone, yard]);

  // Handle mouse events
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x: e.clientX, y: e.clientY });

    if (isPanning) {
      const deltaX = x - lastPanPoint.x;
      const deltaY = y - lastPanPoint.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPanPoint({ x, y });
      return;
    }

    // Check for hovered slot
    const adjustedX = (x - panOffset.x) / zoomLevel;
    const adjustedY = (y - panOffset.y) / zoomLevel;

    const hoveredSlot = slots.find(slot => {
      // Account for rotation when checking bounds
      const centerX = slot.x + slot.width / 2;
      const centerY = slot.y + slot.height / 2;
      const dx = adjustedX - centerX;
      const dy = adjustedY - centerY;
      
      // Simple bounding box check (could be improved for exact rotated rectangle)
      return Math.abs(dx) < slot.width / 2 + 10 && Math.abs(dy) < slot.height / 2 + 10;
    });

    setHoveredSlot(hoveredSlot || null);
  }, [slots, zoomLevel, panOffset, isPanning, lastPanPoint]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) { // Right click for panning
      e.preventDefault();
      setIsPanning(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setLastPanPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || isPanning) return; // Only handle left clicks

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked slot
    const adjustedX = (x - panOffset.x) / zoomLevel;
    const adjustedY = (y - panOffset.y) / zoomLevel;

    const clickedSlot = slots.find(slot => {
      const centerX = slot.x + slot.width / 2;
      const centerY = slot.y + slot.height / 2;
      const dx = adjustedX - centerX;
      const dy = adjustedY - centerY;
      
      return Math.abs(dx) < slot.width / 2 + 10 && Math.abs(dy) < slot.height / 2 + 10;
    });

    if (clickedSlot?.container) {
      onContainerSelect(clickedSlot.container);
    } else {
      onContainerSelect(null);
    }
  }, [slots, zoomLevel, panOffset, isPanning, onContainerSelect]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(3, zoomLevel + delta));
    
    // Zoom towards mouse position
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = newZoom / zoomLevel;
      setPanOffset(prev => ({
        x: mouseX - (mouseX - prev.x) * zoomFactor,
        y: mouseY - (mouseY - prev.y) * zoomFactor
      }));
    }
  }, [zoomLevel]);

  // Redraw when dependencies change
  useEffect(() => {
    drawYard();
  }, [drawYard]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      drawYard();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawYard]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      />

      {/* Hover Tooltip */}
      {hoveredSlot?.container && (
        <div
          className="absolute z-20 bg-gray-900 text-white text-xs rounded-lg p-3 pointer-events-none shadow-lg"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: 'translate(0, -100%)'
          }}
        >
          <div className="font-bold">{hoveredSlot.container.number}</div>
          <div className="text-gray-300">
            {hoveredSlot.container.client} • {hoveredSlot.container.type} • {hoveredSlot.container.size}
          </div>
          <div className="text-gray-400">
            Stack S{hoveredSlot.stackNumber.toString().padStart(2, '0')} • Row {hoveredSlot.row} • Tier {hoveredSlot.tier}
          </div>
          <div className={`mt-1 px-2 py-1 rounded text-xs font-medium ${
            hoveredSlot.container.status === 'in_depot' ? 'bg-green-600' :
            hoveredSlot.container.status === 'maintenance' ? 'bg-orange-600' :
            hoveredSlot.container.status === 'cleaning' ? 'bg-purple-600' :
            'bg-gray-600'
          }`}>
            {hoveredSlot.container.status.replace('_', ' ').toUpperCase()}
          </div>
          {hoveredSlot.container.damage && hoveredSlot.container.damage.length > 0 && (
            <div className="mt-1 px-2 py-1 bg-red-600 rounded text-xs font-medium">
              DAMAGED
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs text-gray-600">
        <div>Left click: Select container</div>
        <div>Right click + drag: Pan view</div>
        <div>Scroll: Zoom in/out</div>
      </div>
    </div>
  );
};