# 📋 Guide d'utilisation - Equipment Reference

## 🎯 Objectif

Le champ **Equipment Reference** a été ajouté au formulaire Gate In pour permettre l'envoi d'informations de référence spécifiques aux clients via EDI, facilitant l'identification des transferts de conteneurs.

## ✨ Fonctionnalités

### 📝 Formulaire Gate In

- **Nouveau champ** : "Equipment Reference" dans l'étape 1 (Container Information)
- **Type** : Texte libre (optionnel)
- **Position** : Après le champ "Booking Reference"
- **Placeholder** : "e.g., Booking number, reference code..."
- **Description** : "Optional reference sent to clients via EDI to help identify container transfers"

### 🔄 Intégration EDI

- **Segment EDI** : RFF (Reference)
- **Qualifier** : EQ (Equipment reference number)
- **Format** : `RFF+EQ:VOTRE_REFERENCE`
- **Transmission** : Automatique lors de la complétion de l'opération Gate In

## 🚀 Utilisation

### 1. Saisie dans le formulaire Gate In

1. Ouvrir le module **Gate In**
2. Cliquer sur **"New Gate In"**
3. Remplir les informations du conteneur (Étape 1)
4. Dans le champ **"Equipment Reference"** :
   - Saisir le numéro de booking
   - Ou tout autre code de référence client
   - Ou laisser vide si non nécessaire

### 2. Exemples de références

```
BOOKING123456          # Numéro de booking
REF-2025-001          # Référence interne
CLIENT-ORDER-789      # Référence commande client
EXPORT-BATCH-A1       # Référence lot d'export
```

### 3. Transmission EDI automatique

Une fois l'opération Gate In complétée :
- L'Equipment Reference est automatiquement inclus dans le message EDI CODECO
- Le message est transmis au client via SFTP
- Le client reçoit la référence dans le segment `RFF+EQ:`

## 📊 Exemple EDI

### Message CODECO avec Equipment Reference

```edi
UNB+UNOC:3+DEPOT:ZZ+SYSTEM:ZZ+250203:1430+20250203143000'
UNH+1+CODECO:D:96A:UN'
BGM+85+WB001123456+9'
DTM+137:20250203:102'
RFF+AAO:WB001123456'
RFF+EQ:BOOKING123456'          ← Equipment Reference
RFF+AHP:Test Operator'
NAD+TO+SYSTEM:160:ZZZ'
TDT+20++3+++++ABC-123'
EQD+CN+MSKU1234567+40G1:102:5++4+4'
DTM+132:20250203:102'
DTM+133:20250203143000:203'
UNT+12+1'
UNZ+1+20250203143000'
```

## 🔧 Configuration technique

### Base de données

```sql
-- Nouveau champ ajouté à gate_in_operations
ALTER TABLE gate_in_operations 
ADD COLUMN equipment_reference text;
```

### Types TypeScript

```typescript
// Ajouté à GateInFormData
interface GateInFormData {
  // ... autres champs
  equipmentReference: string; // Equipment reference for EDI transmission
}

// Ajouté à GateInOperation
interface GateInOperation {
  // ... autres champs
  equipmentReference?: string; // Equipment reference for EDI transmission
}
```

### Service EDI

```typescript
// Ajouté à CodecoMessageData
interface CodecoMessageData {
  // ... autres champs
  equipmentReference?: string; // Equipment Reference for client identification
}

// Segment RFF généré automatiquement
if (data.equipmentReference) {
  this.segments.push({
    tag: 'RFF',
    elements: [`EQ:${data.equipmentReference}`]
  });
}
```

## 📈 Avantages

### Pour les opérateurs
- **Flexibilité** : Champ texte libre pour tout type de référence
- **Optionnel** : Pas d'impact sur les opérations existantes
- **Interface intuitive** : Intégré naturellement dans le formulaire

### Pour les clients
- **Identification facile** : Référence personnalisée dans chaque message EDI
- **Traçabilité** : Lien direct entre leurs systèmes et les opérations depot
- **Automatisation** : Réception automatique via EDI sans intervention manuelle

### Pour le système
- **Conformité EDI** : Utilise le standard UN/EDIFACT D.96A
- **Rétrocompatibilité** : Aucun impact sur les opérations existantes
- **Performance** : Index de base de données pour recherches rapides

## 🧪 Tests

### Test manuel

1. Créer une nouvelle opération Gate In
2. Remplir le champ Equipment Reference avec "TEST123"
3. Compléter l'opération
4. Vérifier dans les logs EDI que le segment `RFF+EQ:TEST123` est présent

### Test automatisé

```bash
# Exécuter le script de test
node test-equipment-reference-edi.ts
```

## 🔍 Dépannage

### Le champ n'apparaît pas
- Vérifier que la migration de base de données a été appliquée
- Redémarrer l'application après les modifications

### L'Equipment Reference n'apparaît pas dans l'EDI
- Vérifier que le champ est bien rempli dans le formulaire
- Contrôler les logs du service `gateInCodecoService`
- Vérifier que la fonction `mapGateInToCodecoData` inclut le champ

### Erreur de transmission EDI
- Vérifier la configuration SFTP
- Contrôler les logs de transmission EDI
- Vérifier que le format de référence est valide (pas de caractères spéciaux)

## 📞 Support

Pour toute question ou problème :
1. Consulter les logs de l'application
2. Vérifier la documentation EDI
3. Contacter l'équipe de développement

---

**Version** : 1.0  
**Date** : 3 février 2025  
**Auteur** : Équipe de développement CDMS