import React, { useState } from 'react';
import { useYard } from '../../hooks/useYard';
import { YardLiveMap } from './YardLiveMap';
import { Container } from '../../types';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';

const generateMockContainers = (): Container[] => {
  const containers: Container[] = [];
  const containerNumbers = [
    'MSKU1234567', 'TCLU9876543', 'GESU4567891', 'SHIP1112228', 'SHIP3334449',
    'MAEU5556664', 'CMDU7890125', 'HLCU3456789', 'SNFW2940740', 'MAEU7778881',
    'MSCU9990002', 'CMDU1113335', 'SHIP4445556', 'HLCU6667778', 'MSKU8889990',
    'TCLU1112223', 'GESU3334445', 'MAEU5556667', 'CMDU7778889', 'SHIP9990001',
    'HLCU2223334', 'SNFW4445556', 'MSCU6667778', 'MSKU8889991', 'TCLU1112224'
  ];

  const containerTypes: Container['type'][] = ['standard', 'reefer', 'tank', 'flat_rack', 'open_top'];
  const containerSizes: Container['size'][] = ['20ft', '40ft'];
  const containerStatuses: Container['status'][] = ['in_depot', 'maintenance', 'cleaning'];
  const clients = ['Maersk Line', 'MSC Mediterranean Shipping', 'CMA CGM', 'Shipping Solutions Inc', 'Hapag-Lloyd'];
  const clientCodes = ['MAEU', 'MSCU', 'CMDU', 'SHIP001', 'HLCU'];

  const stackNumbers = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91, 93, 95, 97, 99, 101, 103];

  containerNumbers.forEach((number, index) => {
    const stackNumber = stackNumbers[index % stackNumbers.length];
    const row = Math.floor(Math.random() * 4) + 1;
    const tier = Math.floor(Math.random() * 3) + 1;
    const clientIndex = index % clients.length;

    containers.push({
      id: `container-${index + 1}`,
      number: number,
      type: containerTypes[Math.floor(Math.random() * containerTypes.length)],
      size: containerSizes[Math.floor(Math.random() * containerSizes.length)],
      status: containerStatuses[Math.floor(Math.random() * containerStatuses.length)],
      location: `Stack S${stackNumber.toString().padStart(2, '0')}-Row ${row}-Tier ${tier}`,
      gateInDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      client: clients[clientIndex],
      clientCode: clientCodes[clientIndex],
      clientId: `client-${clientIndex + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'System',
      updatedBy: 'System',
      damage: Math.random() > 0.8 ? ['Minor scratches'] : undefined,
      yardPosition: {
        id: `pos-${index + 1}`,
        yardId: 'depot-tantarelli',
        sectionId: stackNumber <= 31 ? 'section-top' : stackNumber <= 55 ? 'section-center' : 'section-bottom',
        stackId: `stack-${stackNumber}`,
        row: row,
        bay: 1,
        tier: tier,
        position: { x: stackNumber * 15, y: row * 10, z: tier * 3 },
        isOccupied: true,
        containerId: `container-${index + 1}`,
        containerNumber: number,
        containerSize: containerSizes[Math.floor(Math.random() * containerSizes.length)],
        clientCode: clientCodes[clientIndex],
        placedAt: new Date()
      }
    });
  });

  return containers;
};

export const YardManagement: React.FC = () => {
  const { currentYard } = useYard();
  const [containers] = useState<Container[]>(generateMockContainers());

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
