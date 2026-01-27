import React, { useState } from 'react';
import { BarChart3, TrendingUp, ZoomIn, ZoomOut, Eye, EyeOff } from 'lucide-react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
}

interface InteractivePieChartProps {
  data: ChartData[];
  title: string;
  subtitle?: string;
  size?: 'small' | 'medium' | 'large';
  showLegend?: boolean;
  onSegmentClick?: (data: ChartData) => void;
}

interface InteractiveBarChartProps {
  data: ChartData[];
  title: string;
  subtitle?: string;
  orientation?: 'horizontal' | 'vertical';
  showValues?: boolean;
  onBarClick?: (data: ChartData) => void;
}

interface InteractiveLineChartProps {
  data: Array<{ label: string; value: number; date?: Date }>;
  title: string;
  subtitle?: string;
  showPoints?: boolean;
  onPointClick?: (data: any) => void;
}

export const InteractivePieChart: React.FC<InteractivePieChartProps> = ({
  data,
  title,
  subtitle,
  size = 'medium',
  showLegend = true,
  onSegmentClick
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [hiddenSegments, setHiddenSegments] = useState<Set<number>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(1);

  const sizeConfig = {
    small: { width: 120, height: 120, strokeWidth: 6 },
    medium: { width: 160, height: 160, strokeWidth: 8 },
    large: { width: 200, height: 200, strokeWidth: 10 }
  };

  const config = sizeConfig[size];
  const radius = (config.width / 2) - (config.strokeWidth / 2);
  const circumference = 2 * Math.PI * radius;

  // Filter out hidden segments
  const visibleData = data.filter((_, index) => !hiddenSegments.has(index));
  const total = visibleData.reduce((sum, item) => sum + item.value, 0);

  // Calculate segments
  let currentAngle = 0;
  const segments = visibleData.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentAngle * (circumference / 100);
    
    currentAngle += percentage;
    
    return {
      ...item,
      percentage,
      strokeDasharray,
      strokeDashoffset,
      originalIndex: data.findIndex(d => d === item)
    };
  });

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  const toggleSegment = (index: number) => {
    const newHidden = new Set(hiddenSegments);
    if (newHidden.has(index)) {
      newHidden.delete(index);
    } else {
      newHidden.add(index);
    }
    setHiddenSegments(newHidden);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2))}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.8))}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-8">
        {/* Chart */}
        <div className="relative" style={{ transform: `scale(${zoomLevel})` }}>
          <svg width={config.width} height={config.height} className="transform -rotate-90">
            {segments.map((segment, segmentIndex) => (
              <circle
                key={segment.originalIndex}
                cx={config.width / 2}
                cy={config.height / 2}
                r={radius}
                fill="none"
                stroke={segment.color || colors[segmentIndex % colors.length]}
                strokeWidth={config.strokeWidth}
                strokeDasharray={segment.strokeDasharray}
                strokeDashoffset={segment.strokeDashoffset}
                className={`transition-all duration-300 cursor-pointer ${
                  hoveredSegment === segment.originalIndex ? 'opacity-80 stroke-width-12' : ''
                }`}
                onMouseEnter={() => setHoveredSegment(segment.originalIndex)}
                onMouseLeave={() => setHoveredSegment(null)}
                onClick={() => onSegmentClick?.(segment)}
              />
            ))}
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </div>

          {/* Hover tooltip */}
          {hoveredSegment !== null && (
            <div className="absolute top-0 left-full ml-4 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap z-10">
              {data[hoveredSegment]?.label}: {data[hoveredSegment]?.value.toLocaleString()}
              <div className="text-xs opacity-75">
                {((data[hoveredSegment]?.value / total) * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="space-y-2 max-w-xs">
            {data.map((item, index) => {
              const isHidden = hiddenSegments.has(index);
              const percentage = total > 0 ? ((item.value / total) * 100) : 0;
              
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all ${
                    isHidden ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleSegment(index)}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color || colors[index % colors.length] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 truncate">{item.label}</div>
                      <div className="text-xs text-gray-600">
                        {item.value.toLocaleString()} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export const InteractiveBarChart: React.FC<InteractiveBarChartProps> = ({
  data,
  title,
  subtitle,
  orientation = 'vertical',
  showValues = true,
  onBarClick
}) => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hiddenBars, setHiddenBars] = useState<Set<number>>(new Set());

  const visibleData = data.filter((_, index) => !hiddenBars.has(index));
  const maxValue = Math.max(...visibleData.map(item => item.value));

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  const toggleBar = (index: number) => {
    const newHidden = new Set(hiddenBars);
    if (newHidden.has(index)) {
      newHidden.delete(index);
    } else {
      newHidden.add(index);
    }
    setHiddenBars(newHidden);
  };

  if (orientation === 'horizontal') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>

        <div className="space-y-4">
          {data.map((item, index) => {
            const isHidden = hiddenBars.has(index);
            const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            const color = item.color || colors[index % colors.length];
            
            return (
              <div key={index} className={`space-y-2 ${isHidden ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleBar(index)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <span className="text-sm font-medium text-gray-900">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900">{item.value.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                {!isHidden && (
                  <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all duration-500 ease-out cursor-pointer relative"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color
                      }}
                      onMouseEnter={() => setHoveredBar(index)}
                      onMouseLeave={() => setHoveredBar(null)}
                      onClick={() => onBarClick?.(item)}
                    >
                      {hoveredBar === index && (
                        <div className="absolute inset-0 bg-white bg-opacity-20 rounded-full" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical bar chart
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        <BarChart3 className="h-5 w-5 text-gray-400" />
      </div>

      <div className="h-64 flex items-end justify-between space-x-2 px-4">
        {data.map((item, index) => {
          const isHidden = hiddenBars.has(index);
          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const color = item.color || colors[index % colors.length];
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center space-y-2">
              {showValues && !isHidden && (
                <div className="text-xs text-gray-600 font-medium">
                  {item.value.toLocaleString()}
                </div>
              )}
              <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                {!isHidden && (
                  <div
                    className="w-full rounded-t transition-all duration-500 hover:opacity-80 cursor-pointer relative"
                    style={{
                      height: `${height}%`,
                      backgroundColor: color,
                      minHeight: '8px'
                    }}
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                    onClick={() => onBarClick?.(item)}
                  >
                    {hoveredBar === index && (
                      <div className="absolute inset-0 bg-white bg-opacity-20 rounded-t" />
                    )}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 text-center max-w-16 truncate">
                  {item.label}
                </div>
                <button
                  onClick={() => toggleBar(index)}
                  className="mt-1 p-1 text-gray-400 hover:text-gray-600"
                >
                  {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const InteractiveLineChart: React.FC<InteractiveLineChartProps> = ({
  data,
  title,
  subtitle,
  showPoints = true,
  onPointClick
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const range = maxValue - minValue;

  // Generate SVG path
  const width = 400;
  const height = 200;
  const padding = 40;

  const points = data.map((item, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((item.value - minValue) / range) * (height - 2 * padding);
    return { x, y, ...item, index };
  });

  const pathData = points.map((point, index) => 
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2))}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.8))}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="relative overflow-hidden" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
        <svg width={width} height={height} className="w-full">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />
          
          {/* Area under curve */}
          <path
            d={`${pathData} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`}
            fill="url(#gradient)"
            opacity="0.1"
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
            </linearGradient>
          </defs>
          
          {/* Points */}
          {showPoints && points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={hoveredPoint === index ? 6 : 4}
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-200 drop-shadow-sm"
              onMouseEnter={() => setHoveredPoint(index)}
              onMouseLeave={() => setHoveredPoint(null)}
              onClick={() => onPointClick?.(point)}
            />
          ))}
          
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const value = minValue + (range * ratio);
            const y = height - padding - (ratio * (height - 2 * padding));
            return (
              <text
                key={index}
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {value.toFixed(0)}
              </text>
            );
          })}
          
          {/* X-axis labels */}
          {points.map((point, index) => (
            <text
              key={index}
              x={point.x}
              y={height - padding + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {point.label}
            </text>
          ))}
        </svg>
        
        {/* Hover tooltip */}
        {hoveredPoint !== null && (
          <div 
            className="absolute bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap z-10 pointer-events-none"
            style={{
              left: points[hoveredPoint].x - 50,
              top: points[hoveredPoint].y - 50
            }}
          >
            <div className="font-medium">{points[hoveredPoint].label}</div>
            <div className="text-xs opacity-75">Value: {points[hoveredPoint].value.toLocaleString()}</div>
            {points[hoveredPoint].date && (
              <div className="text-xs opacity-75">
                {points[hoveredPoint].date?.toLocaleDateString()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};