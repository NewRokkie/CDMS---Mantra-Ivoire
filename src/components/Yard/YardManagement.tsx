import React, { useState, useEffect } from 'react';
import { useYard } from '../../hooks/useYard';
import { containerService, stackService } from '../../services/api';
import { realtimeService } from '../../services/api/realtimeService';
import { yardsService } from '../../services/api/yardsService';
import { YardLiveMap } from './YardLiveMap';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { Container } from '../../types';

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

        console.log(`✅ Loaded ${stacks.length} stacks and ${containers.length} containers`);
      } catch (error) {
        console.error('Error loading yard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentYard?.id]);

  useEffect(() => {
    if (!currentYard) return;

    console.log(`🔌 Setting up real-time subscriptions for yard: ${currentYard.id}`);

    const unsubscribeStacks = realtimeService.subscribeToStacks(
      currentYard.id,
      async (payload) => {
        console.log(`📡 Stack ${payload.eventType}:`, payload.new);

        const stacks = await stackService.getByYardId(currentYard.id);
        await yardsService.refreshYardData(currentYard.id);
      }
    );

    const unsubscribeContainers = realtimeService.subscribeToContainers(
      async (payload) => {
        console.log(`📡 Container ${payload.eventType}:`, payload.new);

        const containers = await containerService.getAll();
        setAllContainers(containers);
      }
    );

    return () => {
      unsubscribeStacks();
      unsubscribeContainers();
      console.log(`🔌 Cleaned up real-time subscriptions for yard: ${currentYard.id}`);
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
