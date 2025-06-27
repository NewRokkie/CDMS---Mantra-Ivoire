import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Package, AlertTriangle, Eye, Settings } from 'lucide-react';
import { Yard, YardSection, YardStack, YardPosition } from '../../types';

interface YardGridViewProps {
  yard: Yard;
  selectedSection: YardSection | null;
  selectedStack: YardStack | null;
  positions: YardPosition[];
  onSectionSelect: (section: YardSection | null) => void;
  onStackSelect: (stack: YardStack | null) => void;
  clientFilter?: string | null;
}

interface ViewState {
  zoom: number;
  panX: number;
  panY: number;
  rotation: number;
}

export const YardGridView: React.FC<YardGridViewProps> = ({
  yard,
  selectedSection,
  selectedStack,
  positions,
  onSectionSelect,
  onStackSelect,
  clientFilter
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    panX: 0,
    panY: 0,
    rotation: 0
  });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showOccupancy, setShowOccupancy] = useState(true);

  // Calculate yard bounds
  const yardBounds = {
    minX: Math.min(...yard.sections.map(s => s.position.x)),
    maxX: Math.max(...yard.sections.map(s => s.position.x + s.dimensions.width)),
    minY: Math.min(...yard.sections.map(s => s.position.y)),
    maxY: Math.max(...yard.sections.map(s => s.position.y + s.dimensions.length)),
  };

  const yardWidth = yardBounds.maxX - yardBounds.minX;
  const yardHeight = yardBounds.maxY - yardBounds.minY;

  useEffect(() => {
    drawYard();
  }, [yard, selectedSection, selectedStack, viewState, showGrid, showLabels, showOccupancy, clientFilter]);

  const drawYard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const container = containerRef.current;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context
    ctx.save();

    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(viewState.zoom, viewState.zoom);
    ctx.rotate(viewState.rotation);
    ctx.translate(viewState.panX, viewState.panY);

    // Center the yard
    ctx.translate(-yardWidth / 2, -yardHeight / 2);

    // Draw background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(yardBounds.minX - 50, yardBounds.minY - 50, yardWidth + 100, yardHeight + 100);

    // Draw grid if enabled
    if (showGrid) {
      drawGridLines(ctx);
    }

    // Draw sections
    yard.sections.forEach(section => {
      drawSection(ctx, section);
    });

    // Draw stacks
    yard.sections.forEach(section => {
      section.stacks.forEach(stack => {
        drawStack(ctx, stack, section);
      });
    });

    // Draw containers if positions are available
    positions.filter(pos => pos.isOccupied).forEach(position => {
      drawContainer(ctx, position);
    });

    // Restore context
    ctx.restore();
  };

  const drawGridLines = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    const gridSize = 20; // 20m grid
    const startX = Math.floor(yardBounds.minX / gridSize) * gridSize;
    const endX = Math.ceil(yardBounds.maxX / gridSize) * gridSize;
    const startY = Math.floor(yardBounds.minY / gridSize) * gridSize;
    const endY = Math.ceil(yardBounds.maxY / gridSize) * gridSize;

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, yardBounds.minY - 50);
      ctx.lineTo(x, yardBounds.maxY + 50);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(yardBounds.minX - 50, y);
      ctx.lineTo(yardBounds.maxX + 50, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  };

  const drawSection = (ctx: CanvasRenderingContext2D, section: YardSection) => {
    const isSelected = selectedSection?.id === section.id;
    
    // Section background
    ctx.fillStyle = section.color ? `${section.color}20` : '#e5e7eb20';
    ctx.fillRect(section.position.x, section.position.y, section.dimensions.width, section.dimensions.length);

    // Section border
    ctx.strokeStyle = section.color || '#6b7280';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash(isSelected ? [] : [5, 5]);
    ctx.strokeRect(section.position.x, section.position.y, section.dimensions.width, section.dimensions.length);
    ctx.setLineDash([]);

    // Section label
    if (showLabels) {
      ctx.fillStyle = section.color || '#374151';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        section.name,
        section.position.x + section.dimensions.width / 2,
        section.position.y + 20
      );
    }
  };

  const drawStack = (ctx: CanvasRenderingContext2D, stack: YardStack, section: YardSection) => {
    const isSelected = selectedStack?.id === stack.id;
    const stackX = section.position.x + stack.position.x - section.position.x;
    const stackY = section.position.y + stack.position.y - section.position.y;

    // Calculate occupancy
    const occupancy = clientFilter 
      ? stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
      : stack.currentOccupancy;
    const occupancyRate = occupancy / stack.capacity;

    // Stack color based on occupancy
    let stackColor = '#9ca3af'; // Gray for empty
    if (occupancyRate > 0) {
      if (occupancyRate >= 0.9) stackColor = '#ef4444'; // Red for high occupancy
      else if (occupancyRate >= 0.7) stackColor = '#f59e0b'; // Yellow for medium occupancy
      else stackColor = '#10b981'; // Green for low occupancy
    }

    // Special colors for Tantarelli layout
    if (yard.layout === 'tantarelli') {
      if (stack.stackNumber === 1) stackColor = '#8b5cf6'; // Purple for entry
      else if (stack.stackNumber === 31) stackColor = '#f59e0b'; // Orange for end
      else if (stack.stackNumber >= 61 && stack.stackNumber <= 71) stackColor = '#06b6d4'; // Cyan for high capacity
      else if (stack.stackNumber === 101 || stack.stackNumber === 103) stackColor = '#ec4899'; // Pink for special
    }

    if (isSelected) stackColor = '#3b82f6'; // Blue for selected

    // Draw stack base
    ctx.fillStyle = stackColor;
    ctx.fillRect(stackX, stackY, stack.dimensions.width, stack.dimensions.length);

    // Draw stack border
    ctx.strokeStyle = isSelected ? '#1d4ed8' : '#374151';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(stackX, stackY, stack.dimensions.width, stack.dimensions.length);

    // Draw occupancy visualization
    if (showOccupancy && occupancy > 0) {
      const occupancyHeight = (stack.dimensions.length * occupancyRate);
      ctx.fillStyle = `${stackColor}80`;
      ctx.fillRect(stackX, stackY + stack.dimensions.length - occupancyHeight, stack.dimensions.width, occupancyHeight);
    }

    // Draw stack number label
    if (showLabels) {
      ctx.fillStyle = isSelected ? '#ffffff' : '#000000';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        stack.stackNumber.toString().padStart(2, '0'),
        stackX + stack.dimensions.width / 2,
        stackY + stack.dimensions.length / 2 + 3
      );

      // Draw occupancy text
      ctx.font = '8px Arial';
      ctx.fillText(
        `${occupancy}/${stack.capacity}`,
        stackX + stack.dimensions.width / 2,
        stackY + stack.dimensions.length / 2 + 12
      );

      // Special stack indicators for Tantarelli
      if (yard.layout === 'tantarelli') {
        ctx.font = '6px Arial';
        let indicator = '';
        if (stack.stackNumber === 1) indicator = 'ENTRY';
        else if (stack.stackNumber === 31) indicator = 'END';
        else if (stack.stackNumber >= 61 && stack.stackNumber <= 71) indicator = 'HIGH';
        else if (stack.stackNumber === 101) indicator = 'SINGLE';
        else if (stack.stackNumber === 103) indicator = 'DOUBLE';
        else indicator = `${stack.rows}R`;

        if (indicator) {
          ctx.fillText(indicator, stackX + stack.dimensions.width / 2, stackY + stack.dimensions.length - 2);
        }
      }
    }
  };

  const drawContainer = (ctx: CanvasRenderingContext2D, position: YardPosition) => {
    const isClientContainer = !clientFilter || position.clientCode === clientFilter;
    
    // Container dimensions based on size
    let containerWidth = 6; // 20ft default
    if (position.containerSize === '40ft') containerWidth = 12;
    else if (position.containerSize === '45ft') containerWidth = 13.7;

    const containerHeight = 2.4;

    // Container color based on client
    const getClientColor = (clientCode?: string) => {
      const clientColors: { [key: string]: string } = {
        'MAEU': '#1e40af', // Maersk blue
        'MSCU': '#dc2626', // MSC red
        'CMDU': '#059669', // CMA CGM green
        'SHIP001': '#7c3aed', // Shipping Solutions purple
        'HLCU': '#ea580c', // Hapag-Lloyd orange
        'COSCO': '#be123c' // COSCO red
      };
      return clientColors[clientCode || ''] || '#6b7280';
    };

    const color = isClientContainer 
      ? getClientColor(position.clientCode)
      : '#9ca3af';

    // Draw container
    ctx.fillStyle = isClientContainer ? color : `${color}40`;
    ctx.fillRect(position.position.x, position.position.y, containerWidth, containerHeight);

    if (isClientContainer) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(position.position.x, position.position.y, containerWidth, containerHeight);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    setViewState(prev => ({
      ...prev,
      panX: prev.panX + deltaX / prev.zoom,
      panY: prev.panY + deltaY / prev.zoom
    }));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.1, Math.min(5, prev.zoom * zoomFactor))
    }));
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Transform click coordinates to world coordinates
    const worldX = (x - canvas.width / 2) / viewState.zoom - viewState.panX + yardWidth / 2;
    const worldY = (y - canvas.height / 2) / viewState.zoom - viewState.panY + yardHeight / 2;

    // Check for stack clicks
    let clickedStack: YardStack | null = null;
    let clickedSection: YardSection | null = null;

    for (const section of yard.sections) {
      // Check if click is in section
      if (worldX >= section.position.x && worldX <= section.position.x + section.dimensions.width &&
          worldY >= section.position.y && worldY <= section.position.y + section.dimensions.length) {
        clickedSection = section;

        // Check for stack clicks within section
        for (const stack of section.stacks) {
          const stackX = section.position.x + stack.position.x - section.position.x;
          const stackY = section.position.y + stack.position.y - section.position.y;

          if (worldX >= stackX && worldX <= stackX + stack.dimensions.width &&
              worldY >= stackY && worldY <= stackY + stack.dimensions.length) {
            clickedStack = stack;
            break;
          }
        }
        break;
      }
    }

    if (clickedStack) {
      onStackSelect(selectedStack?.id === clickedStack.id ? null : clickedStack);
    } else if (clickedSection) {
      onSectionSelect(selectedSection?.id === clickedSection.id ? null : clickedSection);
    } else {
      onSectionSelect(null);
      onStackSelect(null);
    }
  };

  const handleZoomIn = () => {
    setViewState(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }));
  };

  const handleZoomOut = () => {
    setViewState(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }));
  };

  const handleResetView = () => {
    setViewState({ zoom: 1, panX: 0, panY: 0, rotation: 0 });
  };

  const handleFitToView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const padding = 50;
    const scaleX = (canvas.width - padding * 2) / yardWidth;
    const scaleY = (canvas.height - padding * 2) / yardHeight;
    const scale = Math.min(scaleX, scaleY, 2); // Max zoom of 2x

    setViewState({
      zoom: scale,
      panX: 0,
      panY: 0,
      rotation: 0
    });
  };

  return (
    <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-full"
        />
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col space-y-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 transition-colors"
          title="Reset View"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={handleFitToView}
          className="p-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 transition-colors"
          title="Fit to View"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      {/* View Options */}
      <div className="absolute top-4 left-4 bg-white border border-gray-300 rounded shadow p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">View Options</h4>
        <div className="space-y-2">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="mr-2 h-3 w-3"
            />
            Show Grid
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="mr-2 h-3 w-3"
            />
            Show Labels
          </label>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={showOccupancy}
              onChange={(e) => setShowOccupancy(e.target.checked)}
              className="mr-2 h-3 w-3"
            />
            Show Occupancy
          </label>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg p-3 text-xs shadow-lg">
        <div className="font-semibold mb-2 text-gray-900">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Low Occupancy (&lt;70%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Medium Occupancy (70-90%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>High Occupancy (&gt;90%)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Selected Stack</span>
          </div>
          {yard.layout === 'tantarelli' && (
            <>
              <div className="border-t border-gray-200 pt-1 mt-1">
                <div className="font-medium text-gray-700 mb-1">Special Stacks:</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span>Entry (01)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>End (31)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                  <span>High Cap (61-71)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-pink-500 rounded"></div>
                  <span>Special (101, 103)</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 rounded-lg p-3 text-xs shadow-lg">
        <div className="font-semibold mb-1 text-gray-900">Controls</div>
        <div className="space-y-1">
          <div>• <strong>Pan:</strong> Click and drag</div>
          <div>• <strong>Zoom:</strong> Mouse wheel</div>
          <div>• <strong>Select:</strong> Click sections/stacks</div>
          {clientFilter && (
            <div className="text-blue-600 font-medium mt-1">
              • Viewing your containers only
            </div>
          )}
        </div>
      </div>

      {/* Zoom Level Indicator */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded px-3 py-1 text-sm">
        Zoom: {Math.round(viewState.zoom * 100)}%
      </div>
    </div>
  );
};