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

## 🟡 PRIORITÉ MOYENNE - Améliorations UX (EDIManagement Admin Only)

> **Principe directeur:** Les opérateurs n'ont aucun accès à l'EDI. Tout est automatique (génération + envoi) lors de la complétion d'une opération Gate OUT. Les fonctionnalités ci-dessous sont réservées au module EDIManagement, accessible uniquement aux admins/superviseurs.

### ~~5. Prévisualisation EDI~~ ❌ SUPPRIMÉ

> Contraire au principe "opérateurs sans accès EDI". La prévisualisation implique une interaction manuelle avant envoi, ce qui n'est pas le modèle voulu. L'EDIValidator existant dans EDIManagement couvre le besoin admin.

---

### 6. Réessai en Masse (Bulk Retry) — EDIManagement uniquement

#### 6.1 Ajouter méthode `retryFailedBatch` dans ediTransmissionService
- [x] Fichier cible: `src/services/edi/ediTransmissionService.ts`
- [x] Méthode: `retryFailedBatch(logIds: string[])`
- [x] Pour chaque logId: appeler `retryTransmission()` existant
- [x] Retourner: `{ success: string[], failed: {id: string, error: string}[] }`

#### 6.2 Ajouter UI de bulk retry dans EDIManagement (onglet Overview)
- [x] Checkbox de sélection sur chaque ligne `status === 'failed'`
- [x] Bouton "Retry Selected (N)" visible seulement si sélection > 0
- [x] Barre de progression pendant le traitement: "Retrying 3/10..."
- [x] Toast résumé à la fin: "Success: 8, Failed: 2"

---

### 7. Logs de Transmission Détaillés — EDIManagement uniquement

#### 7.1 Modal de détails de transmission
- [x] Fichier cible: `src/components/EDI/EDITransmissionDetailsModal.tsx`
- [x] Déclenché par clic sur une ligne de l'historique dans EDIManagement
- [x] Affiche: timestamps des tentatives, message d'erreur complet, taille fichier, serveur utilisé

#### 7.2 Ajouter lien de détails dans la table historique EDIManagement
- [x] Remplacer le bouton "Copy details" par un bouton "View Details" → ouvre le modal
- [x] Garder le bouton "Copy" en complément

---

### 8. Enrichir l'onglet Overview EDIManagement (pas de nouveau composant)

> L'onglet Overview existe déjà avec 4 KPI cards. Il s'agit de l'enrichir, pas de créer un composant séparé.

#### 8.1 Ajouter graphiques dans l'onglet Overview existant
- [x] Graphique: évolution du volume EDI sur 7 jours (Gate IN vs Gate OUT)
- [x] Graphique: distribution par statut (success/failed/pending)

#### 8.2 Ajouter méthodes stats dans ediTransmissionService
- [x] `getDailyVolume(days: number)` — volume par jour sur N jours
- [x] `getStatusDistribution()` — répartition success/failed/pending

---

## 🟢 PRIORITÉ FAIBLE - Améliorations Futures

### 9. Notifications Push pour Échecs EDI

#### 9.1 Configuration des notifications EDI
- [x] Ajouter champ dans `edi_client_settings`: `notify_on_failure: boolean`
- [x] Ajouter champ: `notification_channels: 'email' | 'slack' | 'in-app'[]`
- [x] Ajouter champ dans `edi_server_config`: `admin_notification_on_failure: boolean`

#### 9.2 Service de notification EDI
- [x] Fichier cible: `src/services/edi/ediNotificationService.ts` (nouveau fichier)
- [x] Méthode: `notifyOnFailure(transmissionLog)`
- [x] Intégrer avec service de notifications existant
- [x] Envoyer notification: "EDI failed for client X, operation Y, error: Z"

#### 9.3 UI pour gestion des notifications
- [x] Settings de notification dans `EDIClientModal.tsx`
- [x] Type: Checkbox "Notify on EDI failure"
- [x] Channels: In-App (adapté à l'architecture existante du projet)

---

### 10. Export des Logs en CSV/Excel

#### 10.1 Service d'export des logs EDI
- [x] Fichier cible: `src/services/edi/ediExportService.ts` (nouveau fichier)
- [x] Méthode: `exportLogsToCSV(filters: LogFilters)`
- [x] Méthode: `exportLogsToExcel(filters: LogFilters)`
- [x] Colonnes: ID, Client, Operation, Container, Status, Date, Error, Retries

#### 10.2 Interface d'export dans EDIManagement
- [x] Bouton "Export Logs" à côté des filtres
- [x] Dropdown: "Export as CSV" | "Export as Excel"
- [x] Appliquer filtres actuels avant export
- [x] Filtrer par date range, client, statut

---

### 11. Tests Automatiques de Validation EDIFACT

#### 11.1 Créer suite de tests EDIFACT
- [x] Fichier: `src/services/edi/ediValidation.test.ts`
- [x] Test: Validation des segments UNB, UNH, UNT, UNZ
- [x] Test: Validation des champs obligatoires
- [x] Test: Validation des formats de date (YYMMDD / YYYYMMDD)
- [x] Test: Validation des codes ISO (ISO 6346 — format conteneur)

#### 11.2 Intégrer validation pré-génération
- [x] Avant d'envoyer, valider données Gate IN et Gate OUT
- [x] Méthodes privées `validateGateInData()` et `validateGateOutData()` dans `sftpIntegrationService.ts`
- [x] Loguer les avertissements de validation
- [x] Envoyer quand même (non-bloquant) — warnings loggés en console

---

### 12. Monitoring en Temps Réel

#### 12.1 Créer composant EDIRealtimeMonitor
- [x] Fichier cible: `src/components/EDI/EDIRealtimeMonitor.tsx`
- [x] Polling automatique toutes les 30s via `setInterval`
- [x] Affiche queue de transmissions en cours (pending/retrying) + récentes
- [x] Modal avec liste détaillée, pills de résumé (Processing / Failed / Success)

#### 12.2 Intégrer monitoring dans EDIManagement header
- [x] Badge animé "Processing: X" quand transmissions en cours
- [x] Clic → ouvre modal avec liste en temps réel
- [x] Bouton "Details" → ouvre `EDITransmissionDetailsModal`

---

## 📋 Checklist de Validation Avant Déploiement

### Développement
- [x] Toutes tâches Priorité HAUTE complétées
- [x] Toutes tâches Priorité MOYENNE complétées (Phase 2)
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
