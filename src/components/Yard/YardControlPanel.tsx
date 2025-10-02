import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, Package, MapPin, Maximize2 } from 'lucide-react';
import { Container } from '../../types';

interface YardControlPanelProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  showLegend: boolean;
  onToggleLegend: () => void;
  selectedContainer: Container | null;
  totalContainers: number;
}

export const YardControlPanel: React.FC<YardControlPanelProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetView,
  showLegend,
  onToggleLegend,
  selectedContainer,
  totalContainers
}) => {
  return (
    <div className="flex items-center justify-between">
      {/* Left Side - Container Info */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Package className="h-4 w-4" />
          <span>{totalContainers} containers visible</span>
        </div>
        
        {selectedContainer && (
          <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {selectedContainer.number} selected
            </span>
          </div>
        )}
      </div>

      {/* Right Side - Controls */}
      <div className="flex items-center space-x-3">
        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={onZoomOut}
            disabled={zoomLevel <= 0.5}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="px-3 py-2 text-sm font-medium text-gray-700 min-w-[60px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          
          <button
            onClick={onZoomIn}
            disabled={zoomLevel >= 3}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* View Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onResetView}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reset View"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          
          <button
            onClick={onToggleLegend}
            className={`p-2 rounded-lg transition-colors ${
              showLegend
                ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={showLegend ? 'Hide Legend' : 'Show Legend'}
          >
            {showLegend ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};