# CDMS - Supabase Migrations

Ce dossier contient les fichiers de migration pour la base de données Supabase du projet CDMS (Container Depot Management System).

## 📁 Structure des migrations

### Migrations principales (à appliquer dans l'ordre)

```
20260304000000_consolidated_schema.sql      - Schéma complet (tables + FK + index)
20260304000001_functions_and_triggers.sql   - Fonctions personnalisées + Triggers + RLS
```

### Migrations générées automatiquement

Le dossier `generated/` contient les migrations brutes générées automatiquement depuis la base de données production :
- `20260304000000_consolidated_schema.sql` - Schéma complet brut
- `20260304000001_custom_functions.sql` - 84 fonctions personnalisées
- `20260304000002_*.sql` à `20260304000027_*.sql` - Migrations individuelles par table (ordre de dépendance)

## 🚀 Comment appliquer les migrations

### Option 1 : Via le Dashboard Supabase (Recommandé)

1. **Ouvrir le SQL Editor** dans le dashboard Supabase
2. **Copier le contenu** de `001_consolidated_schema.sql`
3. **Exécuter** le script
4. **Répéter** avec `002_functions_and_triggers.sql`

### Option 2 : Via Supabase CLI

```bash
# Linker le projet (si ce n'est pas déjà fait)
npx supabase link --project-ref nelmhiqsoamjluadnlvd

# Appliquer les migrations principales
npx supabase db push --file supabase/migrations/20260304000000_consolidated_schema.sql
npx supabase db push --file supabase/migrations/20260304000001_functions_and_triggers.sql
```

### Option 3 : Via psql

```bash
# Appliquer le schéma
psql "postgresql://postgres:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/20260304000000_consolidated_schema.sql

# Appliquer les fonctions
psql "postgresql://postgres:PASSWORD@aws-1-eu-west-1.pooler.supabase.com:5432/postgres" \
  -f supabase/migrations/20260304000001_functions_and_triggers.sql
```

## 📊 Structure de la base de données

### Tables principales (26 tables)

#### Core Business (8 tables)
| Table | Description |
|-------|-------------|
| `yards` | Dépôts/terrains de stockage |
| `sections` | Sections dans les yards |
| `stacks` | Pistes de stockage |
| `locations` | Emplacements individuels (SXXRXHX) |
| `containers` | Conteneurs (avec soft delete) |
| `container_types` | Types de conteneurs |
| `container_buffer_zones` | Zone tampon (conteneurs endommagés) |
| `virtual_stack_pairs` | Paires de pistes virtuelles |

#### Clients & Pools (3 tables)
| Table | Description |
|-------|-------------|
| `clients` | Informations clients |
| `client_pools` | Pools clients par yard |
| `stack_assignments` | Assignations de pistes |

#### Opérations (3 tables)
| Table | Description |
|-------|-------------|
| `booking_references` | Réservations |
| `gate_in_operations` | Opérations d'entrée |
| `gate_out_operations` | Opérations de sortie |

#### EDI Management (3 tables)
| Table | Description |
|-------|-------------|
| `edi_server_configurations` | Configurations serveurs EDI/SFTP |
| `edi_client_settings` | Paramètres EDI par client |
| `edi_transmission_logs` | Logs de transmission EDI |

#### Users & Auth (5 tables)
| Table | Description |
|-------|-------------|
| `users` | Utilisateurs (avec soft delete) |
| `user_module_access` | Accès aux modules |
| `user_activities` | Activités des utilisateurs |
| `user_login_history` | Historique des connexions |
| `module_access_sync_log` | Logs de synchronisation |

#### Audit & Logs (4 tables)
| Table | Description |
|-------|-------------|
| `audit_logs` | Audit général |
| `location_audit_log` | Audit des locations |
| `location_id_mappings` | Mapping IDs legacy → UUID |
| `stack_pairings` | Pairing de pistes |

## 🔧 Fonctions personnalisées principales

### Utilitaires
- `calculate_stack_capacity()` - Calcule la capacité d'une piste
- `is_location_available()` - Vérifie si un emplacement est libre
- `get_next_location_id()` - Génère le prochain ID d'emplacement

### Audit
- `add_container_audit_log()` - Trigger pour audit des conteneurs
- `locations_audit_trigger()` - Trigger pour audit des locations

### Gestion
- `update_stack_capacity()` - Mise à jour automatique capacité
- `auto_mark_buffer_zones()` - Marquage automatique zones tampon
- `calculate_session_duration()` - Calcul durée sessions

## 🔒 Row Level Security (RLS)

Les politiques RLS de base sont incluses dans `002_functions_and_triggers.sql` :

```sql
-- Exemple de politiques
"Users can view all users" - Tous les utilisateurs authentifiés peuvent lire
"Users can update own record" - Mise à jour de son propre profil
"Authenticated users can view containers" - Lecture des conteneurs
"Admins can manage containers" - Admins peuvent tout gérer
```

⚠️ **Important** : Ces politiques sont des templates. Adaptez-les selon vos besoins de sécurité.

## 🔄 Régénérer les migrations

Pour régénérer les migrations depuis la base de données :

```bash
# Exécuter le script de génération (format Supabase automatique)
npx tsx scripts/generate-migrations.ts
```

Les fichiers seront générés dans `supabase/migrations/generated/` avec le format `YYYYMMDDHHMMSS_description.sql`.

**Note** : Le générateur produit automatiquement les fichiers dans le format Supabase avec :
- Timestamp au format `YYYYMMDDHHMMSS`
- Ordre de dépendance respecté pour les tables individuelles
- Noms de fichiers sanitizés (minuscules, underscores)

## 📝 Historique des versions

| Version | Date | Description |
|---------|------|-------------|
| 1.0 | 2026-03-04 | Migration initiale depuis production |

## ⚠️ Notes importantes

1. **Soft Delete** : Plusieurs tables implémentent le soft delete (`is_deleted`, `deleted_at`, `deleted_by`)

2. **Triggers** : Les triggers sont inclus mais certains peuvent nécessiter des ajustements selon l'environnement

3. **Extensions requises** :
   - `uuid-ossp` - Génération d'UUID
   - `pgcrypto` - Fonctions cryptographiques

4. **Ordre d'application** : Respectez l'ordre numérique des migrations (001, 002, ...)

5. **Backup** : Toujours faire un backup avant d'appliquer des migrations en production

## 🆘 Dépannage

### Erreur: "relation already exists"
```sql
-- Solution: Utiliser DROP TABLE IF EXISTS ... CASCADE avant
DROP TABLE IF EXISTS public.ma_table CASCADE;
```

### Erreur: "function already exists"
```sql
-- Solution: Les fonctions utilisent CREATE OR REPLACE
-- Si l'erreur persiste, drop la fonction d'abord
DROP FUNCTION IF EXISTS public.ma_fonction();
```

### Erreur: "Tenant or user not found"
- Vérifiez le mot de passe
- Utilisez le pooler: `aws-1-eu-west-1.pooler.supabase.com:5432`
- Format utilisateur: `postgres.nelmhiqsoamjluadnlvd`

### Erreur: "permission denied for table"
- Vérifiez que RLS est correctement configuré
- Assurez-vous que l'utilisateur a les droits nécessaires

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs d'erreur
2. Consultez le dashboard Supabase
3. Testez d'abord en environnement de développement

---

**Dernière mise à jour** : 2026-03-04  
**Projet** : CDMS - Container Depot Management System  
**Environnement** : Supabase Production (nelmhiqsoamjluadnlvd)
