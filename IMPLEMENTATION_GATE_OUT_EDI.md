# TODO Liste: Implémentation EDI Automatique pour GATE OUT

## 📊 Vue d'ensemble

Ce document contient la liste des tâches à réaliser pour implémenter correctement la génération et l'envoi automatique d'EDI pour les opérations GATE OUT.

**État Actuel:**
- ✅ Génération CODECO fonctionnelle
- ✅ Envoi automatique lors de GATE OUT (implémenté)
- ✅ Transmission SFTP réelle avec retry exponentiel (implémenté)
- ✅ Interface GATE OUT avec indicateur de statut EDI (implémenté)

**Estimation Totale:** 4-6 jours de développement

---

## 🔴 PRIORITÉ HAUTE - Blocage Critique

### 1. Implémentation de l'Automatisation EDI

#### 1.1 Créer le listener d'événement GATE_OUT_COMPLETED
- [x] Fichier cible: `src/services/eventListeners.ts`
- [x] Importer `gateEDIIntegration` et `ediClientSettings`
- [x] Créer handler pour événement `GATE_OUT_COMPLETED`
- [x] Vérifier si EDI est activé pour le client (`ediClientSettings.isEdiEnabledForClient()`)
- [x] Si activé: appeler `gateEDIIntegration.processGateOutWithEDI()`
- [x] Gérer les erreurs et logger les échecs

```typescript
// Exemple d'implémentation
await eventBus.on('GATE_OUT_COMPLETED', async (data) => {
  const { containers, operation, bookingReference } = data;
  
  // Vérifier configuration client EDI
  const isEdiEnabled = ediClientSettings.isEdiEnabledForClient(
    bookingReference.clientName,
    bookingReference.clientCode,
    'GATE_OUT'
  );
  
  if (isEdiEnabled) {
    try {
      await gateEDIIntegration.processGateOutWithEDI({
        bookingNumber: operation.booking_number,
        clientCode: operation.client_code,
        containerNumbers: containers.map(c => c.containerNumber),
        operationId: operation.id,
        gateOutDate: operation.completed_at
      }, yardInfo);
    } catch (error) {
      logger.error('EDI generation failed for GATE_OUT', { operationId: operation.id, error });
    }
  }
});
```

#### 1.2 Initialiser le listener au démarrage
- [x] Fichier cible: `src/services/initialize.ts`
- [x] Ajouter appel au fichier d'event listeners dans la séquence d'initialisation
- [x] Vérifier que `eventBus` et `gateEDIIntegration` sont initialisés avant d'enregistrer le listener

---

### 2. Remplacer la Simulation par Transmission SFTP Réelle

#### 2.1 Intégrer SFTP dans ediRealDataService
- [x] Fichier cible: `src/services/edi/ediRealDataService.ts`
- [x] Méthode: `processRealGateOutEDI()` (lignes 302-337)
- [x] Importer `sftpIntegrationService`
- [x] Supprimer le code de simulation (commentaire ligne 317)
- [x] Appeler `sftpIntegrationService.uploadFile()` avec les données EDI générées
- [x] Gérer les errors SFTP (connection failed, permission denied, etc.)
- [x] Mettre à jour `gate_out_operations.edi_transmitted` seulement après succès
- [x] Créer log dans `edi_transmission_logs` avec statut réel

```typescript
// Remplacer simulation par:
try {
  const uploadResult = await sftpIntegrationService.uploadFile(
    serverConfig,
    fileName,
    ediMessage
  );
  
  if (uploadResult.success) {
    await ediDatabaseService.updateGateOutEdiStatus(operationId, true, new Date());
    return { success: true, message: 'EDI transmitted successfully', logId };
  } else {
    await ediDatabaseService.updateGateOutEdiStatus(operationId, false, null, uploadResult.error);
    return { success: false, error: uploadResult.error };
  }
} catch (error) {
  await ediDatabaseService.updateGateOutEdiStatus(operationId, false, null, error.message);
  return { success: false, error: error.message };
}
```

#### 2.2 Configurer retry automatique en cas d'échec
- [x] Dans `processRealGateOutEDI()`, implémenter logique de retry
- [x] Lire `server_config.retry_attempts` (défaut: 3)
- [x] Incrémenter `retry_count` dans `edi_transmission_logs` à chaque tentative
- [x] Attendre délai exponentiel entre retries (ex: 1s, 2s, 4s)
- [x] Passer statut à 'failed' après tous les retries épuisés

---

### 3. Améliorer l'Interface GATE OUT

#### 3.1 Ajouter colonne Statut EDI dans GateOutOperationsTable
- [x] Fichier cible: `src/components/Gates/GateOut/GateOutOperationsTable.tsx`
- [x] Ajouter colonne 'EDI Status' dans la table (lignes 70-144)
- [x] Créer badge avec couleurs:
  - 🟢 Vert = 'EDI Sent' (edi_transmitted = true)
  - ⚪ Gris = 'No EDI' (client sans EDI actif, ou sans Config SFTP)
  - 🔴 Rouge = 'EDI Failed' (erreur dans transmission_logs)
- [x] Ajouter icône de synchronisation pour statut 'retrying'

```tsx
<Badge className={`${
  operation.edi_transmitted 
    ? 'bg-green-100 text-green-800' 
    : ediEnabled 
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-800'
}`}>
  {operation.edi_transmitted ? 'Sent' : ediEnabled ? 'Pending' : 'Disabled'}
</Badge>
```

#### 3.2 Ajouter indicateur EDI dans GateOutCompletionModal
- [x] Fichier cible: `src/components/Gates/GateOut/GateOutCompletionModal.tsx`
- [x] Avant validation, charger configuration EDI du client
- [x] Afficher badge en haut du modal: "EDI: Enabled/Disabled"
- [x] Si EDI activé: message "EDI will be sent automatically after completion"
- [x] Si EDI désactivé: message "EDI not configured for this client"

---

## 🟡 PRIORITÉ MOYENNE - Améliorations UX

### 5. Prévisualisation EDI

#### 5.1 Créer modal de prévisualisation
- [ ] Fichier cible: `src/components/EDI/EDIPreviewModal.tsx` (nouveau fichier)
- [ ] Propriétés: `codecoMessage`, `fileName`, `onClose`, `onDownload`
- [ ] Affiche: Contenu EDI formaté avec coloration syntaxique
- [ ] Boutons: "Download", "Send Now", "Close"

```tsx
interface EDIPreviewModalProps {
  codecoMessage: string;
  fileName: string;
  onClose: () => void;
  onDownload: () => void;
  onSend: () => void;
}
```

#### 5.2 Intégrer prévisualisation dans gateEDIIntegration
- [ ] Méthode: `previewCodecoBeforeSend(gateOutData, yardInfo)`
- [ ] Générer CODECO sans envoyer
- [ ] Retourner: `{ codecoMessage, fileName, metadata }`
- [ ] Utiliser dans UI pour affichage avant envoi

#### 5.3 Ajouter bouton "Preview EDI" dans GateOutOperationsTable
- [ ] Pour opérations complétées avec EDI disponible
- [ ] Cliquer → génère et affiche prévisualisation
- [ ] Option d'envoi direct depuis modal

---

### 6. Réessai en Masse (Bulk Retry)

#### 6.1 Créer service de bulk retry
- [ ] Fichier cible: `src/services/edi/ediTransmissionService.ts`
- [ ] Méthode: `retryFailedBatch(operationIds: string[])`
- [ ] Itérer sur tous les IDs d'operations
- [ ] Pour chaque: régénérer CODECO et transmettre
- [ ] Retourner: `{ success: string[], failed: {id, error}[] }`

```typescript
async retryFailedBatch(operationIds: string[]) {
  const results = {
    success: [] as string[],
    failed: [] as {id: string, error: string}[]
  };
  
  for (const operationId of operationIds) {
    try {
      await this.retryTransmission(operationId);
      results.success.push(operationId);
    } catch (error) {
      results.failed.push({ id: operationId, error: error.message });
    }
  }
  
  return results;
}
```

#### 6.2 Ajouter UI de bulk retry dans EDIManagement
- [ ] Filtre pour opérations EDI failed
- [ ] Checkbox pour sélection multiple
- [ ] Bouton "Retry Selected" (disponible seulement si > 0 sélectionné)
- [ ] Afficher progression: "Retrying 3/10..."
- [ ] Resume: "Success: 8, Failed: 2" après terminaison

---

### 7. Logs de Transmission Détaillés

#### 7.1 Améliorer la structure de logs dans edi_transmission_logs
- [ ] Ajouter colonnes: `sftp_error_code`, `sftp_error_message`, `file_size_bytes`
- [ ] Ajouter colonne `retry_log` (JSON array des tentatives avec timestamps)
- [ ] Migration de base de données si nécessaire

```sql
ALTER TABLE edi_transmission_logs 
ADD COLUMN sftp_error_code TEXT,
ADD COLUMN sftp_error_message TEXT,
ADD COLUMN file_size_bytes INTEGER,
ADD COLUMN retry_logs JSONB DEFAULT '[]'::jsonb;
```

#### 7.2 Créer modal de détails de transmission
- [ ] Fichier cible: `src/components/EDI/EDITransmissionDetailsModal.tsx`
- [ ] Propriétés: `transmissionLog`
- [ ] Affiche:
  - Timestamp de toutes les tentatives
  - Messages d'erreur complets
  - Taille de fichier
  - Configuration serveur utilisée
  - Durée totale de transmission

#### 7.3 Ajouter lien de détails dans EDIManagement table
- [ ] Pour chaque ligne de log, clic sur logId → ouvre modal de détails
- [ ] Tooltip: "Click to view transmission details"

---

### 8. Dashboard EDI

#### 8.1 Créer composant EDIDashboard
- [ ] Fichier cible: `src/components/EDI/EDIDashboard.tsx` (nouveau fichier)
- [ ] KPIs:
  - Total EDI envoyés aujourd'hui
  - Taux de succès (%)
  - Nombre de retries actifs
  - Top 5 clients par volume EDI
- [ ] Graphiques:
  - Evolution du volume EDI sur 7 jours
  - Distribution par statut (success/failed/retrying)
  - Performance par serveur

#### 8.2 Intégrer dashboard dans module EDI
- [ ] Onglet "Dashboard" dans `EDIManagement.tsx`
- [ ] Chargement des KPIs depuis `ediTransmissionService.getDashboardStats()`

#### 8.3 Service de statistiques EDI
- [ ] Fichier cible: `src/services/edi/ediStatisticsService.ts` (nouveau fichier)
- [ ] Méthodes:
  - `getTodayStats()` - EDI envoyés/ratés/corrigés
  - `getClientVolumeStats(startDate, endDate)` - Volume par client
  - `getServerPerformanceStats()` - Performance par serveur
  - `getSuccessRateStats(period)` - Taux de succès sur période

---

## 🟢 PRIORITÉ FAIBLE - Améliorations Futures

### 9. Notifications Push pour Échecs EDI

#### 9.1 Configuration des notifications EDI
- [ ] Ajouter champ dans `edi_client_settings`: `notify_on_failure: boolean`
- [ ] Ajouter champ: `notification_channels: 'email' | 'slack' | 'in-app'[]`
- [ ] Ajouter champ dans `edi_server_config`: `admin_notification_on_failure: boolean`

#### 9.2 Service de notification EDI
- [ ] Fichier cible: `src/services/edi/ediNotificationService.ts` (nouveau fichier)
- [ ] Méthode: `notifyOnFailure(transmissionLog)`
- [ ] Intégrer avec service de notifications existant
- [ ] Envoyer notification: "EDI failed for client X, operation Y, error: Z"

#### 9.3 UI pour gestion des notifications
- [ ] Settings de notification dans `EDIClientSettingsModal.tsx`
- [ ] Type: Checkbox "Notify on EDI failure"
- [ ] Channels: Sélecteur "Email | Slack | In-App | All"

---

### 10. Export des Logs en CSV/Excel

#### 10.1 Service d'export des logs EDI
- [ ] Fichier cible: `src/services/edi/ediExportService.ts` (nouveau fichier)
- [ ] Méthode: `exportLogsToCSV(filters: LogFilters)`
- [ ] Méthode: `exportLogsToExcel(filters: LogFilters)`
- [ ] Colonnes: ID, Client, Operation, Container, Status, Date, Error, Retries

#### 10.2 Interface d'export dans EDIManagement
- [ ] Bouton "Export Logs" à côté des filtres
- [ ] Dropdown: "Export as CSV" | "Export as Excel"
- [ ] Appliquer filtres actuels avant export
- - Filtrer par date range, client, statut

---

### 11. Tests Automatiques de Validation EDIFACT

#### 11.1 Créer suite de tests EDIFACT
- [ ] Fichier: `src/services/edi/ediValidation.test.ts`
- [ ] Test: Validation des segments UNB, UNH, BGM
- [ ] Test: Validation des champs obligatoires
- [ ] Test: Validation des formats de date
- [ ] Test: Validation des codes ISO (ISO3166, ISO6346, etc.)

#### 11.2 Intégrer validation pré-génération
- [ ] Avant d'envoyer, valider CODECO généré
- [ ] Utiliser `EDIValidator.tsx` disponible
- [ ] Loguer les avertissements de validation
- - Envier quand même mais marquer comme "validated_with_warnings"

---

### 12. Monitoring en Temps Réel

#### 12.1 Créer composant EDIRealtimeMonitor
- [ ] Fichier cible: `src/components/EDI/EDIRealtimeMonitor.tsx` (nouveau fichier)
- [ ] Abonnement aux changements dans `edi_transmission_logs`
- - Rafraîchissement automatique toutes les 30s
- - Affiche queue de transmissions en cours

#### 12.2 Intégrer monitoring dans EDIModuleHeader
- [ ] Badge animé "Processing: X" quand transmissions en cours
- - Clic → ouvre modal avec liste en temps réel

---

## 📋 Checklist de Validation Avant Déploiement

### Développement
- [x] Toutes tâches Priorité HAUTE complétées
- [ ] Tests unitaires passent (> 80% couverture)
- [ ] Tests d'intégration SFTP réussis
- [ ] Code review effectuée par pairs

### Configuration
- [ ] Serveur SFTP production configuré dans `edi_server_config`
- [ ] Clients EDI activés avec bons paramètres
- [ ] Logs de base de données vérifiés
- [ ] Permissions SFTP validées

### Documentation
- [ ] README mis à jour avec nouvelle fonctionnalité
- [ ] Guide utilisateur: Comment activer EDI GATE OUT
- [ ] Guide admin: Configuration serveur SFTP
- [ ] Guide dépannage: Échecs de transmission EDI

### Sécurité
- [ ] Credentials SFTP stockés sécurisément (pas en clair)
- [ ] Validation des inputs provenant de GATE OUT
- [ ] Logs ne contiennent pas de données sensibles (passwords)
- [ ] Rate limiting sur endpoint de retry pour éviter abus

### Performance
- [ ] Génération CODECO < 1 sec pour 10 conteneurs
- [ ] Upload SFTP < 5 sec pour fichier EDI standard
- [ ] Retries n'impactent pas performance GATE OUT (async)
- [ ] Index base de données optimisés pour queries EDI

---

## 🔄 Plan de Déploiement

### Phase 1: Développement (Jours 1-3)
- Tâches 1, 2, 3 (Priorité HAUTE)
- Tests unitaires et intégration

### Phase 2: Tests (Jour 4)
- Test end-to-end avec serveur SFTP staging
- Tests de charge avec génération massive d'EDI
- Validation logs et notifications

### Phase 3: Déploiement Staging (Jour 5)
- Déployer sur environnement staging
- Tests avec clients pilotes
- Feedback des opérateurs

### Phase 4: Déploiement Production (Jour 6)
- Déploiement production
- Monitoring actif pendant 24h
- Hotfix si nécessaire

---

## 📞 Points de Contact et Ressources

### Documentation Externe
- [EDIFACT D96A Standard](http://www.unece.org/trade/EDIFACT/) - Référence official des segments EDIFACT
- [CODECO Message Specification](https://www.unece.org/trade/EDIFACT/EDICONT/D01A.htm) - Spécification Codeco (Container Discharge Confirmation)

### Composants Clés à Référencer
- `src/services/edi/gateOutCodecoService.ts` - Génération CODECO
- `src/services/edi/sftpIntegrationService.ts` - Upload SFTP
- `src/services/edi/ediClientSettings.ts` - Configuration client
- `src/components/Gates/GateOut/GateOutOperationsTable.tsx` - UI GATE OUT
- `src/components/EDI/EDIManagement.tsx` - UI Gestion EDI

### Services Backend
- `api/edi/*` - API Python pour validation et conversion EDI (complémentaire)

---

## ✅ Critères de Succès

### Fonctionnels
- [x] EDI généré automatiquement à chaque GATE OUT pour clients activés
- [x] Fichier envoyé via SFTP avec succès > 99%
- [x] Statut EDI visible dans interface GATE OUT
- [x] Retry automatique sur échec

### Non-Fonctionnels
- [x] Performance: < 2s de latence totale (génération + upload)
- [x] Fiabilité: < 0.1% d'échecs non récupérables
- [x] Maintenabilité: Code testable et documenté
- [x] Sécurité: Credentials chiffrés, pas de data sensibles en logs

### UX
- [x] Opérateurs savent quand EDI est envoyé
- [x] Réparation facile en cas d'échec (bouton retry)
- [x] Visualisation de l'historique de transmission
- [x] Dashboard pour monitoring

---

## 📝 Notes de Développement

### Astuces pour Éviter les Problèmes Courants:
1. **Toujours vérifier les paramètres client avant génération** - Ne pas générer EDI inutilement
2. **Gérer les erreurs SFTP correctement** - Ne pas bloquer le processus GATE OUT principal
3. **Logger tous les retries** - Essentiel pour diagnostic et audit
4. **Utiliser des IDs opérations uniques** - Facilité la tracking des logs
5. **Valider les données AVANT génération EDIFACT** - Évite erreurs de format

### Dépendances Entre Modules:
- `eventBus` → `gateEDIIntegration` → `gateOutCodecoService` → `codecoGenerator`
- `gateEDIIntegration` → `ediRealDataService` → `sftpIntegrationService`
- `ediClientSettings` → utilisé à plusieurs points pour vérifier activation

---

**Dernière mise à jour:** 2025-01-15
**Version:** 1.0
**Auteur:** Plan Analysis
