import React, { useState, useEffect } from 'react';
import { useYard } from '../../hooks/useYard';
import { useLanguage } from '../../hooks/useLanguage';
import { containerService, stackService } from '../../services/api';
import { realtimeService } from '../../services/api/realtimeService';
import { yardsService } from '../../services/api/yardsService';
import { YardLiveMap } from './YardLiveMap';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { Container } from '../../types';
import { handleError } from '../../services/errorHandling';

export const YardManagement: React.FC = () => {
  const { currentYard: contextYard } = useYard();
  const { t } = useLanguage();
  const [allContainers, setAllContainers] = useState<Container[]>([]);
  const [currentYard, setCurrentYard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!contextYard) return;

      try {
        setLoading(true);

        const [containers, stacks, freshYard] = await Promise.all([
          containerService.getAll(),
          stackService.getByYardIdWithStats(contextYard.id, false),
          yardsService.getById(contextYard.id)
        ]);

        setAllContainers(containers);
        setCurrentYard(freshYard);

        await yardsService.refreshYardData(contextYard.id);
        
        // Get the refreshed yard data
        const updatedYard = await yardsService.getById(contextYard.id);
        setCurrentYard(updatedYard);
      } catch (error) {
        handleError(error, 'YardManagement.loadData');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [contextYard?.id]);

  useEffect(() => {
    if (!contextYard) return;

    const unsubscribeStacks = realtimeService.subscribeToStacks(
      contextYard.id,
      async (payload) => {
        const stacks = await stackService.getByYardId(contextYard.id);
        await yardsService.refreshYardData(contextYard.id);
        // Refresh the yard state
        const updatedYard = await yardsService.getById(contextYard.id);
        setCurrentYard(updatedYard);
      }
    );

    const unsubscribeContainers = realtimeService.subscribeToContainers(
      async (payload) => {
        const containers = await containerService.getAll();
        setAllContainers(containers);
      }
    );

    const unsubscribeLocations = realtimeService.subscribeToLocations(
      contextYard.id,
      async (payload) => {
        // Refresh yard data when locations change (occupancy updates)
        await yardsService.refreshYardData(contextYard.id);
        // Refresh the yard state
        const updatedYard = await yardsService.getById(contextYard.id);
        setCurrentYard(updatedYard);
      }
    );

    return () => {
      unsubscribeStacks();
      unsubscribeContainers();
      unsubscribeLocations();
    };
  }, [contextYard?.id]);

  // Filter containers for current yard - be more lenient with yardId matching
  const containers = currentYard
    ? allContainers.filter(c => 
        !c.yardId || // Include containers without yardId
        c.yardId === currentYard.id || 
        c.yardId === '' ||
        c.yardId === currentYard.code // Also try matching by yard code
      )
    : allContainers;

  return (
    <>
      {/* Desktop Only Message for Mobile */}
      <div className="lg:hidden">
        <DesktopOnlyMessage
          moduleName="Yard Management"
          reason="The interactive 3D yard visualization and detailed position management require a larger screen for optimal performance."
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        {loading ? (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">{t('yard.loading')}</p>
            </div>
          </div>
        ) : !currentYard ? (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center p-8 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 font-medium">{t('yard.noYardSelected')}</p>
              <p className="text-yellow-600 text-sm mt-2">{t('yard.selectYardMessage')}</p>
            </div>
          </div>
        ) : (
          <YardLiveMap yard={currentYard} containers={containers} />
        )}
      </div>
    </>
  );
};
