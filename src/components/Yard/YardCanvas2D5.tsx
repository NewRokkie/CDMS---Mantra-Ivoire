import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Home, Search } from 'lucide-react';
import { Yard, Container } from '../../types';

interface YardCanvas2D5Props {
  yard: Yard;
  containers: Container[];
  selectedContainer: Container | null;
  onContainerSelect: (container: Container | null) => void;
}

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  targetZoom?: number;
  targetOffsetX?: number;
  targetOffsetY?: number;
  isAnimating: boolean;
}

interface StackPosition {
  stackNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
  section: 'top' | 'middle' | 'bottom';
}

export const YardCanvas2D5: React.FC<YardCanvas2D5Props> = ({
  yard,
  containers,
  selectedContainer,
  onContainerSelect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isAnimating: false
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [hoveredContainer, setHoveredContainer] = useState<Container | null>(null);

  // Define the Tantarelli yard layout based on the hand-drawn sketch
  const stackPositions: StackPosition[] = [
    // Top Section (S1 to S31)
    { stackNumber: 'S1', x: 50, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S3', x: 130, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S5', x: 210, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S7', x: 290, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S9', x: 370, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S11', x: 450, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S13', x: 530, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S15', x: 610, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S17', x: 690, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S19', x: 770, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S21', x: 850, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S23', x: 930, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S25', x: 1010, y: 50, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S27', x: 1090, y: 110, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S29', x: 1170, y: 110, width: 60, height: 40, section: 'top' },
    { stackNumber: 'S31', x: 1250, y: 110, width: 60, height: 40, section: 'top' },

    // Middle Section (S33 to S55)
    { stackNumber: 'S33', x: 150, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S35', x: 230, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S37', x: 310, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S39', x: 390, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S41', x: 520, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S43', x: 600, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S45', x: 680, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S47', x: 760, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S49', x: 840, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S51', x: 920, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S53', x: 1050, y: 200, width: 60, height: 40, section: 'middle' },
    { stackNumber: 'S55', x: 1130, y: 200, width: 60, height: 40, section: 'middle' },

    // Bottom Section (S61 to S103)
    { stackNumber: 'S61', x: 50, y: 320, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S63', x: 130, y: 320, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S65', x: 210, y: 320, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S67', x: 290, y: 320, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S69', x: 370, y: 320, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S71', x: 450, y: 320, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S73', x: 530, y: 320, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S75', x: 610, y: 320, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S77', x: 50, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S79', x: 130, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S81', x: 210, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S83', x: 290, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S85', x: 370, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S87', x: 450, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S89', x: 530, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S91', x: 610, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S93', x: 690, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S95', x: 770, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S97', x: 850, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S99', x: 930, y: 380, width: 60, height: 40, section: 'bottom' },
    { stackNumber: 'S101', x: 1050, y: 380, width: 30, height: 40, section: 'bottom' },
    { stackNumber: 'S103', x: 1100, y: 380, width: 40, height: 40, section: 'bottom' }
  ];

  const getStackFromLocation = (location: string): StackPosition | null => {
    const stackMatch = location.match(/Stack (S\d+)/);
    if (stackMatch) {
      return stackPositions.find(s => s.stackNumber === stackMatch[1]) || null;
    }
    return null;
  };

  const getContainerColor = (container: Container): string => {
    const clientColors: { [key: string]: string } = {
      'MAEU': '#1e40af', // Maersk blue
      'MSCU': '#dc2626', // MSC red
      'CMDU': '#059669', // CMA CGM green
      'SHIP001': '#7c3aed', // Shipping Solutions purple
      'HLCU': '#ea580c', // Hapag-Lloyd orange
      'SNFW': '#0891b2' // Shipping Network cyan
    };
    return clientColors[container.clientCode || ''] || '#6b7280';
  };

  const getSectionColor = (section: 'top' | 'middle' | 'bottom'): string => {
    switch (section) {
      case 'top': return '#dbeafe'; // Light blue
      case 'middle': return '#fef3c7'; // Light yellow
      case 'bottom': return '#dcfce7'; // Light green
      default: return '#f3f4f6';
    }
  };

  const drawYard = useCallback(() => {
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
    ctx.translate(viewState.offsetX, viewState.offsetY);

    // Draw background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-1000, -500, 2500, 1000);

    // Draw section backgrounds
    const sections = [
      { name: 'Top Section', color: getSectionColor('top'), x: 30, y: 30, width: 1300, height: 140 },
      { name: 'Middle Section', color: getSectionColor('middle'), x: 130, y: 180, width: 1100, height: 80 },
      { name: 'Bottom Section', color: getSectionColor('bottom'), x: 30, y: 300, width: 1200, height: 160 }
    ];

    sections.forEach(section => {
      ctx.fillStyle = section.color;
      ctx.fillRect(section.x, section.y, section.width, section.height);
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.strokeRect(section.x, section.y, section.width, section.height);

      // Section labels
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(section.name, section.x + section.width / 2, section.y + 20);
    });

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    for (let x = 0; x <= 1400; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 500);
      ctx.stroke();
    }
    for (let y = 0; y <= 500; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1400, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw stacks
    stackPositions.forEach(stack => {
      const isSelected = selectedContainer && getStackFromLocation(selectedContainer.location)?.stackNumber === stack.stackNumber;
      const isHovered = hoveredContainer && getStackFromLocation(hoveredContainer.location)?.stackNumber === stack.stackNumber;
      
      // Stack base with 2.5D effect
      ctx.fillStyle = isSelected ? '#3b82f6' : isHovered ? '#6b7280' : '#d1d5db';
      ctx.fillRect(stack.x, stack.y, stack.width, stack.height);
      
      // 2.5D depth effect
      ctx.fillStyle = isSelected ? '#1e40af' : isHovered ? '#4b5563' : '#9ca3af';
      ctx.fillRect(stack.x + 3, stack.y - 3, stack.width, stack.height);
      
      // Stack border
      ctx.strokeStyle = isSelected ? '#1d4ed8' : '#6b7280';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeRect(stack.x, stack.y, stack.width, stack.height);
      
      // Stack number
      ctx.fillStyle = isSelected ? '#ffffff' : '#374151';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(stack.stackNumber, stack.x + stack.width / 2, stack.y + stack.height / 2 + 4);
    });

    // Draw containers
    containers.forEach(container => {
      const stack = getStackFromLocation(container.location);
      if (!stack) return;

      const isSelected = selectedContainer?.id === container.id;
      const isHovered = hoveredContainer?.id === container.id;
      
      // Container position within stack (simplified)
      const containerX = stack.x + 5;
      const containerY = stack.y + 5;
      const containerWidth = stack.width - 10;
      const containerHeight = 8;

      // Container with 2.5D effect
      const color = getContainerColor(container);
      ctx.fillStyle = isSelected ? '#fbbf24' : color;
      ctx.fillRect(containerX, containerY, containerWidth, containerHeight);
      
      // 2.5D depth
      ctx.fillStyle = isSelected ? '#f59e0b' : color + 'CC';
      ctx.fillRect(containerX + 2, containerY - 2, containerWidth, containerHeight);
      
      // Container border
      ctx.strokeStyle = isSelected ? '#d97706' : '#000000';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(containerX, containerY, containerWidth, containerHeight);

      // Container number (if selected or hovered)
      if (isSelected || isHovered) {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(container.number, containerX + containerWidth / 2, containerY + containerHeight + 15);
      }
    });

    // Draw roads and pathways
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    
    // Main horizontal roads
    ctx.beginPath();
    ctx.moveTo(0, 175);
    ctx.lineTo(1400, 175);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, 285);
    ctx.lineTo(1400, 285);
    ctx.stroke();
    
    // Vertical access roads
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(25, 500);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(1375, 0);
    ctx.lineTo(1375, 500);
    ctx.stroke();
    
    ctx.setLineDash([]);

    // Restore context
    ctx.restore();
  }, [viewState, containers, selectedContainer, hoveredContainer]);

  const animateToTarget = useCallback(() => {
    if (!viewState.isAnimating) return;

    const { targetZoom, targetOffsetX, targetOffsetY } = viewState;
    if (targetZoom === undefined || targetOffsetX === undefined || targetOffsetY === undefined) return;

    const speed = 0.1;
    const zoomDiff = targetZoom - viewState.zoom;
    const xDiff = targetOffsetX - viewState.offsetX;
    const yDiff = targetOffsetY - viewState.offsetY;

    if (Math.abs(zoomDiff) < 0.01 && Math.abs(xDiff) < 1 && Math.abs(yDiff) < 1) {
      setViewState(prev => ({
        ...prev,
        zoom: targetZoom,
        offsetX: targetOffsetX,
        offsetY: targetOffsetY,
        isAnimating: false,
        targetZoom: undefined,
        targetOffsetX: undefined,
        targetOffsetY: undefined
      }));
      return;
    }

    setViewState(prev => ({
      ...prev,
      zoom: prev.zoom + zoomDiff * speed,
      offsetX: prev.offsetX + xDiff * speed,
      offsetY: prev.offsetY + yDiff * speed
    }));

    animationRef.current = requestAnimationFrame(animateToTarget);
  }, [viewState]);

  useEffect(() => {
    if (viewState.isAnimating) {
      animationRef.current = requestAnimationFrame(animateToTarget);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [viewState.isAnimating, animateToTarget]);

  useEffect(() => {
    drawYard();
  }, [drawYard]);

  // Auto-zoom to selected container
  useEffect(() => {
    if (selectedContainer) {
      const stack = getStackFromLocation(selectedContainer.location);
      if (stack) {
        const targetZoom = 3;
        const targetOffsetX = -stack.x - stack.width / 2;
        const targetOffsetY = -stack.y - stack.height / 2;

        setViewState(prev => ({
          ...prev,
          targetZoom,
          targetOffsetX,
          targetOffsetY,
          isAnimating: true
        }));
      }
    }
  }, [selectedContainer]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;

      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX / prev.zoom,
        offsetY: prev.offsetY + deltaY / prev.zoom,
        isAnimating: false
      }));

      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else {
      // Check for container hover
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Transform to world coordinates
      const worldX = (x - canvas.width / 2) / viewState.zoom - viewState.offsetX;
      const worldY = (y - canvas.height / 2) / viewState.zoom - viewState.offsetY;

      // Find hovered container
      let foundContainer: Container | null = null;
      for (const container of containers) {
        const stack = getStackFromLocation(container.location);
        if (stack && worldX >= stack.x && worldX <= stack.x + stack.width &&
            worldY >= stack.y && worldY <= stack.y + stack.height) {
          foundContainer = container;
          break;
        }
      }
      setHoveredContainer(foundContainer);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Transform to world coordinates
    const worldX = (x - canvas.width / 2) / viewState.zoom - viewState.offsetX;
    const worldY = (y - canvas.height / 2) / viewState.zoom - viewState.offsetY;

    // Find clicked container
    for (const container of containers) {
      const stack = getStackFromLocation(container.location);
      if (stack && worldX >= stack.x && worldX <= stack.x + stack.width &&
          worldY >= stack.y && worldY <= stack.y + stack.height) {
        onContainerSelect(container);
        return;
      }
    }
    
    onContainerSelect(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.3, Math.min(5, prev.zoom * zoomFactor)),
      isAnimating: false
    }));
  };

  const handleZoomIn = () => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.min(5, prev.zoom * 1.2),
      isAnimating: false
    }));
  };

  const handleZoomOut = () => {
    setViewState(prev => ({
      ...prev,
      zoom: Math.max(0.3, prev.zoom / 1.2),
      isAnimating: false
    }));
  };

  const handleResetView = () => {
    setViewState({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      isAnimating: false
    });
  };

  const handleFitToView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const yardWidth = 1400;
    const yardHeight = 500;
    const padding = 50;
    
    const scaleX = (canvas.width - padding * 2) / yardWidth;
    const scaleY = (canvas.height - padding * 2) / yardHeight;
    const scale = Math.min(scaleX, scaleY, 2);

    setViewState({
      zoom: scale,
      offsetX: -yardWidth / 2,
      offsetY: -yardHeight / 2,
      isAnimating: false
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Tantarelli Yard - 2.5D View
          </h3>
          <p className="text-sm text-gray-600">
            Real-time container visualization with automatic zoom to location
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Zoom: {Math.round(viewState.zoom * 100)}%
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="w-full h-96 cursor-move overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            onClick={handleClick}
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
            <Home className="h-4 w-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-95 rounded-lg p-3 text-xs shadow-lg">
          <div className="font-semibold mb-2 text-gray-900">Legend</div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span>Maersk (MAEU)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              <span>MSC (MSCU)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-600 rounded"></div>
              <span>CMA CGM (CMDU)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-600 rounded"></div>
              <span>Shipping Solutions</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-600 rounded"></div>
              <span>Hapag-Lloyd (HLCU)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Selected Container</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 rounded-lg p-3 text-xs shadow-lg">
          <div className="font-semibold mb-1 text-gray-900">Controls</div>
          <div className="space-y-1">
            <div>• <strong>Pan:</strong> Click and drag</div>
            <div>• <strong>Zoom:</strong> Mouse wheel</div>
            <div>• <strong>Select:</strong> Click containers</div>
            <div>• <strong>Search:</strong> Auto-zoom to container</div>
          </div>
        </div>

        {/* Container Info Tooltip */}
        {hoveredContainer && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-90 text-white rounded-lg p-3 text-sm shadow-lg">
            <div className="font-semibold">{hoveredContainer.number}</div>
            <div className="text-xs opacity-90">
              <div>Client: {hoveredContainer.client}</div>
              <div>Type: {hoveredContainer.type} • {hoveredContainer.size}</div>
              <div>Location: {hoveredContainer.location}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};