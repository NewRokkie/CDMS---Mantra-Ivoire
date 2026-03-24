# 🗄️ Database Backup & Restore - COMPLET

Scripts TypeScript pour sauvegarder et restaurer **INTÉGRALEMENT** la base de données PostgreSQL Supabase (TEST et PRODUCTION).

## 🚀 Commandes

### Interactif (recommandé)

```bash
# Backup complet interactif
npm run db:backup

# Restore complet interactif
npm run db:restore
```

### Scripts directs

```bash
# Backup TEST
npm run db:backup:test

# Backup PRODUCTION
npm run db:backup:prod

# Restore TEST
npm run db:restore:test

# Restore PRODUCTION (CRITIQUE!)
npm run db:restore:prod
```

## 📦 Ce qui est sauvegardé

Le backup est **COMPLET** et inclut :

| Élément | Quantité | Détails |
|---------|----------|---------|
| **Custom Types** | ~50 | ENUM, DOMAIN, COMPOSITE |
| **Tables** | 31 | Structure + contraintes + index |
| **Views** | 14 | Vues simples |
| **Materialized Views** | 0+ | Vues matérialisées avec index |
| **Functions** | ~87 | SQL et PL/pgSQL |
| **Triggers** | ~29 | Déclencheurs automatiques |
| **Sequences** | 0+ | Séquences auto-incrément |
| **Données** | ~1200 | Toutes les lignes de toutes les tables |
| **RLS** | Oui | Row Level Security activé |

## 🌍 Environnements

### 🧪 TEST / QUALIFICATION
```
Host: aws-1-eu-west-1.pooler.supabase.com:5432
Database: postgres
User: postgres.nelmhiqsoamjluadnlvd
```

### 🟢 PRODUCTION
```
Host: aws-1-us-east-1.pooler.supabase.com:5432
Database: postgres
User: postgres.lveqqmkyludigtgfqmwl
```

## 📁 Structure des fichiers

```
scripts/
├── backup-database.ts    # Backup complet multi-environnements
├── restore-database.ts   # Restore complet multi-environnements
└── README-BACKUP.md      # Cette documentation

database backup/
├── backup-TEST-*.sql     # Backups complets de TEST
└── backup-PROD-*.sql     # Backups complets de PRODUCTION
```

## 📝 Utilisation

### 1. Backup avant modification

```bash
# Sauvegarder TEST
npm run db:backup:test

# Sauvegarder PRODUCTION (IMPORTANT!)
npm run db:backup:prod
```

### 2. Restaurer TEST

```bash
npm run db:restore:test
# → Choisir environnement (1 pour TEST)
# → Choisir le fichier
# → Confirmer avec "OUI"
```

### 3. Restaurer PRODUCTION

```bash
npm run db:restore:prod
# → Choisir environnement (2 pour PRODUCTION)
# → Choisir le fichier
# → Confirmer avec "OUI" (CRITIQUE!)
```

## 🔍 Contenu du fichier SQL

Le fichier de backup contient **8 sections** :

```sql
-- 1. CUSTOM TYPES (ENUM, DOMAIN, COMPOSITE)
DROP TYPE IF EXISTS ...
CREATE TYPE ... AS ENUM (...)

-- 2. STRUCTURE DES TABLES
DROP TABLE IF EXISTS ... CASCADE
CREATE TABLE ... (
  columns,
  CONSTRAINT ...,
  FOREIGN KEY ...
)
CREATE INDEX ...

-- 3. VIEWS & MATERIALIZED VIEWS
DROP VIEW IF EXISTS ...
CREATE VIEW ... AS ...
CREATE MATERIALIZED VIEW ... AS ...
CREATE INDEX ... (sur materialized view)

-- 4. FUNCTIONS
CREATE OR REPLACE FUNCTION ...
CREATE OR REPLACE FUNCTION ...
...

-- 5. TRIGGERS
CREATE TRIGGER ... BEFORE/AFTER ... ON ...
...

-- 6. DONNÉES DES TABLES
INSERT INTO ... VALUES ...
INSERT INTO ... VALUES ...
...

-- 7. SÉQUENCES
SELECT setval('...', ...);

-- 8. ROW LEVEL SECURITY
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
```

## ⚙️ Configuration

Les identifiants sont dans les scripts :

```typescript
// scripts/backup-database.ts & restore-database.ts
const DB_TEST_CONFIG = { /* TEST */ };
const DB_PROD_CONFIG = { /* PRODUCTION */ };
```

**Pour modifier**, éditez ces constantes dans les deux fichiers.

## 🛠️ Dépannage

### Erreurs de syntaxe SQL
- Les fonctions PL/pgSQL sont exportées avec `CREATE OR REPLACE FUNCTION`
- Les triggers utilisent `pg_get_triggerdef()` pour une compatibilité maximale

### Erreurs de clé étrangère (42830)
- L'ordre des tables respecte les dépendances
- Les vues sont créées APRÈS les tables

### Erreurs de duplication (23505)
- Normal si données existantes
- Le script ignore ces erreurs

### Fonctions manquantes
- Vérifiez que toutes les 87 fonctions sont dans le backup
- Les fonctions sont dans la section 4

### Problèmes de connexion
- Vérifiez les identifiants
- IP non bloquée par Supabase

## 🔐 Sécurité

### ⚠️ PRODUCTION

- **TOUJOURS** faire un backup avant modification
- **JAMAIS** restaurer sans confirmation "OUI"
- **VÉRIFIER** l'environnement sélectionné

### Bonnes pratiques

1. **Backup avant chaque déploiement**
2. **Conserver localement** (ne pas commiter)
3. **Garder 5-10 derniers backups**
4. **Tester sur TEST avant PROD**

## 📊 Exemple de sortie

### Backup complet
```
╔═══════════════════════════════════════════════════════════════╗
║         SÉLECTION DE L'ENVIRONNEMENT                         ║
╚═══════════════════════════════════════════════════════════════╝

   1. 🧪 TEST / QUALIFICATION (eu-west-1)
   2. 🟢 PRODUCTION (us-east-1)

Choisissez un environnement (1 ou 2): 1

💾 BACKUP COMPLET DE LA BASE DE DONNÉES
🌍 Environnement: TEST
═══════════════════════════════════════════════════════════════════

1️⃣ Types personnalisés...   📊 52 types
2️⃣ Tables...                 📊 31 tables
3️⃣ Vues...                   📊 14 vues
4️⃣ Structure des tables...   ✅ 31 tables
5️⃣ Vues...                   ✅ 14 vues
6️⃣ Fonctions...              📊 87 fonctions
7️⃣ Triggers...               📊 29 triggers
8️⃣ Données...                📥 1228 lignes
9️⃣ Séquences...              📊 0 séquences

✅ BACKUP TERMINÉ AVEC SUCCÈS

📊 Résumé:
   • 31 tables sauvegardées
   • 14 vues
   • 87 fonctions
   • 29 triggers
   • 1228 lignes exportées

📁 Fichier: backup-TEST-2026-03-17T18-25-35.sql (0.82 MB)
```

### Restore complet
```
╔═══════════════════════════════════════════════════════════════╗
║         SÉLECTION DE L'ENVIRONNEMENT                         ║
╚═══════════════════════════════════════════════════════════════╝

   1. 🧪 TEST
   2. 🟢 PRODUCTION

Choisissez un environnement (1 ou 2): 1

📁 Fichiers disponibles:
   ┌─────────────────────────────────────────────────────────┐
   │ 1. backup-TEST-2026-03-17T18-25-35.sql (0.82 MB) [🧪]  │
   └─────────────────────────────────────────────────────────┘

⚠️  ATTENTION: Cette opération va SUPPRIMER et recréer TOUS les objets!
   (Vues, Fonctions, Triggers, Tables, Données)

   Êtes-vous SÛR? (tapez "OUI" pour confirmer): OUI

✅ RESTAURATION TERMINÉE

📊 Résumé:
   • 3500 statements exécutés
   • 100 avertissements (ignorés)
   • 0 erreurs

   Détails:
      • Types: 52
      • Tables: 31
      • Vues: 14
      • Fonctions: 87
      • Triggers: 29
      • Données (INSERT): 1228
      • Séquences: 0
```

## 📞 Support

Pour toute question, contactez l'équipe de développement.

---

**Dernière mise à jour** : 2026-03-17  
**Version** : 3.0 (BACKUP COMPLET)  
**Inclus** : Types, Tables, Views, Functions, Triggers, Sequences, Data, RLS
