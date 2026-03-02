# Fix: Gate Out - Container Not Found Issue

## Problème
Lors du Gate Out, un conteneur physiquement présent dans le yard (par exemple à l'emplacement S04R1H1, 40ft) affiche l'erreur : "Container not found in yard. Please verify the container number is correct and the container is currently in the depot with 'In Depot' status."

## Cause Racine
Le modal `GateOutCompletionModal` utilisait le `useGlobalStore()` pour récupérer la liste des conteneurs. Ce store local n'était pas automatiquement synchronisé avec la base de données, ce qui pouvait entraîner :
- Une liste de conteneurs vide ou obsolète
- Des conteneurs récemment ajoutés non visibles
- Des données non actualisées après des opérations Gate In

## Solution Implémentée

### 1. Chargement Direct depuis la Base de Données
Le modal charge maintenant directement les conteneurs depuis la base de données via `containerService.getAll()` au lieu d'utiliser le store global.

**Fichier modifié:** `src/components/Gates/GateOut/GateOutCompletionModal.tsx`

```typescript
// AVANT (problématique)
const { containers } = useGlobalStore();

// APRÈS (corrigé)
const [containers, setContainers] = useState<Container[]>([]);
const [loadingContainers, setLoadingContainers] = useState(false);

useEffect(() => {
  if (isOpen) {
    loadContainers();
  }
}, [isOpen]);

const loadContainers = async () => {
  try {
    setLoadingContainers(true);
    const data = await containerService.getAll();
    setContainers(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('Failed to load containers:', error);
    setContainers([]);
  } finally {
    setLoadingContainers(false);
  }
};
```

### 2. Validation Améliorée
Ajout d'une validation pour vérifier que le conteneur appartient au même client que le booking :

```typescript
// Check if container belongs to the same client as the booking
if (operation && container.clientCode !== operation.clientCode) {
  return {
    isValid: false,
    message: `Container belongs to client ${container.clientCode}, but booking is for ${operation.clientCode}`,
    container
  };
}
```

## Validations Effectuées

Le système vérifie maintenant :
1. ✅ Format du numéro de conteneur (ISO 6346)
2. ✅ Existence du conteneur dans la base de données
3. ✅ Statut du conteneur = 'in_depot'
4. ✅ Conteneur non supprimé (is_deleted = false)
5. ✅ Conteneur appartient au même client que le booking
6. ✅ Capacité du camion respectée (1x40ft OU 2x20ft)

## Script de Diagnostic

Un script SQL a été créé pour diagnostiquer les problèmes similaires :
`scripts/diagnose-gate-out-container-issue.sql`

Ce script vérifie :
- Existence du conteneur à l'emplacement spécifié
- Statut du conteneur
- Conteneurs supprimés (soft delete)
- Opérations Gate Out en attente
- Références de booking
- Relations conteneur-client

## Comment Utiliser

### Pour l'Utilisateur
1. Ouvrir le modal Gate Out Completion
2. Le système charge automatiquement tous les conteneurs depuis la base de données
3. Saisir le numéro de conteneur
4. Le système valide en temps réel :
   - Format du numéro
   - Présence dans le yard
   - Statut 'in_depot'
   - Correspondance avec le client du booking

### Pour le Développeur
Si le problème persiste :
1. Exécuter le script de diagnostic SQL
2. Vérifier les logs de la console pour les erreurs de chargement
3. Vérifier que `containerService.getAll()` retourne bien tous les conteneurs
4. Vérifier les filtres RLS (Row Level Security) dans Supabase

## Tests à Effectuer

1. **Test de chargement** : Ouvrir le modal et vérifier que les conteneurs sont chargés
2. **Test de validation** : Saisir un numéro de conteneur existant avec statut 'in_depot'
3. **Test de client** : Vérifier qu'un conteneur d'un autre client est rejeté
4. **Test de statut** : Vérifier qu'un conteneur avec un autre statut est rejeté
5. **Test de capacité** : Vérifier les règles de capacité du camion

## Prévention

Pour éviter ce problème à l'avenir :
- Ne pas utiliser `useGlobalStore()` pour les données critiques nécessitant une fraîcheur garantie
- Toujours charger les données directement depuis la base de données pour les opérations critiques
- Implémenter des indicateurs de chargement pour informer l'utilisateur
- Ajouter des logs pour faciliter le diagnostic

## Impact

- ✅ Les conteneurs sont maintenant toujours à jour lors du Gate Out
- ✅ Pas de dépendance sur un store global potentiellement obsolète
- ✅ Meilleure validation avec vérification du client
- ✅ Expérience utilisateur améliorée avec des messages d'erreur plus précis
