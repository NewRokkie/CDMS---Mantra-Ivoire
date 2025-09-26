# 🚀 CDMS - Configuration Base de Données PostgreSQL

Guide complet pour connecter votre application CDMS à PostgreSQL.

## 📋 Prérequis

- **PostgreSQL 12+** installé et fonctionnel
- **Node.js 18+** et npm/yarn
- Droits d'administration sur PostgreSQL
- Client PostgreSQL (psql, pgAdmin, ou DBeaver)

## 🔧 Installation de la Base de Données

### 1. Création de la Base de Données

```bash
# Se connecter à PostgreSQL en tant qu'administrateur
psql -U postgres

# Créer la base de données CDMS
CREATE DATABASE cdms_db;

# Créer un utilisateur dédié (optionnel mais recommandé)
CREATE USER cdms_user WITH PASSWORD 'cdms_secure_password';
GRANT ALL PRIVILEGES ON DATABASE cdms_db TO cdms_user;

# Quitter psql
\q
```

### 2. Installation du Schéma

```bash
# Se connecter à la base CDMS
psql -U postgres -d cdms_db

# Exécuter le script d'installation complet
\i database/00_install.sql

# Vérifier l'installation
SELECT 'Installation terminée!' as status;
\q
```

## ⚙️ Configuration de l'Application

### 1. Variables d'Environnement

Copiez `.env.example` vers `.env` et configurez :

```bash
cp .env.example .env
```

Modifiez les paramètres de connexion dans `.env` :

```env
# Configuration PostgreSQL
VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_NAME=cdms_db
VITE_DB_USER=postgres
VITE_DB_PASSWORD=your_password_here

# URL de l'API Backend (voir section Backend)
VITE_API_BASE_URL=http://localhost:3001/api
```

### 2. Installation des Dépendances

```bash
# Installer les nouvelles dépendances PostgreSQL
npm install

# Ou avec yarn
yarn install
```

## 🔌 Architecture de Connexion

L'application utilise une architecture à 3 niveaux :

```
Frontend React ←→ API Backend ←→ PostgreSQL Database
    (Vite)         (Express.js)       (CDMS Schema)
```

### Services Créés

- **`DatabaseService`** : Couche d'abstraction pour PostgreSQL
- **`UserService`** : Gestion des utilisateurs et authentification
- **`ContainerService`** : CRUD des conteneurs
- **`GateOperationsService`** : Opérations Gate In/Out
- **`ReleaseOrderService`** : Booking et ordres de libération
- **Hooks React** : `useContainers`, `useYard`, `useReleaseOrders`, etc.

## 🎯 Comptes de Test Disponibles

Une fois la base installée, utilisez ces comptes :

| Email | Mot de passe | Rôle | Accès |
|-------|-------------|------|-------|
| `admin@depot.com` | `demo123` | Admin | Tous modules, tous yards |
| `supervisor@depot.com` | `demo123` | Superviseur | Tantarelli + Vridi |
| `operator@depot.com` | `demo123` | Opérateur | Tantarelli uniquement |
| `client2@maersk.com` | `demo123` | Client | Tantarelli + San Pedro |

## 🏗️ Structure de la Base de Données

### Schémas Créés
- **`cdms_core`** : Tables principales
- **`cdms_audit`** : Logs et audit
- **`cdms_config`** : Configuration système

### Modules Installés
1. **Foundation** : Utilisateurs, permissions, config
2. **Yard Management** : 3 yards (Tantarelli, Vridi, San Pedro)
3. **Container Management** : Conteneurs et tracking
4. **Client Pools** : 4 clients avec pools configurés
5. **Gate Operations** : Gate In/Out avec transport
6. **Release Orders** : Bookings et libérations

### Données de Test
- **3 yards** opérationnels
- **4 clients** majeurs (Maersk, MSC, CMA CGM, Shipping Solutions)
- **5 conteneurs** d'exemple
- **Transport companies** et véhicules
- **Bookings et release orders** en cours

## 🚨 Développement Sans Backend

Si vous n'avez pas encore de backend API, l'application utilise automatiquement un **MockDatabaseService** qui simule les opérations de base de données en mémoire.

Pour activer le mode mock :
```env
# Dans .env
VITE_API_BASE_URL=
# (laisser vide pour utiliser le service mock)
```

## 🔄 Opérations CRUD Disponibles

### Conteneurs
- ✅ **Create** : `containerService.createContainer()`
- ✅ **Read** : `containerService.getAllContainers()`
- ✅ **Update** : `containerService.updateContainer()`
- ✅ **Delete** : `containerService.deleteContainer()`

### Yards
- ✅ **Create** : `yardService.createYard()`
- ✅ **Read** : `yardService.getAvailableYards()`
- ✅ **Update** : `yardService.updateYard()`
- ✅ **Delete** : `yardService.deleteYard()`

### Client Pools
- ✅ **Create** : `clientPoolService.createClientPool()`
- ✅ **Read** : `clientPoolService.getClientPools()`
- ✅ **Update** : `clientPoolService.updateClientPool()`
- ✅ **Delete** : Désactivation via `isActive: false`

### Gate Operations
- ✅ **Create** : `gateOperationsService.createGateInOperation()`
- ✅ **Read** : `gateOperationsService.getPendingGateInOperations()`
- ✅ **Update** : `gateOperationsService.updateGateInOperationStatus()`
- ✅ **Process** : `gateOperationsService.completeGateInOperation()`

### Release Orders
- ✅ **Create** : `releaseOrderService.createReleaseOrder()`
- ✅ **Read** : `releaseOrderService.getReleaseOrders()`
- ✅ **Update** : `releaseOrderService.updateReleaseOrderStatus()`
- ✅ **Manage** : Container assignments et libérations

## 🧪 Tests de Fonctionnalité

### Test de Connexion
```typescript
import { dbService } from './src/services/database';

// Tester la connexion
const testConnection = async () => {
  const status = await dbService.testConnection();
  console.log('Connexion:', status.isConnected ? '✅' : '❌');
};
```

### Test CRUD Conteneurs
```typescript
import { useContainers } from './src/hooks/useCont
