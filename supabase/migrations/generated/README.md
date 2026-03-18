# Migrations Supabase - CDMS (Générées)

Ce dossier contient les fichiers de migration **générés automatiquement** depuis la base de données Supabase en production.

## ⚠️ Important

**Les fichiers dans ce dossier sont régénérés automatiquement** à chaque exécution de `npx tsx scripts/generate-migrations.ts`.

Pour les migrations de production, utilisez les fichiers dans `supabase/migrations/` à la racine :
- `20260304000000_consolidated_schema.sql`
- `20260304000001_functions_and_triggers.sql`

## 📁 Structure des fichiers générés

Tous les fichiers suivent le format Supabase : `YYYYMMDDHHMMSS_description.sql`

### Fichiers principaux

| Fichier | Description |
|---------|-------------|
| `*_consolidated_schema.sql` | Schéma complet (toutes les tables) |
| `*_custom_functions.sql` | 84 fonctions personnalisées |

### Tables individuelles (ordre de dépendance)

| Timestamp | Table | Description |
|-----------|-------|-------------|
| *_144330 | container_types | Types de conteneurs (aucune FK) |
| *_144331 | yards | Dépôts/terrains (aucune FK) |
| *_144332 | sections | Sections dans les yards |
| *_144333 | users | Utilisateurs |
| *_144334 | clients | Clients |
| *_144335 | stacks | Pistes de stockage |
| *_144336 | stack_pairings | Pairing de pistes |
| *_144337 | virtual_stack_pairs | Paires virtuelles |
| *_144338 | locations | Emplacements |
| *_144339 | location_id_mappings | Mapping IDs legacy |
| *_144340 | client_pools | Pools clients |
| *_144341 | stack_assignments | Assignations pistes |
| *_144342 | containers | Conteneurs |
| *_144343 | container_buffer_zones | Zone tampon |
| *_144344 | booking_references | Réservations |
| *_144345 | gate_in_operations | Opérations entrée |
| *_144346 | gate_out_operations | Opérations sortie |
| *_144347 | edi_server_configurations | Config serveurs EDI |
| *_144348 | edi_client_settings | Settings EDI clients |
| *_144349 | edi_transmission_logs | Logs transmission EDI |
| *_144350 | user_module_access | Accès modules |
| *_144351 | audit_logs | Audit logs |
| *_144352 | location_audit_log | Audit locations |
| *_144353 | user_activities | Activités utilisateurs |
| *_144354 | user_login_history | Historique connexions |
| *_144355 | module_access_sync_log | Logs synchronisation |

## 🔧 Comment utiliser ces migrations

### Pour développement / test

```bash
# Appliquer le schéma complet généré
npx supabase db push --file supabase/migrations/generated/20260304144330_consolidated_schema.sql
```

### Pour production

**N'utilisez PAS les fichiers générés pour la production.** Utilisez plutôt :

```bash
# Migrations validées et versionnées
npx supabase db push --file supabase/migrations/20260304000000_consolidated_schema.sql
npx supabase db push --file supabase/migrations/20260304000001_functions_and_triggers.sql
```

## 🔄 Régénérer les migrations

```bash
npx tsx scripts/generate-migrations.ts
```

**Le générateur produit automatiquement :**
- ✅ Timestamp au format `YYYYMMDDHHMMSS`
- ✅ Ordre de dépendance respecté (tables sans FK d'abord)
- ✅ Noms de fichiers sanitizés (minuscules, underscores)
- ✅ Prêt pour Supabase CLI

## 📊 Tables générées (26 tables)

### Core Business
- `container_types`, `yards`, `sections`
- `stacks`, `stack_pairings`, `virtual_stack_pairs`
- `locations`, `location_id_mappings`
- `containers`, `container_buffer_zones`

### Clients & Pools
- `clients`, `client_pools`, `stack_assignments`

### Opérations
- `booking_references`, `gate_in_operations`, `gate_out_operations`

### EDI Management
- `edi_server_configurations`, `edi_client_settings`, `edi_transmission_logs`

### Users & Auth
- `users`, `user_module_access`, `user_activities`, `user_login_history`, `module_access_sync_log`

### Audit
- `audit_logs`, `location_audit_log`

## ⚠️ Notes importantes

1. **Fichiers temporaires** : Ce dossier est pour les migrations générées automatiquement. Les fichiers peuvent être écrasés à tout moment.

2. **RLS (Row Level Security)** : Les politiques RLS sont activées mais doivent être personnalisées.

3. **Triggers** : Certains triggers peuvent nécessiter des ajustements selon l'environnement.

4. **Backup** : Toujours faire un backup avant d'appliquer des migrations en production.

## 🆘 Dépannage

### Erreur: "relation already exists"
```sql
DROP TABLE IF EXISTS public.ma_table CASCADE;
```

### Erreur: "function already exists"
```sql
DROP FUNCTION IF EXISTS public.ma_fonction();
```

### Fichiers en double
Si vous voyez des fichiers en double, supprimez les anciens :
```bash
# Dans supabase/migrations/generated
del *_old.sql
```

---

**Dernière génération** : Automatique (voir timestamp des fichiers)  
**Source** : Supabase Production (nelmhiqsoamjluadnlvd)  
**Outil** : scripts/generate-migrations.ts
