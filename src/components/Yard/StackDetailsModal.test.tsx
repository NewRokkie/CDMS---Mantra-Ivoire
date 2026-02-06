import React from 'react';
import { StackDetailsModal } from './StackDetailsModal';
import { YardStack } from '../../types/yard';
import { Container } from '../../types';

// Données de test pour le stack
const mockStack: YardStack = {
  id: 'stack-s07',
  yardId: 'yard-tantarelli',
  stackNumber: 7,
  sectionId: 'section-a',
  sectionName: 'Zone A',
  rows: 6,
  maxTiers: 4,
  rowTierConfig: [
    { row: 1, maxTiers: 4 },
    { row: 2, maxTiers: 4 },
    { row: 3, maxTiers: 3 },
    { row: 4, maxTiers: 3 },
    { row: 5, maxTiers: 2 },
    { row: 6, maxTiers: 2 }
  ],
  currentOccupancy: 18,
  capacity: 22,
  containerSize: '20ft',
  position: { x: 100, y: 200, z: 0 },
  dimensions: { width: 2.5, length: 12 },
  containerPositions: [],
  isOddStack: true,
  isSpecialStack: false,
  isVirtual: false,
  isActive: true,
  assignedClientCode: 'MAERSK',
  notes: 'Stack principal pour containers 20ft de Maersk. Accès facile pour les opérations de chargement.',
  createdAt: new Date('2024-01-15T10:30:00Z'),
  updatedAt: new Date('2024-12-15T14:20:00Z'),
  createdBy: 'admin',
  updatedBy: 'operator-1',
  isBufferZone: false,
  bufferZoneType: undefined,
  damageTypesSupported: []
};

// Données de test pour les containers
const mockContainers: Container[] = [
  {
    id: 'container-1',
    number: 'MAEU1234567',
    type: 'dry',
    size: '20ft',
    status: 'in_depot',
    fullEmpty: 'FULL',
    location: 'S07-R01-T01',
    yardId: 'yard-tantarelli',
    gateInDate: new Date('2024-12-10T08:30:00Z'),
    createdAt: new Date('2024-12-10T08:30:00Z'),
    updatedAt: new Date('2024-12-10T08:30:00Z'),
    createdBy: 'gate-operator',
    clientName: 'Maersk Line',
    clientId: 'client-maersk',
    clientCode: 'MAERSK',
    classification: 'alimentaire',
    damage: [],
    priority: 'medium',
    bookingReference: 'BK-2024-001',
    sealNumber: 'SL123456',
    weight: 18500,
    contents: 'Electronics',
    origin: 'Hamburg',
    destination: 'New York',
    customsStatus: 'cleared'
  },
  {
    id: 'container-2',
    number: 'MAEU2345678',
    type: 'high_cube',
    size: '20ft',
    status: 'in_depot',
    fullEmpty: 'EMPTY',
    location: 'S07-R01-T02',
    yardId: 'yard-tantarelli',
    gateInDate: new Date('2024-12-08T14:15:00Z'),
    createdAt: new Date('2024-12-08T14:15:00Z'),
    updatedAt: new Date('2024-12-08T14:15:00Z'),
    createdBy: 'gate-operator',
    clientName: 'Maersk Line',
    clientId: 'client-maersk',
    clientCode: 'MAERSK',
    classification: 'divers',
    damage: [],
    priority: 'low',
    bookingReference: 'BK-2024-002',
    weight: 2300,
    contents: 'Empty container',
    origin: 'Rotterdam',
    destination: 'Le Havre',
    customsStatus: 'cleared'
  },
  {
    id: 'container-3',
    number: 'HAPAG3456789',
    type: 'dry',
    size: '20ft',
    status: 'maintenance',
    fullEmpty: 'EMPTY',
    location: 'S07-R02-T01',
    yardId: 'yard-tantarelli',
    gateInDate: new Date('2024-12-05T09:45:00Z'),
    createdAt: new Date('2024-12-05T09:45:00Z'),
    updatedAt: new Date('2024-12-12T16:30:00Z'),
    createdBy: 'gate-operator',
    updatedBy: 'maintenance-tech',
    clientName: 'Hapag-Lloyd',
    clientId: 'client-hapag',
    clientCode: 'HAPAG',
    classification: 'divers',
    damage: ['Dent on left side panel', 'Scratches on door'],
    priority: 'high',
    bookingReference: 'BK-2024-003',
    weight: 2100,
    contents: 'Empty container - maintenance required',
    origin: 'Antwerp',
    destination: 'Southampton',
    customsStatus: 'pending'
  },
  {
    id: 'container-4',
    number: 'CMA4567890',
    type: 'reefer',
    size: '20ft',
    status: 'in_depot',
    fullEmpty: 'FULL',
    location: 'S07-R02-T02',
    yardId: 'yard-tantarelli',
    gateInDate: new Date('2024-12-12T11:20:00Z'),
    createdAt: new Date('2024-12-12T11:20:00Z'),
    updatedAt: new Date('2024-12-12T11:20:00Z'),
    createdBy: 'gate-operator',
    clientName: 'CMA CGM',
    clientId: 'client-cma',
    clientCode: 'CMA',
    classification: 'alimentaire',
    damage: [],
    priority: 'urgent',
    bookingReference: 'BK-2024-004',
    weight: 22000,
    contents: 'Frozen goods',
    origin: 'Marseille',
    destination: 'Barcelona',
    customsStatus: 'cleared',
    temperature: -18,
    temperatureSetting: -18
  },
  {
    id: 'container-5',
    number: 'MSC5678901',
    type: 'dry',
    size: '20ft',
    status: 'cleaning',
    fullEmpty: 'EMPTY',
    location: 'S07-R03-T01',
    yardId: 'yard-tantarelli',
    gateInDate: new Date('2024-12-09T16:10:00Z'),
    createdAt: new Date('2024-12-09T16:10:00Z'),
    updatedAt: new Date('2024-12-13T10:15:00Z'),
    createdBy: 'gate-operator',
    updatedBy: 'cleaning-crew',
    clientName: 'MSC Mediterranean',
    clientId: 'client-msc',
    clientCode: 'MSC',
    classification: 'divers',
    damage: [],
    priority: 'medium',
    bookingReference: 'BK-2024-005',
    weight: 2200,
    contents: 'Empty container - cleaning in progress',
    origin: 'Genoa',
    destination: 'Valencia',
    customsStatus: 'cleared'
  }
];

// Composant de test
export const StackDetailsModalTest: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test du composant StackDetailsModal - Version Simplifiée</h1>
      <p className="text-gray-600 mb-6">
        Version épurée focalisée sur les containers avec les informations essentielles.
      </p>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Fonctionnalités conservées :</h3>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Progress bar pour l'utilisation de l'espace</li>
          <li>• Occupation et emplacements libres</li>
          <li>• Séjour moyen des containers</li>
          <li>• Configuration par rangée (si disponible)</li>
          <li>• Liste détaillée des containers</li>
        </ul>
      </div>
      
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
      >
        Ouvrir Stack S07 Details (Simplifié)
      </button>

      {isOpen && (
        <StackDetailsModal
          stack={mockStack}
          stackViz={null}
          containers={mockContainers}
          onClose={() => setIsOpen(false)}
          onSelectContainer={(container) => {
            console.log('Container sélectionné:', container);
            alert(`Container sélectionné: ${container.number}`);
          }}
        />
      )}
    </div>
  );
};

export default StackDetailsModalTest;