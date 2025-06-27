import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Home, X } from 'lucide-react';
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
  rows: number;
  tiers: number;
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
  
  const [hoveredContainer, setHoveredContainer] = useState<Container | null>(null);
  const [showLocationToast, setShowLocationToast] = useState(false);

  // Define the Tantarelli yard layout with detailed stack specifications
  const stackPositions: StackPosition[] = [
    // Top Section (S1 to S31) - 4 rows each, 5 tiers high
    { stackNumber: 'S1', x: 50, y: 50, width: 80, height: 60, rows: 4, tiers: 5, section: 'top' },
    { stackNumber: 'S3', x: 150, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S5', x: 270, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S7', x: 390, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S9', x: 510, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S11', x: 630, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S13', x: 750, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S15', x: 870, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S17', x: 990, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S19', x: 1110, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S21', x: 1230, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S23', x: 1350, y: 50, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S25', x: 150, y: 130, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S27', x: 270, y: 130, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S29', x: 390, y: 130, width: 100, height: 60, rows: 5, tiers: 5, section: 'top' },
    { stackNumber: 'S31', x: 510, y: 130, width: 140, height: 60, rows: 7, tiers: 5, section: 'top' },

    // Middle Section (S33 to S55) - 4-5 rows each
    { stackNumber: 'S33', x: 200, y: 250, width: 100, height: 60, rows: 5, tiers: 5, section: 'middle' },
    { stackNumber: 'S35', x: 320, y: 250, width: 100, height: 60, rows: 5, tiers: 5, section: 'middle' },
    { stackNumber: 'S37', x: 440, y: 250, width: 100, height: 60, rows: 5, tiers: 5, section: 'middle' },
    { stackNumber: 'S39', x: 560, y: 250, width: 100, height: 60, rows: 5, tiers: 5, section: 'middle' },
    { stackNumber: 'S41', x: 720, y: 250, width: 80, height: 60, rows: 4, tiers: 5, section: 'middle' },
    { stackNumber: 'S43', x: 820, y: 250, width: 80, height: 60, rows: 4, tiers: 5, section: 'middle' },
    { stackNumber: 'S45', x: 920, y: 250, width: 80, height: 60, rows: 4, tiers: 5, section: 'middle' },
    { stackNumber: 'S47', x: 1020, y: 250, width: 80, height: 60, rows: 4, tiers: 5, section: 'middle' },
    { stackNumber: 'S49', x: 1120, y: 250, width: 80, height: 60, rows: 4, tiers: 5, section: 'middle' },
    { stackNumber: 'S51', x: 1220, y: 250, width: 80, height: 60, rows: 4, tiers: 5, section: 'middle' },
    { stackNumber: 'S53', x: 1350, y: 250, width: 80, height: 60, rows: 4, tiers: 5, section: 'middle' },
    { stackNumber: 'S55', x: 1450, y: 250, width: 80, height: 60, rows: 4, tiers: 5, section: 'middle' },

    // Bottom Section (S61 to S103) - Variable rows
    { stackNumber: 'S61', x: 50, y: 370, width: 120, height: 60, rows: 6, tiers: 5, section: 'bottom' },
    { stackNumber: 'S63', x: 190, y: 370, width: 120, height: 60, rows: 6, tiers: 5, section: 'bottom' },
    { stackNumber: 'S65', x: 330, y: 370, width: 120, height: 60, rows: 6, tiers: 5, section: 'bottom' },
    { stackNumber: 'S67', x: 470, y: 370, width: 120, height: 60, rows: 6, tiers: 5, section: 'bottom' },
    { stackNumber: 'S69', x: 610, y: 370, width: 120, height: 60, rows: 6, tiers: 5, section: 'bottom' },
    { stackNumber: 'S71', x: 750, y: 370, width: 120, height: 60, rows: 6, tiers: 5, section: 'bottom' },
    { stackNumber: 'S73', x: 890, y: 370, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S75', x: 990, y: 370, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S77', x: 50, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S79', x: 150, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S81', x: 250, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S83', x: 350, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S85', x: 450, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S87', x: 550, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S89', x: 650, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S91', x: 750, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S93', x: 850, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S95', x: 950, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S97', x: 1050, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S99', x: 1150, y: 450, width: 80, height: 60, rows: 4, tiers: 5, section: 'bottom' },
    { stackNumber: 'S101', x: 1300, y: 450, width: 20, height: 60, rows: 1, tiers: 5, section: 'bottom' },
    { stackNumber: 'S103', x: 1340, y: 450, width: 40, height: 60, rows: 2, tiers: 5, section: 'bottom' }
  ];

  // Calculate responsive font sizes based on zoom level and screen size
  const getResponsiveFontSize = (baseSize: number, minSize: number = 8, maxSize: number = 24): number => {
    const canvas = canvasRef.current;
    if (!canvas) return baseSize;
    
    // Scale based on zoom level
    let fontSize = baseSize * Math.max(0.8, Math.min(2.5, viewState.zoom));
    
    // Scale based on screen resolution
    const dpr = window.devicePixelRatio || 1;
    fontSize *= Math.max(0.8, Math.min(1.5, dpr));
    
    // Ensure minimum and maximum bounds
    return Math.max(minSize, Math.min(maxSize, fontSize));
  };

  // Calculate yard bounds for auto-fit functionality
  const getYardBounds = () => {
    const minX = Math.min(...stackPositions.map(s => s.x));
    const maxX = Math.max(...stackPositions.map(s => s.x + s.width));
    const minY = Math.min(...stackPositions.map(s => s.y));
    const maxY = Math.max(...stackPositions.map(s => s.y + s.height));
    
    return {
      minX: minX - 50,
      maxX: maxX + 50,
      minY: minY - 50,
      maxY: maxY + 50,
      width: (maxX - minX) + 100,
      height: (maxY - minY) + 100
    };
  };

  const calculateDefaultView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { zoom: 1, offsetX: 0, offsetY: 0 };

    const bounds = getYardBounds();
    const padding = 50;
    
    const scaleX = (canvas.width - padding * 2) / bounds.width;
    const scaleY = (canvas.height - padding * 2) / bounds.height;
    const zoom = Math.min(scaleX, scaleY, 1.2);
    
    const centerX = bounds.minX + bounds.width / 2;
    const centerY = bounds.minY + bounds.height / 2;
    const offsetX = -centerX;
    const offsetY = -centerY;
    
    return { zoom, offsetX, offsetY };
  }, []);

  const getStackFromLocation = (location: string): StackPosition | null => {
    const stackMatch = location.match(/Stack (S\d+)/);
    if (stackMatch) {
      return stackPositions.find(s => s.stackNumber === stackMatch[1]) || null;
    }
    return null;
  };

  const getContainerColor = (container: Container): string => {
    const clientColors: { [key: string]: string } = {
      'MAEU': '#1e40af',
      'MSCU': '#dc2626',
      'CMDU': '#059669',
      'SHIP001': '#7c3aed',
      'HLCU': '#ea580c',
      'SNFW': '#0891b2'
    };
    return clientColors[container.clientCode || ''] || '#6b7280';
  };

  const getSectionColor = (section: 'top' | 'middle' | 'bottom'): string => {
    switch (section) {
      case 'top': return '#dbeafe';
      case 'middle': return '#fef3c7';
      case 'bottom': return '#dcfce7';
      default: return '#f3f4f6';
    }
  };

  const drawDetailedStack = (ctx: CanvasRenderingContext2D, stack: StackPosition, isSelected: boolean, isHovered: boolean) => {
    const { x, y, width, height, rows, tiers } = stack;
    
    // Draw ground perimeter with solid lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, 3 / viewState.zoom);
    ctx.strokeRect(x, y, width, height);
    
    // Fill stack base
    ctx.fillStyle = isSelected ? '#3b82f6' : isHovered ? '#6b7280' : '#e5e7eb';
    ctx.fillRect(x, y, width, height);
    
    // Draw row divisions with dashed lines (only at appropriate zoom levels)
    if (viewState.zoom > 1.5) {
      ctx.setLineDash([5 / viewState.zoom, 3 / viewState.zoom]);
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = Math.max(0.5, 1 / viewState.zoom);
      
      // Horizontal row divisions
      for (let row = 1; row < rows; row++) {
        const rowY = y + (height / rows) * row;
        ctx.beginPath();
        ctx.moveTo(x, rowY);
        ctx.lineTo(x + width, rowY);
        ctx.stroke();
      }
      
      // Vertical tier markers (showing height capacity)
      const tierSpacing = width / (tiers + 1);
      for (let tier = 1; tier <= tiers; tier++) {
        const tierX = x + tierSpacing * tier;
        ctx.beginPath();
        ctx.moveTo(tierX, y);
        ctx.lineTo(tierX, y + height);
        ctx.stroke();
      }
      
      ctx.setLineDash([]); // Reset dash pattern
    }
    
    // Draw individual container positions (only at high zoom)
    if (viewState.zoom > 2.5) {
      const slotWidth = (width - 4) / rows;
      const slotHeight = (height - 4) / tiers;
      
      for (let row = 0; row < rows; row++) {
        for (let tier = 0; tier < tiers; tier++) {
          const slotX = x + 2 + (slotWidth * row);
          const slotY = y + 2 + (slotHeight * tier);
          
          // Draw container slot outline
          ctx.strokeStyle = '#d1d5db';
          ctx.lineWidth = Math.max(0.5, 1 / viewState.zoom);
          ctx.strokeRect(slotX, slotY, slotWidth - 1, slotHeight - 1);
          
          // Add position markers (only at very high zoom)
          if (viewState.zoom > 4) {
            ctx.fillStyle = '#9ca3af';
            ctx.font = `${getResponsiveFontSize(6, 4, 10)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(
              `R${row + 1}T${tier + 1}`,
              slotX + slotWidth / 2,
              slotY + slotHeight / 2 + 2
            );
          }
        }
      }
    }
    
    // Draw stack label with responsive sizing
    const labelFontSize = getResponsiveFontSize(14, 10, 20);
    ctx.fillStyle = isSelected ? '#ffffff' : '#000000';
    ctx.font = `bold ${labelFontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // Ensure text doesn't overlap with stack
    const labelY = Math.max(y - 8, y - labelFontSize - 4);
    ctx.fillText(stack.stackNumber, x + width / 2, labelY);
    
    // Draw capacity information (only at medium zoom and above)
    if (viewState.zoom > 1.2) {
      const capacityFontSize = getResponsiveFontSize(10, 6, 14);
      ctx.fillStyle = '#6b7280';
      ctx.font = `${capacityFontSize}px Arial`;
      
      // Position capacity text below stack with proper spacing
      const capacityY = y + height + Math.max(12, capacityFontSize + 4);
      ctx.fillText(
        `${rows}R × ${tiers}T = ${rows * tiers}`,
        x + width / 2,
        capacityY
      );
    }
  };

  const drawYard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (container) {
      // Set canvas size with device pixel ratio for crisp rendering
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

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(viewState.zoom, viewState.zoom);
    ctx.translate(viewState.offsetX, viewState.offsetY);

    // Draw background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-1000, -500, 3000, 1200);

    // Draw section backgrounds (only at lower zoom levels to reduce clutter)
    if (viewState.zoom < 3) {
      const sections = [
        { name: 'Top Section', color: getSectionColor('top'), x: 30, y: 30, width: 1500, height: 180 },
        { name: 'Middle Section', color: getSectionColor('middle'), x: 180, y: 230, width: 1400, height: 100 },
        { name: 'Bottom Section', color: getSectionColor('bottom'), x: 30, y: 350, width: 1400, height: 180 }
      ];

      sections.forEach(section => {
        ctx.fillStyle = section.color;
        ctx.fillRect(section.x, section.y, section.width, section.height);
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = Math.max(1, 2 / viewState.zoom);
        ctx.strokeRect(section.x, section.y, section.width, section.height);
        
        // Section labels (only at appropriate zoom levels)
        if (viewState.zoom > 0.5 && viewState.zoom < 2) {
          const sectionFontSize = getResponsiveFontSize(16, 12, 24);
          ctx.fillStyle = '#374151';
          ctx.font = `bold ${sectionFontSize}px Arial`;
          ctx.textAlign = 'left';
          ctx.fillText(section.name, section.x + 10, section.y + sectionFontSize + 8);
        }
      });
    }

    // Draw detailed stacks
    stackPositions.forEach(stack => {
      const isSelected = selectedContainer && getStackFromLocation(selectedContainer.location)?.stackNumber === stack.stackNumber;
      const isHovered = hoveredContainer && getStackFromLocation(hoveredContainer.location)?.stackNumber === stack.stackNumber;
      
      drawDetailedStack(ctx, stack, !!isSelected, !!isHovered);
    });

    // Draw containers in their specific positions
    containers.forEach(container => {
      const stack = getStackFromLocation(container.location);
      if (!stack) return;

      const isSelected = selectedContainer?.id === container.id;
      const isHovered = hoveredContainer?.id === container.id;
      
      // Parse position from location string (e.g., "Stack S1-Row 1-Tier 1")
      const positionMatch = container.location.match(/Row (\d+)-Tier (\d+)/);
      if (!positionMatch) return;
      
      const row = parseInt(positionMatch[1]) - 1;
      const tier = parseInt(positionMatch[2]) - 1;
      
      // Calculate container position within stack
      const slotWidth = (stack.width - 4) / stack.rows;
      const slotHeight = (stack.height - 4) / stack.tiers;
      const containerX = stack.x + 2 + (slotWidth * row) + 1;
      const containerY = stack.y + 2 + (slotHeight * tier) + 1;
      const containerWidth = slotWidth - 2;
      const containerHeight = slotHeight - 2;

      // Draw container with 2.5D effect
      const color = getContainerColor(container);
      ctx.fillStyle = isSelected ? '#f97316' : color;
      ctx.fillRect(containerX, containerY, containerWidth, containerHeight);
      
      // 2.5D depth effect
      const depthOffset = Math.max(1, 2 / viewState.zoom);
      ctx.fillStyle = isSelected ? '#ea580c' : color + 'CC';
      ctx.fillRect(containerX + depthOffset, containerY - depthOffset, containerWidth, containerHeight);
      
      // Container border
      ctx.strokeStyle = isSelected ? '#c2410c' : '#000000';
      ctx.lineWidth = Math.max(0.5, (isSelected ? 2 : 1) / viewState.zoom);
      ctx.strokeRect(containerX, containerY, containerWidth, containerHeight);

      // Container number (with responsive font sizing)
      if (viewState.zoom > 2) {
        const containerFontSize = getResponsiveFontSize(8, 4, 12);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${containerFontSize}px Arial`;
        ctx.textAlign = 'center';
        
        // Ensure text fits within container
        const maxTextWidth = containerWidth - 4;
        const textMetrics = ctx.measureText(container.number);
        
        if (textMetrics.width <= maxTextWidth) {
          ctx.fillText(
            container.number,
            containerX + containerWidth / 2,
            containerY + containerHeight / 2 + containerFontSize / 3
          );
        }
      }
    });

    // Draw ground reference lines (only at appropriate zoom levels)
    if (viewState.zoom > 0.8 && viewState.zoom < 2.5) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = Math.max(1, 2 / viewState.zoom);
      ctx.setLineDash([15 / viewState.zoom, 5 / viewState.zoom]);
      
      // Main ground reference lines
      stackPositions.forEach(stack => {
        // Ground line at base of each stack
        ctx.beginPath();
        ctx.moveTo(stack.x - 10, stack.y + stack.height);
        ctx.lineTo(stack.x + stack.width + 10, stack.y + stack.height);
        ctx.stroke();
      });
      
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [viewState, containers, selectedContainer, hoveredContainer]);

  const animateToTarget = useCallback(() => {
    if (!viewState.isAnimating) return;

    const { targetZoom, targetOffsetX, targetOffsetY } = viewState;
    if (targetZoom === undefined || targetOffsetX === undefined || targetOffsetY === undefined) return;

    const speed = 0.12;
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

  useEffect(() => {
    if (selectedContainer) {
      const stack = getStackFromLocation(selectedContainer.location);
      if (stack) {
        const targetZoom = 4.5;
        const targetOffsetX = -stack.x - stack.width / 2;
        const targetOffsetY = -stack.y - stack.height / 2;

        setViewState(prev => ({
          ...prev,
          targetZoom,
          targetOffsetX,
          targetOffsetY,
          isAnimating: true
        }));

        setShowLocationToast(true);
      }
    }
  }, [selectedContainer]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const worldX = (x - canvas.width / 2) / viewState.zoom - viewState.offsetX;
    const worldY = (y - canvas.height / 2) / viewState.zoom - viewState.offsetY;

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
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const worldX = (x - canvas.width / 2) / viewState.zoom - viewState.offsetX;
    const worldY = (y - canvas.height / 2) / viewState.zoom - viewState.offsetY;

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

  const handleResetView = () => {
    setShowLocationToast(false);
    onContainerSelect(null);
    
    const defaultView = calculateDefaultView();
    setViewState(prev => ({
      ...prev,
      targetZoom: defaultView.zoom,
      targetOffsetX: defaultView.offsetX,
      targetOffsetY: defaultView.offsetY,
      isAnimating: true
    }));
  };

  useEffect(() => {
    const initializeView = () => {
      const defaultView = calculateDefaultView();
      setViewState({
        zoom: defaultView.zoom,
        offsetX: defaultView.offsetX,
        offsetY: defaultView.offsetY,
        isAnimating: false
      });
    };

    const timer = setTimeout(initializeView, 100);
    return () => clearTimeout(timer);
  }, [calculateDefaultView]);

  useEffect(() => {
    const handleResize = () => {
      if (!selectedContainer) {
        const defaultView = calculateDefaultView();
        setViewState(prev => ({
          ...prev,
          zoom: defaultView.zoom,
          offsetX: defaultView.offsetX,
          offsetY: defaultView.offsetY
        }));
      }
      drawYard();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateDefaultView, selectedContainer, drawYard]);

  return (
    <div className="relative w-full h-full bg-gray-900">
      <div
        ref={containerRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
      >
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="w-full h-full cursor-crosshair"
        />
      </div>

      {/* Home Button - Clean Design */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleResetView}
          className="p-3 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors group"
          title="Reset to Full Yard View"
        >
          <Home className="h-5 w-5 group-hover:text-blue-600 transition-colors" />
        </button>
      </div>

      {/* Hover Tooltip - Improved Positioning */}
      {hoveredContainer && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-90 text-white rounded-lg p-3 text-sm shadow-lg max-w-xs">
          <div className="font-semibold">{hoveredContainer.number}</div>
          <div className="text-xs opacity-90 space-y-1">
            <div>Client: {hoveredContainer.client}</div>
            <div>Type: {hoveredContainer.type} • {hoveredContainer.size}</div>
            <div>Location: {hoveredContainer.location}</div>
          </div>
        </div>
      )}

      {/* Location Toast - Enhanced Design */}
      {showLocationToast && selectedContainer && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg font-medium flex items-center space-x-3 max-w-md">
          <span className="text-xl">📍</span>
          <span className="truncate">{selectedContainer.number} - {selectedContainer.location}</span>
          <button
            onClick={() => setShowLocationToast(false)}
            className="ml-2 hover:bg-orange-600 rounded p-1 transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Minimal Status Display - No Legends */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 rounded-lg p-3 text-xs shadow-lg">
        <div className="font-semibold mb-1 text-gray-900">{yard.name}</div>
        <div className="space-y-1 text-gray-600">
          <div>Zoom: {Math.round(viewState.zoom * 100)}%</div>
          <div>Containers: {containers.length}</div>
          {selectedContainer && (
            <div className="text-orange-600 font-medium">
              📍 {selectedContainer.number}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};