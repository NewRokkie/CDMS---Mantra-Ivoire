import React, { useState, useEffect } from 'react';
import { useYard } from '../../hooks/useYard';
import { containerService, stackService } from '../../services/api';
import { realtimeService } from '../../services/api/realtimeService';
import { yardsService } from '../../services/api/yardsService';
import { YardLiveMap } from './YardLiveMap';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { Container } from '../../types';
import { handleError } from '../../services/errorHandling';

export const YardManagement: React.FC = () => {
  const { currentYard } = useYard();
  const [allContainers, setAllContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!currentYard) return;

      try {
        setLoading(true);

        const [containers, stacks] = await Promise.all([
          containerService.getAll(),
          stackService.getByYardId(currentYard.id)
        ]);

        setAllContainers(containers);

        await yardsService.refreshYardData(currentYard.id);
      } catch (error) {
        handleError(error, 'YardManagement.loadData');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentYard?.id]);

  useEffect(() => {
    if (!currentYard) return;

    const unsubscribeStacks = realtimeService.subscribeToStacks(
      currentYard.id,
      async (payload) => {
        const stacks = await stackService.getByYardId(currentYard.id);
        await yardsService.refreshYardData(currentYard.id);
      }
    );

    const unsubscribeContainers = realtimeService.subscribeToContainers(
      async (payload) => {
        const containers = await containerService.getAll();
        setAllContainers(containers);
      }
    );

    return () => {
      unsubscribeStacks();
      unsubscribeContainers();
    };
  }, [currentYard?.id]);

  // Filter containers for current yard
  const containers = currentYard
    ? allContainers.filter(c => c.yardId === currentYard.id)
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
        <YardLiveMap yard={currentYard} containers={containers} />
      </div>
    </>
  );
};
