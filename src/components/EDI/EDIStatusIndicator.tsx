/**
 * Indicateur de statut EDI pour le header
 */

import React, { useState, useEffect } from 'react';
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../UI';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { ediManagementService } from '../../services/edi/ediManagement';

export const EDIStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    checkEDIStatus();
    
    // Vérifier le statut toutes les 30 secondes
    const interval = setInterval(checkEDIStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkEDIStatus = async () => {
    try {
      const systemStatus = await ediManagementService.getSystemStatus();
      setStatus(systemStatus.apiHealthy ? 'connected' : 'disconnected');
      setLastCheck(new Date());
    } catch {
      setStatus('disconnected');
      setLastCheck(new Date());
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'connected':
        return <Wifi className="h-3 w-3" />;
      case 'disconnected':
        return <WifiOff className="h-3 w-3" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'checking':
        return 'bg-gray-100 text-gray-600';
      case 'connected':
        return 'bg-green-100 text-green-700';
      case 'disconnected':
        return 'bg-red-100 text-red-700';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'checking':
        return 'Checking...';
      case 'connected':
        return 'EDI Online';
      case 'disconnected':
        return 'EDI Offline';
    }
  };

  const getTooltipContent = () => {
    const baseContent = `EDI CODECO API Status: ${getStatusText()}`;
    if (lastCheck) {
      return `${baseContent}\nLast checked: ${lastCheck.toLocaleTimeString()}`;
    }
    return baseContent;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className="cursor-pointer"
            onClick={checkEDIStatus}
          >
            <Badge 
              className={`${getStatusColor()} flex items-center space-x-1 text-xs`}
            >
              {getStatusIcon()}
              <span>{getStatusText()}</span>
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="whitespace-pre-line">{getTooltipContent()}</p>
          <p className="text-xs text-gray-500 mt-1">Click to refresh</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};