/**
 * Exemple d'intégration - Comment utiliser les services de base de données
 * Ce fichier montre comment intégrer les nouveaux hooks dans vos composants
 */

import React, { useState, useEffect } from 'react';
import {
  useAuth,
  useContainers,
  useYard,
  useReleaseOrders,
  useGateOperations,
  useClientPools
} from '../src/hooks';

// Exemple 1: Dashboard avec données en temps réel
const DatabaseConnectedDashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { currentYard, yardStats, availableYards, setCurrentYardById } = useYard();
  const { containers, stats: containerStats, isLoading: containersLoading } = useContainers();
  const { stats: gateStats } = useGateOperations();
  const { stats: releaseStats } = useReleaseOrders();

  if (!isAuthenticated) {
    return <div>Veuillez vous connecter pour accéder au dashboard</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard CDMS - Données en Temps Réel</h1>

      {/* Yard Info */}
      <div className="yard-info">
        <h2>Yard Actuel: {currentYard?.name} ({currentYard?.code})</h2>
        <select onChange={(e) => setCurrentYardById(e.target.value)}>
          {availableYards.map(yard => (
            <option key={yard.id} value={yard.id}>
              {yard.name} - {yard.code}
            </option>
          ))}
        </select>
      </div>

      {/* Real-time Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Conteneurs</h3>
          <p>Total: {containerStats?.totalContainers || 0}</p>
          <p>En dépôt: {containerStats?.containersInDepot || 0}</p>
          <p>Endommagés: {containerStats?.damagedContainers || 0}</p>
        </div>

        <div className="stat-card">
          <h3>Yard Occupancy</h3>
          <p>Capacité: {currentYard?.totalCapacity || 0}</p>
          <p>Occupé: {currentYard?.currentOccupancy || 0}</p>
          <p>Taux: {yardStats?.occupancyRate.toFixed(1)}%</p>
        </div>

        <div className="stat-card">
          <h3>Opérations Gate</h3>
          <p>Gate In en attente: {gateStats?.gateIn.pending || 0}</p>
          <p>Gate Out en attente: {gateStats?.gateOut.pending || 0}</p>
          <p>Traités aujourd'hui: {(gateStats?.gateIn.today || 0) + (gateStats?.gateOut.today || 0)}</p>
        </div>

        <div className="stat-card">
          <h3>Release Orders</h3>
          <p>En attente: {releaseStats?.pendingOrders || 0}</p>
          <p>En cours: {releaseStats?.inProcessOrders || 0}</p>
          <p>Terminés aujourd'hui: {releaseStats?.completedToday || 0}</p>
        </div>
      </div>

      {/* Recent Containers */}
      <div className="recent-containers">
        <h3>Conteneurs Récents</h3>
        {containersLoading ? (
          <p>Chargement...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Client</th>
                <th>Taille</th>
                <th>Status</th>
                <th>Localisation</th>
                <th>Date Entrée</th>
              </tr>
            </thead>
            <tbody>
              {containers.slice(0, 10).map(container => (
                <tr key={container.id}>
                  <td>{container.number}</td>
                  <td>{container.clientCode}</td>
                  <td>{container.size}</td>
                  <td>{container.status}</td>
                  <td>{container.location}</td>
                  <td>{container.gateInDate?.toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Exemple 2: Formulaire Gate In connecté à la base
const DatabaseConnectedGateIn: React.FC = () => {
  const { user } = useAuth();
  const { currentYard, getAvailablePositions } = useYard();
  const { createGateInOperation, validateContainer } = useGateOperations();
  const [formData, setFormData] = useState({
    containerNumber: '',
    containerSize: '20ft' as '20ft' | '40ft',
    containerType: 'dry' as const,
    clientCode: '',
    clientName: '',
    transportCompany: '',
    truckNumber: '',
    driverName: '',
  });
  const [availablePositions, setAvailablePositions] = useState<any[]>([]);
  const [validation, setValidation] = useState<{ isValid: boolean; message?: string } | null>(null);

  // Valider le conteneur quand le numéro change
  useEffect(() => {
    if (formData.containerNumber.length === 11) {
      validateContainer(formData.containerNumber, 'gate_in')
        .then(setValidation)
        .catch(() => setValidation({ isValid: false, message: 'Erreur de validation' }));
    }
  }, [formData.containerNumber, validateContainer]);

  // Charger les positions disponibles quand la taille change
  useEffect(() => {
    if (currentYard) {
      getAvailablePositions(formData.containerSize)
        .then(setAvailablePositions)
        .catch(console.error);
    }
  }, [formData.containerSize, currentYard, getAvailablePositions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!validation?.isValid) {
        alert('Conteneur invalide');
        return;
      }

      const operation = await createGateInOperation({
        ...formData,
        containerQuantity: 1,
        fullEmptyStatus: 'EMPTY',
        isDamaged: false,
        assignedYardId: currentYard?.id,
        truckArrivalDate: new Date().toISOString().split('T')[0],
        truckArrivalTime: new Date().toTimeString().split(' ')[0],
      });

      if (operation) {
        alert(`✅ Opération Gate In créée: ${operation.operation_number}`);
        // Reset form
        setFormData({
          containerNumber: '',
          containerSize: '20ft',
          containerType: 'dry',
          clientCode: '',
          clientName: '',
          transportCompany: '',
          truckNumber: '',
          driverName: '',
        });
      }
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      alert('❌ Erreur lors de la création de l\'opération');
    }
  };

  return (
    <div className="gate-in-form">
      <h2>Gate In - Connecté à PostgreSQL</h2>
      <p>Yard Actuel: {currentYard?.name} ({currentYard?.code})</p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Numéro de Conteneur</label>
          <input
            type="text"
            value={formData.containerNumber}
            onChange={(e) => setFormData({...formData, containerNumber: e.target.value.toUpperCase()})}
            placeholder="MAEU1234567"
            maxLength={11}
            required
          />
          {validation && (
            <div className={`validation ${validation.isValid ? 'valid' : 'invalid'}`}>
              {validation.message}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Taille du Conteneur</label>
          <select
            value={formData.containerSize}
            onChange={(e) => setFormData({...formData, containerSize: e.target.value as '20ft' | '40ft'})}
          >
            <option value="20ft">20 pieds</option>
            <option value="40ft">40 pieds</option>
          </select>
        </div>

        <div className="form-group">
          <label>Code Client</label>
          <input
            type="text"
            value={formData.clientCode}
            onChange={(e) => setFormData({...formData, clientCode: e.target.value.toUpperCase()})}
            placeholder="MAEU"
            required
          />
        </div>

        <div className="form-group">
          <label>Nom du Client</label>
          <input
            type="text"
            value={formData.clientName}
            onChange={(e) => setFormData({...formData, clientName: e.target.value})}
            placeholder="Maersk Line"
            required
          />
        </div>

        <div className="form-group">
          <label>Transporteur</label>
          <input
            type="text"
            value={formData.transportCompany}
            onChange={(e) => setFormData({...formData, transportCompany: e.target.value})}
            placeholder="SIVOM Transport"
            required
          />
        </div>

        <div className="form-group">
          <label>Numéro de Camion</label>
          <input
            type="text"
            value={formData.truckNumber}
            onChange={(e) => setFormData({...formData, truckNumber: e.target.value})}
            placeholder="TRK-001"
            required
          />
        </div>

        <div className="form-group">
          <label>Nom du Chauffeur</label>
          <input
            type="text"
            value={formData.driverName}
            onChange={(e) => setFormData({...formData, driverName: e.target.value})}
            placeholder="Kouamé Yves"
            required
          />
        </div>

        <div className="positions-info">
          <h4>Positions Disponibles ({formData.containerSize})</h4>
          <p>{availablePositions.length} positions libres</p>
        </div>

        <button
          type="submit"
          disabled={!validation?.isValid}
          className="submit-btn"
        >
          Créer Opération Gate In
        </button>
      </form>
    </div>
  );
};

// Exemple 3: Liste de conteneurs avec filtres en temps réel
const DatabaseConnectedContainerList: React.FC = () => {
  const { containers, stats, applyFilters, searchContainers, updateContainerStatus } = useContainers();
  const { availableYards } = useYard();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    status: '',
    size: '',
    yardId: '',
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    searchContainers(term);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    const newFilters = { ...selectedFilters, [filterType]: value };
    setSelectedFilters(newFilters);

    // Apply filters to database query
    applyFilters({
      status: newFilters.status as any,
      size: newFilters.size as any,
      yardId: newFilters.yardId || undefined,
      searchTerm: searchTerm || undefined,
    });
  };

  const handleStatusUpdate = async (containerNumber: string, newStatus: any) => {
    try {
      await updateContainerStatus(containerNumber, newStatus, 'Status update via UI');
      alert('✅ Status mis à jour dans PostgreSQL');
    } catch (error) {
      alert('❌ Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="container-list">
      <h2>Conteneurs - Base de Données PostgreSQL</h2>

      {/* Statistiques en temps réel */}
      <div className="stats">
        <span>Total: {stats?.totalContainers || 0}</span>
        <span>En dépôt: {stats?.containersInDepot || 0}</span>
        <span>20ft: {stats?.containersBySize['20ft'] || 0}</span>
        <span>40ft: {stats?.containersBySize['40ft'] || 0}</span>
        <span>Endommagés: {stats?.damagedContainers || 0}</span>
      </div>

      {/* Recherche et Filtres */}
      <div className="filters">
        <input
          type="text"
          placeholder="Rechercher par numéro ou client..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />

        <select
          value={selectedFilters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">Tous les status</option>
          <option value="in_depot">En dépôt</option>
          <option value="out_depot">Hors dépôt</option>
          <option value="maintenance">Maintenance</option>
        </select>

        <select
          value={selectedFilters.size}
          onChange={(e) => handleFilterChange('size', e.target.value)}
        >
          <option value="">Toutes les tailles</option>
          <option value="20ft">20 pieds</option>
          <option value="40ft">40 pieds</option>
        </select>

        <select
          value={selectedFilters.yardId}
          onChange={(e) => handleFilterChange('yardId', e.target.value)}
        >
          <option value="">Tous les yards</option>
          {availableYards.map(yard => (
            <option key={yard.id} value={yard.id}>
              {yard.name}
            </option>
          ))}
        </select>
      </div>

      {/* Liste des conteneurs */}
      <div className="container-table">
        <table>
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Client</th>
              <th>Taille</th>
              <th>Type</th>
              <th>Status</th>
              <th>Localisation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {containers.map(container => (
              <tr key={container.id}>
                <td>{container.number}</td>
                <td>{container.clientCode}</td>
                <td>{container.size}</td>
                <td>{container.type}</td>
                <td>
                  <select
                    value={container.status}
                    onChange={(e) => handleStatusUpdate(container.number, e.target.value)}
                  >
                    <option value="in_depot">En dépôt</option>
                    <option value="out_depot">Hors dépôt</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="cleaning">Nettoyage</option>
                  </select>
                </td>
                <td>{container.location}</td>
                <td>
                  <button onClick={() => console.log('Edit container:', container.id)}>
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Exemple 4: Client Pool Management
const DatabaseConnectedClientPools: React.FC = () => {
  const { user } = useAuth();
  const { clientPools, stats, utilization, assignStackToClient, removeStackFromClient, getUnassignedStacks } = useClientPools();
  const { currentYard } = useYard();
  const [unassignedStacks, setUnassignedStacks] = useState<any[]>([]);

  useEffect(() => {
    if (currentYard) {
      getUnassignedStacks(currentYard.id)
        .then(setUnassignedStacks)
        .catch(console.error);
    }
  }, [currentYard, getUnassignedStacks]);

  const handleAssignStack = async (stackId: string, stackNumber: number, clientCode: string) => {
    try {
      await assignStackToClient(stackId, stackNumber, clientCode, true, 2);
      alert('✅ Stack assigné avec succès');
    } catch (error) {
      alert('❌ Erreur lors de l\'assignation');
    }
  };

  const handleRemoveStack = async (stackId: string, clientCode: string) => {
    try {
      await removeStackFromClient(stackId, clientCode);
      alert('✅ Stack retiré avec succès');
    } catch (error) {
      alert('❌ Erreur lors du retrait');
    }
  };

  return (
    <div className="client-pools">
      <h2>Gestion des Pools Clients - PostgreSQL</h2>

      {/* Statistiques */}
      <div className="pool-stats">
        <div>Total Pools: {stats?.totalPools || 0}</div>
        <div>Clients Actifs: {stats?.activeClients || 0}</div>
        <div>Stacks Assignés: {stats?.totalAssignedStacks || 0}</div>
        <div>Occupation Moyenne: {stats?.averageOccupancy.toFixed(1)}%</div>
        <div>Stacks Non-Assignés: {stats?.unassignedStacks || 0}</div>
      </div>

      {/* Liste des pools clients */}
      <div className="pools-list">
        <h3>Pools Clients</h3>
        {clientPools.map(pool => (
          <div key={pool.id} className="pool-card">
            <h4>{pool.clientName} ({pool.clientCode})</h4>
            <p>Capacité: {pool.currentOccupancy}/{pool.maxCapacity}</p>
            <p>Priorité: {pool.priority}</p>
            <p>Stacks Assignés: {pool.assignedStacks.length}</p>

            {/* Actions pour administrateur/superviseur */}
            {user && ['admin', 'supervisor'].includes(user.role) && (
              <div className="stack-management">
                <h5>Gestion des Stacks</h5>
                {pool.assignedStacks.map(stackId => (
                  <div key={stackId} className="stack-item">
                    <span>Stack {stackId}</span>
                    <button onClick={() => handleRemoveStack(stackId, pool.clientCode)}>
                      Retirer
                    </button>
                  </div>
                ))}

                <select onChange={(e) => {
                  if (e.target.value) {
                    const [stackId, stackNumber] = e.target.value.split(':');
                    handleAssignStack(stackId, parseInt(stackNumber), pool.clientCode);
                  }
                }}>
                  <option value="">Assigner un stack...</option>
                  {unassignedStacks.map(stack => (
                    <option key={stack.id} value={`${stack.id}:${stack.stackNumber}`}>
                      Stack {stack.stackNumber} (Capacité: {stack.capacity})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Utilisation par client */}
      <div className="utilization">
        <h3>Utilisation par Client</h3>
        {utilization.map(util => (
          <div key={util.clientCode} className={`util-card ${util.status}`}>
            <h4>{util.clientName}</h4>
            <p>Occupation: {util.occupancyRate.toFixed(1)}%</p>
            <p>Stacks: {util.assignedStacks}</p>
            <p>Capacité Disponible: {util.availableCapacity}</p>
            <p>Status: {util.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Exemple 5: Hooks combinés pour opération complexe
const DatabaseConnectedComplexOperation: React.FC = () => {
  const { user } = useAuth();
  const { currentYard } = useYard();
  const { updateContainerStatus } = useContainers();
  const {
    createReleaseOrder,
    autoSelectContainers,
    markContainerReady,
    getReleaseOrderContainers
  } = useReleaseOrders();
  const { createGateOutOperation, completeGateOutOperation } = useGateOperations();

  // Opération complexe: Créer release order + auto-selection + gate out
  const processCompleteRelease = async () => {
    try {
      console.log('🚀 Début de l\'opération complexe...');

      // 1. Créer release order
      const releaseOrder = await createReleaseOrder({
        clientCode: 'MAEU',
        clientName: 'Maersk Line',
        bookingType: 'EXPORT',
        containerQuantities: { size20ft: 2, size40ft: 1 },
        transportCompany: 'SIVOM Transport',
        driverName: 'Kouamé Yves',
        vehicleNumber: 'TRK-001',
        scheduledPickupDate: new Date(),
        yardId: currentYard?.id,
        notes: 'Opération automatisée via interface',
      });

      if (!releaseOrder) {
        throw new Error('Échec de création du release order');
      }

      console.log('✅ 1. Release order créé:', releaseOrder.id);

      // 2. Auto-sélection des conteneurs
      const selection = await autoSelectContainers(
        releaseOrder.id,
        'MAEU',
        { size20ft: 2, size40ft: 1 },
        currentYard?.id
      );

      console.log('✅ 2. Conteneurs auto-sélectionnés:', selection);

      // 3. Marquer les conteneurs comme prêts
      const containers = await getReleaseOrderContainers(releaseOrder.id);
      for (const container of containers) {
        await markContainerReady(releaseOrder.id, container.containerNumber);
      }

      console.log('✅ 3. Conteneurs marqués comme prêts');

      // 4. Créer opérations Gate Out pour chaque conteneur
      for (const container of containers) {
        const gateOutOp = await createGateOutOperation({
          containerNumber: container.containerNumber,
          containerSize: container.containerSize as '20ft' | '40ft',
          clientCode: 'MAEU',
          clientName: 'Maersk Line',
          releaseOrderId: releaseOrder.id,
          transportCompany: 'SIVOM Transport',
          vehicleNumber: 'TRK-001',
          driverName: 'Kouamé Yves',
          currentYardId: currentYard?.id,
          currentLocation: container.currentLocation,
        });

        if (gateOutOp) {
          // 5. Compléter immédiatement l'opération Gate Out
          await completeGateOutOperation(gateOutOp.id, {
            finalWeight: 25000, // 25 tonnes par défaut
            deliveryOrderNumber: `DO-${Date.now()}`,
          });
        }
      }

      console.log('✅ 4. Opérations Gate Out complétées');

      alert('🎉 Opération complexe terminée avec succès!');
    } catch (error) {
      console.error('❌ Erreur dans l\'opération complexe:', error);
      alert('❌ Erreur lors de l\'opération complexe');
    }
  };

  return (
    <div className="complex-operation">
      <h2>Opération Complexe - Démonstration</h2>
      <p>Cette opération va :</p>
      <ol>
        <li>Créer un release order pour Maersk</li>
        <li>Auto-sélectionner 3 conteneurs (2x20ft + 1x40ft)</li>
        <li>Marquer les conteneurs comme prêts</li>
        <li>Créer et compléter les opérations Gate Out</li>
        <li>Mettre à jour tous les statuts en base</li>
      </ol>

      <button
        onClick={processCompleteRelease}
        className="complex-operation-btn"
        disabled={!currentYard}
      >
        🚀 Lancer Opération Complexe
      </button>

      {!currentYard && (
        <p className="warning">⚠️ Sélectionnez d'abord un yard</p>
      )}
    </div>
  );
};

export {
  DatabaseConnectedDashboard,
  DatabaseConnectedGateIn,
  DatabaseConnectedContainerList,
  DatabaseConnectedClientPools,
  DatabaseConnectedComplexOperation,
};
