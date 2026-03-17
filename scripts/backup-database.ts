import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurations
const DB_TEST_CONFIG = {
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nelmhiqsoamjluadnlvd',
  password: 's7l5RHnP9y7ZnM75',
  ssl: { rejectUnauthorized: false },
};

const DB_PROD_CONFIG = {
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.lveqqmkyludigtgfqmwl',
  password: 'W3VwHQEMtSDDgY3V',
  ssl: { rejectUnauthorized: false },
};

const EXCLUDED_TABLES = [
  'audit_log_entries', 'flow_state', 'identities', 'instances',
  'mfa_amr_claims', 'mfa_challenges', 'mfa_factors', 'one_time_tokens',
  'refresh_tokens', 'saml_providers', 'saml_relay_states', 'schema_migrations',
  'sessions', 'users', 'buckets', 'objects', 'migrations',
];

const TABLE_ORDER = [
  'clients', 'yards', 'sections', 'stacks', 'stack_pairings',
  'virtual_stack_pairs', 'container_types', 'locations', 'location_id_mappings',
  'edi_server_configurations',
  'client_pools', 'stack_assignments', 'booking_references',
  'gate_in_operations', 'gate_out_operations',
  'containers', 'container_buffer_zones',
  'edi_client_settings', 'edi_transmission_logs', 'edi_notifications',
  'gate_in_edi_details', 'gate_in_transport_info', 'gate_in_damage_assessments',
  'gate_out_edi_details', 'gate_out_transport_info',
  'audit_logs', 'location_audit_log', 'user_activities', 'user_login_history',
  'user_module_access', 'module_access_sync_log',
];

function createInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function askQuestion(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer));
  });
}

async function selectEnvironment(rl: readline.Interface) {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         SÉLECTION DE L\'ENVIRONNEMENT                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log('   1. 🧪 TEST / QUALIFICATION (eu-west-1)');
  console.log('   2. 🟢 PRODUCTION (us-east-1)\n');

  const answer = await askQuestion(rl, 'Choisissez un environnement (1 ou 2): ');

  if (answer === '2') {
    console.log('\n✅ Environnement: PRODUCTION\n');
    return { config: DB_PROD_CONFIG, name: 'PRODUCTION' };
  }
  console.log('\n✅ Environnement: TEST / QUALIFICATION\n');
  return { config: DB_TEST_CONFIG, name: 'TEST' };
}

function escapeIdentifier(identifier: string): string {
  // Nettoyer les caractères problématiques
  const cleanIdentifier = identifier
    .replace(/[\r\n\t]/g, '')  // Supprimer les sauts de ligne et tabulations
    .replace(/\s+/g, '_')      // Remplacer les espaces multiples par _
    .replace(/[^a-zA-Z0-9_]/g, '_'); // Garder uniquement les caractères valides

  return `"${cleanIdentifier.replace(/"/g, '""')}"`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLES
// ─────────────────────────────────────────────────────────────────────────────

async function getTables(client: Client): Promise<any[]> {
  const excludeList = [...EXCLUDED_TABLES, ...TABLE_ORDER].map(t => `'${t}'`).join(',');
  const query = `
    SELECT table_schema as schema, table_name as name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    AND table_name NOT IN (${excludeList})
    ORDER BY table_name;
  `;
  const result = await client.query(query);
  return result.rows.map((row: any) => ({ schema: row.schema, name: row.name }));
}

async function getColumns(client: Client, tableName: string): Promise<any[]> {
  const query = `
    SELECT
      c.column_name, c.data_type, c.udt_name, c.character_maximum_length,
      c.numeric_precision, c.numeric_scale, c.is_nullable, c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
    FROM information_schema.columns c
    LEFT JOIN (
      SELECT ku.column_name FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1
    ) pk ON c.column_name = pk.column_name
    WHERE c.table_schema = 'public' AND c.table_name = $1
    ORDER BY c.ordinal_position;
  `;
  const result = await client.query(query, [tableName]);
  return result.rows;
}

async function getConstraints(client: Client, tableName: string): Promise<any[]> {
  const queries = [
    `SELECT conname, 'FOREIGN KEY' as contype, pg_get_constraintdef(oid) as condef
     FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'f'`,
    `SELECT conname, 'UNIQUE' as contype, pg_get_constraintdef(oid) as condef
     FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'u'`,
  ];
  const constraints: any[] = [];
  for (const query of queries) {
    try {
      const result = await client.query(query, [tableName]);
      constraints.push(...result.rows);
    } catch (error: any) {
      console.log(`   ⚠️  Contraintes ${tableName}: ${error.message}`);
    }
  }
  return constraints;
}

async function getIndexes(client: Client, tableName: string): Promise<string[]> {
  const query = `
    SELECT indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
    AND indexname NOT LIKE '%_pkey';
  `;
  const result = await client.query(query, [tableName]);
  return result.rows.map((row: any) => row.indexdef);
}

async function getTableData(client: Client, tableName: string): Promise<any[]> {
  const escapedTable = await escapeIdentifier(tableName);
  const result = await client.query(`SELECT * FROM public.${escapedTable}`);
  return result.rows;
}

async function getColumnTypes(client: Client, tableName: string): Promise<Map<string, string>> {
  const query = `
    SELECT column_name, data_type, udt_name, character_maximum_length, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position;
  `;
  const result = await client.query(query, [tableName]);
  const typeMap = new Map<string, string>();
  for (const row of result.rows) {
    let dataType = row.udt_name || row.data_type;
    if (row.data_type === 'ARRAY') dataType = 'text[]';
    else if (dataType === 'varchar' && row.character_maximum_length) dataType = `varchar(${row.character_maximum_length})`;
    else if (dataType === 'numeric' && row.numeric_precision) dataType = `numeric(${row.numeric_precision},${row.numeric_scale || 0})`;
    typeMap.set(row.column_name, dataType);
  }
  return typeMap;
}

function formatValue(value: any, dataType: string): string {
  if (value === null) return 'NULL';
  const baseType = dataType.split('(')[0];

  switch (baseType) {
    case 'bool': return value ? 'true' : 'false';
    case 'int2': case 'int4': case 'int8': case 'float4': case 'float8': case 'numeric':
      return value.toString();
    case 'bytea':
      return Buffer.isBuffer(value) ? `E'\\\\x${value.toString('hex')}'` : `E'\\\\x${value}'`;
    case 'json': case 'jsonb':
      const jsonStr = JSON.stringify(value).replace(/'/g, "''");
      return `'${jsonStr}'::${baseType}`;
    case 'date':
      return value instanceof Date ? `'${value.toISOString().split('T')[0]}'` : `'${value}'`;
    case 'time': case 'timetz': case 'timestamp': case 'timestamptz':
      if (value instanceof Date) {
        const iso = value.toISOString();
        return `'${iso.replace('T', ' ').replace('Z', '+00')}'`;
      }
      return `'${value.toString().replace(/'/g, "''")}'`;
    case 'text[]': case '_text': case '_varchar': case '_int4': case '_uuid': case '_bool':
      if (Array.isArray(value)) {
        const elements = value.map((v: any) => {
          if (v === null) return 'NULL';
          if (typeof v === 'string') {
            const str = v.replace(/"/g, '""').replace(/'/g, "''");
            return `'${str}'`;
          }
          return v;
        });
        return `ARRAY[${elements.join(', ')}]`;
      }
      return `'${value.toString().replace(/'/g, "''")}'`;
    case 'uuid': return `'${value}'`;
    default: return `'${value.toString().replace(/'/g, "''")}'`;
  }
}

async function generateInsertStatement(tableName: string, row: any, columnTypes: Map<string, string>): Promise<string> {
  const columns = Object.keys(row);
  const escapedTable = await escapeIdentifier(tableName);
  const escapedColumns = await Promise.all(columns.map(col => escapeIdentifier(col)));
  const values = columns.map(col => formatValue(row[col], columnTypes.get(col) || 'text'));
  return `INSERT INTO public.${escapedTable} (${escapedColumns.join(', ')}) VALUES (${values.join(', ')});`;
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEWS & MATERIALIZED VIEWS
// ─────────────────────────────────────────────────────────────────────────────

async function getViews(client: Client): Promise<any[]> {
  // Regular views
  const viewsQuery = `
    SELECT table_name as name, 'VIEW' as view_type
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `;

  // Materialized views
  const matViewsQuery = `
    SELECT matviewname as name, 'MATERIALIZED' as view_type
    FROM pg_matviews
    WHERE schemaname = 'public'
    ORDER BY matviewname;
  `;

  const viewsResult = await client.query(viewsQuery);
  const matViewsResult = await client.query(matViewsQuery);

  const views = viewsResult.rows.map((row: any) => ({ name: row.name, view_type: row.view_type }));
  const matViews = matViewsResult.rows.map((row: any) => ({ name: row.name, view_type: row.view_type }));

  console.log(`      • ${views.length} views standards`);
  console.log(`      • ${matViews.length} materialized views`);

  return [...views, ...matViews];
}

async function getViewDefinition(client: Client, viewName: string, isMaterialized: boolean): Promise<string> {
  if (isMaterialized) {
    const matQuery = `
      SELECT definition FROM pg_matviews
      WHERE schemaname = 'public' AND matviewname = $1;
    `;
    try {
      const result = await client.query(matQuery, [viewName]);
      if (result.rows.length > 0) {
        return result.rows[0].definition;
      }
    } catch (error: any) {
      console.log(`   ⚠️  MatView ${viewName}: ${error.message}`);
    }
  } else {
    const query = `
      SELECT definition FROM pg_views
      WHERE schemaname = 'public' AND viewname = $1;
    `;
    try {
      const result = await client.query(query, [viewName]);
      if (result.rows.length > 0) {
        return result.rows[0].definition;
      }
    } catch (error: any) {
      console.log(`   ⚠️  View ${viewName}: ${error.message}`);
    }
  }
  return '';
}

async function getMaterializedViewIndexes(client: Client, matViewName: string): Promise<string[]> {
  const query = `
    SELECT indexdef FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1;
  `;
  const result = await client.query(query, [matViewName]);
  return result.rows.map((row: any) => row.indexdef);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function getFunctions(client: Client): Promise<any[]> {
  const query = `
    SELECT
      p.proname as name,
      pg_get_function_identity_arguments(p.oid) as args,
      pg_get_functiondef(p.oid) as definition,
      l.lanname as language
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_language l ON p.prolang = l.oid
    WHERE n.nspname = 'public'
      AND l.lanname IN ('sql', 'plpgsql')
    ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);
  `;
  const result = await client.query(query);
  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGERS
// ─────────────────────────────────────────────────────────────────────────────

async function getTriggers(client: Client): Promise<any[]> {
  const query = `
    SELECT
      tg.tgname as trigger_name,
      c.relname as event_object_table,
      pg_get_triggerdef(tg.oid) as definition
    FROM pg_trigger tg
    JOIN pg_class c ON tg.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND NOT tg.tgisinternal
    ORDER BY tg.tgname;
  `;
  const result = await client.query(query);
  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEQUENCES
// ─────────────────────────────────────────────────────────────────────────────

async function getSequences(client: Client): Promise<any[]> {
  const query = `
    SELECT schemaname, sequencename, last_value, start_value, increment_by
    FROM pg_sequences
    WHERE schemaname = 'public'
    ORDER BY sequencename;
  `;
  const result = await client.query(query);
  return result.rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

async function getCustomTypes(client: Client): Promise<any[]> {
  const query = `
    SELECT
      t.typname as name,
      pg_catalog.format_type(t.oid, NULL) as format,
      CASE t.typtype
        WHEN 'e' THEN 'ENUM'
        WHEN 'c' THEN 'COMPOSITE'
        WHEN 'd' THEN 'DOMAIN'
        ELSE 'OTHER'
      END as type_kind
    FROM pg_type t
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typtype IN ('e', 'c', 'd')
    ORDER BY t.typname;
  `;
  const result = await client.query(query);
  return result.rows;
}

async function getEnumValues(client: Client, typeName: string): Promise<string[]> {
  const query = `
    SELECT e.enumlabel
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = $1
    ORDER BY e.enumsortorder;
  `;
  const result = await client.query(query, [typeName]);
  return result.rows.map((row: any) => row.enumlabel);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BACKUP FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

async function backupDatabase() {
  const rl = createInterface();

  try {
    const { config: dbConfig, name: envName } = await selectEnvironment(rl);

    const client = new Client(dbConfig);
    const backupDir = path.join(__dirname, '..', 'database backup');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFileName = `backup-${envName === 'PRODUCTION' ? 'PROD' : 'TEST'}-${timestamp}.sql`;
    const backupPath = path.join(backupDir, backupFileName);

    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    await client.connect();
    console.log('🔌 Connexion à la base de données...\n');
    console.log('═'.repeat(80));
    console.log('💾 BACKUP COMPLET DE LA BASE DE DONNÉES');
    console.log(`🌍 Environnement: ${envName}`);
    console.log('═'.repeat(80));
    console.log();

    let sqlContent = `-- ================================================================
-- BACKUP COMPLET DE LA BASE DE DONNÉES
-- Date: ${new Date().toISOString()}
-- Environnement: ${envName}
-- Serveur: ${dbConfig.host}
-- Base: ${dbConfig.database}
-- ================================================================
-- Ce fichier contient:
--   • Tables (structure + données)
--   • Views & Materialized Views
--   • Functions
--   • Triggers
--   • Sequences
--   • Custom Types (ENUM, DOMAIN, COMPOSITE)
-- ================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

-- ================================================================
-- 1. CUSTOM TYPES (ENUM, DOMAIN, COMPOSITE)
-- ================================================================

`;

    // Custom Types
    console.log('1️⃣ Récupération des types personnalisés...\n');
    const types = await getCustomTypes(client);
    for (const type of types) {
      if (type.type_kind === 'ENUM') {
        const values = await getEnumValues(client, type.name);
        sqlContent += `DROP TYPE IF EXISTS public."${type.name}" CASCADE;\n`;
        sqlContent += `CREATE TYPE public."${type.name}" AS ENUM (${values.map(v => `'${v}'`).join(', ')});\n\n`;
        process.stdout.write(`      • ${type.name} (ENUM)\n`);
      } else if (type.type_kind === 'DOMAIN') {
        sqlContent += `-- Domain: ${type.name} (à recréer manuellement si nécessaire)\n\n`;
      }
    }
    console.log(`   📊 ${types.length} types trouvés\n`);

    // Drop Tables
    console.log('2️⃣ Préparation des tables...\n');
    const tables = await getTables(client);
    const allTables = [...TABLE_ORDER, ...tables.map(t => t.name)].filter((t, i, a) => a.indexOf(t) === i);

    for (const table of allTables) {
      sqlContent += `DROP TABLE IF EXISTS public."${table}" CASCADE;\n`;
    }
    console.log(`   📊 ${allTables.length} tables à sauvegarder\n`);

    // Drop Views
    console.log('3️⃣ Préparation des vues...\n');
    const views = await getViews(client);
    for (const view of views) {
      sqlContent += `DROP ${view.view_type} VIEW IF EXISTS public."${view.name}" CASCADE;\n`;
    }
    console.log(`   📊 ${views.length} vues trouvées\n`);

    sqlContent += `
-- ================================================================
-- 2. STRUCTURE DES TABLES
-- ================================================================

`;

    console.log('4️⃣ Génération de la structure des tables...\n');
    for (const tableName of allTables) {
      process.stdout.write(`      • ${tableName}...\n`);

      const columns = await getColumns(client, tableName);
      const constraints = await getConstraints(client, tableName);

      const escapedTable = await escapeIdentifier(tableName);
      sqlContent += `\nCREATE TABLE public.${escapedTable} (\n`;

      const columnDefs = columns.map((col: any) => {
        let type = col.udt_name || col.data_type;
        if (type === '_text') type = 'text[]';
        if (type === '_varchar') type = 'varchar[]';
        if (type === '_int4') type = 'integer[]';
        if (type === '_bool') type = 'boolean[]';
        if (type === '_uuid') type = 'uuid[]';
        if (type === 'varchar' && col.character_maximum_length) type = `varchar(${col.character_maximum_length})`;
        else if (type === 'numeric' && col.numeric_precision) type = `numeric(${col.numeric_precision},${col.numeric_scale || 0})`;

        let def = `  "${col.column_name}" ${type}`;
        if (col.column_default) {
          let defaultVal = col.column_default;
          if (defaultVal.includes('ARRAY[') && !defaultVal.endsWith(']')) {
            defaultVal = defaultVal.replace(/::\w+\[\]?$/, '') + ']';
          }
          def += ` DEFAULT ${defaultVal}`;
        }
        if (col.is_nullable === 'NO') def += ' NOT NULL';
        return def;
      });

      sqlContent += columnDefs.join(',\n');

      if (constraints.length > 0) {
        const constraintDefs = constraints.map((c: any) => {
          if (c.contype === 'FOREIGN KEY') return `  CONSTRAINT "${c.conname}" ${c.condef}`;
          else if (c.contype === 'UNIQUE') return `  CONSTRAINT "${c.conname}" ${c.condef}`;
          return '';
        }).filter((d: string) => d);

        if (constraintDefs.length > 0) sqlContent += ',\n' + constraintDefs.join(',\n');
      }

      sqlContent += '\n);\n';

      const indexes = await getIndexes(client, tableName);
      for (const idx of indexes) sqlContent += `${idx};\n`;
    }

    sqlContent += `
-- ================================================================
-- 3. VIEWS & MATERIALIZED VIEWS
-- ================================================================

`;

    console.log('\n5️⃣ Génération des vues...\n');
    for (const view of views) {
      process.stdout.write(`      • ${view.name} (${view.view_type})...\n`);

      const definition = await getViewDefinition(client, view.name, view.view_type === 'MATERIALIZED');
      if (definition) {
        if (view.view_type === 'MATERIALIZED') {
          sqlContent += `\nCREATE MATERIALIZED VIEW public."${view.name}" AS\n${definition};\n`;
          // Indexes for materialized views
          const matIndexes = await getMaterializedViewIndexes(client, view.name);
          for (const idx of matIndexes) sqlContent += `${idx};\n`;
        } else {
          sqlContent += `\nCREATE VIEW public."${view.name}" AS\n${definition};\n`;
        }
      }
    }

    sqlContent += `
-- ================================================================
-- 4. FUNCTIONS
-- ================================================================

`;

    console.log('\n6️⃣ Génération des fonctions...\n');
    const functions = await getFunctions(client);
    for (const fn of functions) {
      process.stdout.write(`      • ${fn.name}(${fn.args || ''})...\n`);
      sqlContent += `\n${fn.definition};\n`;
    }
    console.log(`   📊 ${functions.length} fonctions trouvées\n`);

    sqlContent += `
-- ================================================================
-- 5. TRIGGERS
-- ================================================================

`;

    console.log('7️⃣ Génération des triggers...\n');
    const triggers = await getTriggers(client);
    for (const trigger of triggers) {
      if (trigger.definition) {
        process.stdout.write(`      • ${trigger.trigger_name} sur ${trigger.event_object_table}...\n`);
        sqlContent += `\n${trigger.definition};\n`;
      }
    }
    console.log(`   📊 ${triggers.length} triggers trouvés\n`);

    sqlContent += `
-- ================================================================
-- 6. DONNÉES DES TABLES
-- ================================================================

`;

    console.log('\n8️⃣ Génération des données...\n');
    let totalRows = 0;

    // Désactiver temporairement les triggers pendant l'insertion
    sqlContent += `-- Désactiver les triggers pendant l'insertion\n`;
    for (const table of allTables) {
      sqlContent += `ALTER TABLE public."${table}" DISABLE TRIGGER ALL;\n`;
    }

    for (const tableName of allTables) {
      process.stdout.write(`      📥 ${tableName}...\n`);

      const rows = await getTableData(client, tableName);

      if (rows.length === 0) {
        process.stdout.write(`      ⚪ (vide)\n`);
        continue;
      }

      const columnTypes = await getColumnTypes(client, tableName);
      for (const row of rows) {
        const insertStatement = await generateInsertStatement(tableName, row, columnTypes);
        sqlContent += `${insertStatement}\n`;
      }

      totalRows += rows.length;
    }

    // Réactiver les triggers
    sqlContent += `-- Réactiver les triggers\n`;
    for (const table of allTables) {
      sqlContent += `ALTER TABLE public."${table}" ENABLE TRIGGER ALL;\n`;
    }

    // Refresh materialized views after data insert
    const materializedViews = views.filter(v => v.view_type === 'MATERIALIZED');
    if (materializedViews.length > 0) {
      sqlContent += `
-- Refresh Materialized Views (after data insert)
`;
      for (const mv of materializedViews) {
        sqlContent += `REFRESH MATERIALIZED VIEW public."${mv.name}";\n`;
      }
    }

    sqlContent += `
-- ================================================================
-- 7. SÉQUENCES
-- ================================================================

`;

    console.log('\n9️⃣ Génération des séquences...\n');
    const sequences = await getSequences(client);
    for (const seq of sequences) {
      const escapedSeq = await escapeIdentifier(seq.sequencename);
      sqlContent += `SELECT setval('public.${escapedSeq}', ${seq.last_value}, true);\n`;
      process.stdout.write(`      • ${seq.sequencename} = ${seq.last_value}\n`);
    }
    console.log(`   📊 ${sequences.length} séquences trouvées\n`);

    sqlContent += `
-- ================================================================
-- 8. ROW LEVEL SECURITY
-- ================================================================

`;

    for (const table of allTables) {
      sqlContent += `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;\n`;
    }

    sqlContent += `
-- ================================================================
-- FIN DU BACKUP
-- ================================================================
`;

    fs.writeFileSync(backupPath, sqlContent, 'utf-8');
    const fileSize = (fs.statSync(backupPath).size / (1024 * 1024)).toFixed(2);

    const materializedViewCount = views.filter(v => v.view_type === 'MATERIALIZED').length;
    const regularViewCount = views.length - materializedViewCount;

    console.log('\n' + '═'.repeat(80));
    console.log('✅ BACKUP TERMINÉ AVEC SUCCÈS');
    console.log('═'.repeat(80));
    console.log(`\n📊 Résumé:`);
    console.log(`   • ${allTables.length} tables sauvegardées`);
    console.log(`   • ${regularViewCount} vues + ${materializedViewCount} matérialisées`);
    console.log(`   • ${functions.length} fonctions`);
    console.log(`   • ${triggers.length} triggers`);
    console.log(`   • ${sequences.length} séquences`);
    console.log(`   • ${totalRows} lignes exportées`);
    console.log(`\n📁 Fichier de backup:`);
    console.log(`   • Chemin: ${backupPath}`);
    console.log(`   • Taille: ${fileSize} MB`);
    console.log(`   • Environnement: ${envName}`);
    console.log('\n');

    await client.end();
  } catch (error: any) {
    console.error('\n❌ Erreur critique:', error.message);
    if (error.detail) console.error('   Détail:', error.detail);
  } finally {
    rl.close();
  }
}

backupDatabase();
