import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration de connexion à Supabase
// Option: Connection directe (port 5432) avec pooler
const DB_CONFIG = {
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nelmhiqsoamjluadnlvd',
  password: 's7l5RHnP9y7ZnM75',
  ssl: { rejectUnauthorized: false },
};

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'supabase', 'migrations', 'generated');

// Tables in dependency order (for proper migration sequencing)
const TABLE_ORDER = [
  // Core reference data (no FK dependencies)
  'container_types',
  'yards',
  'sections',

  // Users & Auth
  'users',

  // Clients
  'clients',

  // Stack management
  'stacks',
  'stack_pairings',
  'virtual_stack_pairs',

  // Location management
  'locations',
  'location_id_mappings',

  // Client pools & assignments
  'client_pools',
  'stack_assignments',

  // Containers
  'containers',
  'container_buffer_zones',

  // Booking & Operations
  'booking_references',
  'gate_in_operations',
  'gate_out_operations',

  // EDI Management
  'edi_server_configurations',
  'edi_client_settings',
  'edi_transmission_logs',

  // User module access
  'user_module_access',

  // Audit & Activity Logs
  'audit_logs',
  'location_audit_log',
  'user_activities',
  'user_login_history',
  'module_access_sync_log',
];

// Generate Supabase-compatible timestamp: YYYYMMDDHHMMSS
function generateTimestamp(baseDate: Date, offset: number): string {
  const date = new Date(baseDate.getTime() + (offset * 1000)); // Add seconds
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Sanitize filename for Supabase compatibility
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

interface Column {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number;
}

interface Constraint {
  constraint_name: string;
  constraint_type: string;
  column_name: string;
  foreign_table_name: string | null;
  foreign_column_name: string | null;
  update_rule: string | null;
  delete_rule: string | null;
}

interface Index {
  indexname: string;
  indexdef: string;
}

interface Trigger {
  trigger_name: string;
  event_manipulation: string;
  action_statement: string;
  action_timing: string;
  action_orientation: string;
}

interface TableInfo {
  table_name: string;
  description: string | null;
  columns: Column[];
  constraints: Constraint[];
  indexes: Index[];
  triggers: Trigger[];
}

interface ViewInfo {
  view_name: string;
  view_definition: string;
  is_updatable: boolean;
}

interface MaterializedViewInfo {
  matviewname: string;
  definition: string;
  ispopulated: boolean;
  indexes: Index[];
}

function mapPostgresTypeToSQL(data_type: string, col: Column): string {
  let sqlType = data_type.toUpperCase();
  
  if (data_type === 'character varying') {
    sqlType = `VARCHAR(${col.character_maximum_length || 255})`;
  } else if (data_type === 'character') {
    sqlType = `CHAR(${col.character_maximum_length || 255})`;
  } else if (data_type === 'numeric') {
    if (col.numeric_precision && col.numeric_scale) {
      sqlType = `NUMERIC(${col.numeric_precision},${col.numeric_scale})`;
    } else if (col.numeric_precision) {
      sqlType = `NUMERIC(${col.numeric_precision})`;
    } else {
      sqlType = 'NUMERIC';
    }
  } else if (data_type === 'integer' || data_type === 'bigint') {
    sqlType = data_type.toUpperCase();
  } else if (data_type === 'timestamp with time zone') {
    sqlType = 'TIMESTAMPTZ';
  } else if (data_type === 'time without time zone') {
    sqlType = 'TIME';
  } else if (data_type === 'USER-DEFINED' || data_type === 'ARRAY') {
    sqlType = data_type;
  }
  
  return sqlType;
}

function generateCreateTableSQL(table: TableInfo): string {
  let sql = `-- Table: ${table.table_name}\n`;
  if (table.description) {
    sql += `-- Description: ${table.description}\n`;
  }
  sql += `-- Generated: ${new Date().toISOString()}\n\n`;
  
  sql += `CREATE TABLE IF NOT EXISTS public.${table.table_name} (\n`;
  
  const columnDefs: string[] = [];
  for (const col of table.columns) {
    let colDef = `    ${col.column_name} ${mapPostgresTypeToSQL(col.data_type, col)}`;
    
    if (col.is_nullable === 'NO') {
      colDef += ' NOT NULL';
    }
    
    if (col.column_default && !col.column_default.includes('NEXTVAL')) {
      colDef += ` DEFAULT ${col.column_default}`;
    }
    
    columnDefs.push(colDef);
  }
  
  // Add primary key constraint
  const pkConstraints = table.constraints.filter(c => c.constraint_type === 'PRIMARY KEY');
  if (pkConstraints.length > 0) {
    const pkCols = pkConstraints.map(c => c.column_name).join(', ');
    columnDefs.push(`    CONSTRAINT ${pkConstraints[0].constraint_name} PRIMARY KEY (${pkCols})`);
  }
  
  // Add unique constraints
  const uniqueConstraints = table.constraints.filter(c => c.constraint_type === 'UNIQUE');
  for (const uc of uniqueConstraints) {
    columnDefs.push(`    CONSTRAINT ${uc.constraint_name} UNIQUE (${uc.column_name})`);
  }
  
  // Add foreign key constraints
  const fkConstraints = table.constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
  for (const fk of fkConstraints) {
    if (fk.foreign_table_name && fk.foreign_column_name) {
      columnDefs.push(`    CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name}) REFERENCES public.${fk.foreign_table_name}(${fk.foreign_column_name}) ON UPDATE ${fk.update_rule || 'NO ACTION'} ON DELETE ${fk.delete_rule || 'NO ACTION'}`);
    }
  }
  
  sql += columnDefs.join(',\n');
  sql += '\n);\n';
  
  return sql;
}

function generateIndexesSQL(table: TableInfo): string {
  let sql = `\n-- Indexes for ${table.table_name}\n`;
  
  for (const idx of table.indexes) {
    // Skip primary key indexes
    if (idx.indexname.includes('pkey')) continue;
    
    sql += `\n-- Index: ${idx.indexname}\n`;
    sql += `${idx.indexdef};\n`;
  }
  
  return sql;
}

function generateTriggersSQL(table: TableInfo): string {
  let sql = `\n-- Triggers for ${table.table_name}\n`;
  
  for (const trigger of table.triggers) {
    sql += `\n-- Trigger: ${trigger.trigger_name}\n`;
    sql += `-- Timing: ${trigger.action_timing} ${trigger.event_manipulation}\n`;
    sql += `-- ${trigger.action_statement}\n`;
  }
  
  return sql;
}

function generateRLSPoliciesSQL(tableName: string): string {
  return `\n-- RLS Policies for ${tableName}\n` +
    `-- Note: RLS policies should be reviewed and customized based on security requirements\n` +
    `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n`;
}

function generateViewsSQL(views: ViewInfo[]): string {
  if (views.length === 0) return '';

  let sql = `\n\n-- ============================================\n`;
  sql += `-- VIEWS\n`;
  sql += `-- ============================================\n`;

  for (const view of views) {
    sql += `\n-- View: ${view.view_name}`;
    sql += `\n-- Updatable: ${view.is_updatable ? 'YES' : 'NO'}\n`;
    sql += `DROP VIEW IF EXISTS public.${view.view_name} CASCADE;\n`;
    sql += `CREATE VIEW public.${view.view_name} AS\n`;
    sql += `${view.view_definition};\n`;
  }

  return sql;
}

function generateMaterializedViewsSQL(matViews: MaterializedViewInfo[]): string {
  if (matViews.length === 0) return '';

  let sql = `\n\n-- ============================================\n`;
  sql += `-- MATERIALIZED VIEWS\n`;
  sql += `-- ============================================\n`;

  for (const matView of matViews) {
    sql += `\n-- Materialized View: ${matView.matviewname}`;
    sql += `\n-- Populated: ${matView.ispopulated ? 'YES' : 'NO'}\n`;
    sql += `DROP MATERIALIZED VIEW IF EXISTS public.${matView.matviewname} CASCADE;\n`;
    sql += `CREATE MATERIALIZED VIEW public.${matView.matviewname} AS\n`;
    sql += `${matView.definition};\n`;

    // Add indexes for materialized view
    if (matView.indexes && matView.indexes.length > 0) {
      sql += `\n-- Indexes for ${matView.matviewname}\n`;
      for (const idx of matView.indexes) {
        if (idx.indexdef) {
          sql += `${idx.indexdef};\n`;
        }
      }
    }
  }

  return sql;
}

async function generateMigrations() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connecté à la base de données Supabase\n');

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Get all tables
    const tablesQuery = `
      SELECT
        t.table_name,
        obj_description((quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass::oid, 'pg_class') as description
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name;
    `;

    const tablesResult = await client.query(tablesQuery);
    const tables: TableInfo[] = [];

    for (const tableRow of tablesResult.rows) {
      const table: TableInfo = {
        table_name: tableRow.table_name,
        description: tableRow.description,
        columns: [],
        constraints: [],
        indexes: [],
        triggers: []
      };

      // Get columns
      const columnsQuery = `
        SELECT
          column_name, data_type, character_maximum_length,
          numeric_precision, numeric_scale, is_nullable,
          column_default, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `;
      table.columns = (await client.query(columnsQuery, [table.table_name])).rows;

      // Get constraints
      const constraintsQuery = `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        LEFT JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_schema = 'public' AND tc.table_name = $1
        ORDER BY tc.constraint_type, tc.constraint_name;
      `;
      table.constraints = (await client.query(constraintsQuery, [table.table_name])).rows;

      // Get indexes
      const indexesQuery = `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = $1
        ORDER BY indexname;
      `;
      table.indexes = (await client.query(indexesQuery, [table.table_name])).rows;

      // Get triggers
      const triggersQuery = `
        SELECT
          trigger_name, event_manipulation, action_statement,
          action_timing, action_orientation
        FROM information_schema.triggers
        WHERE trigger_schema = 'public' AND event_object_table = $1
        ORDER BY trigger_name;
      `;
      table.triggers = (await client.query(triggersQuery, [table.table_name])).rows;

      tables.push(table);
    }

    console.log(`📊 ${tables.length} tables trouvées\n`);

    // Get all VIEWS
    console.log('🔍 Récupération des VUES...');
    const viewsQuery = `
      SELECT
        table_name as view_name,
        view_definition,
        is_updatable
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    const views: ViewInfo[] = (await client.query(viewsQuery)).rows;
    console.log(`📊 ${views.length} vues trouvées\n`);

    // Get all MATERIALIZED VIEWS
    console.log('🔍 Récupération des VUES MATÉRIALISÉES...');
    const matViewsQuery = `
      SELECT
        matviewname,
        definition,
        ispopulated
      FROM pg_matviews
      WHERE schemaname = 'public'
      ORDER BY matviewname;
    `;
    const matViewsResult = await client.query(matViewsQuery);
    const matViews: MaterializedViewInfo[] = [];

    for (const matView of matViewsResult.rows) {
      const matViewInfo: MaterializedViewInfo = {
        matviewname: matView.matviewname,
        definition: matView.definition,
        ispopulated: matView.ispopulated,
        indexes: []
      };

      // Get indexes for materialized view
      const matViewIndexesQuery = `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = $1
        ORDER BY indexname;
      `;
      matViewInfo.indexes = (await client.query(matViewIndexesQuery, [matView.matviewname])).rows;

      matViews.push(matViewInfo);
    }
    console.log(`📊 ${matViews.length} vues matérialisées trouvées\n`);

    // Base timestamp for all migrations
    const baseTime = new Date();
    let timestampOffset = 0;

    // Generate individual table migrations (in dependency order)
    for (const tableName of TABLE_ORDER) {
      const table = tables.find(t => t.table_name === tableName);
      if (!table) {
        console.log(`⚠️  Table non trouvée: ${tableName} (ignorée)`);
        continue;
      }

      let migrationSQL = `-- Migration: Create ${table.table_name} table\n`;
      migrationSQL += `-- Generated: ${new Date().toISOString()}\n\n`;
      migrationSQL += `BEGIN;\n\n`;

      migrationSQL += generateCreateTableSQL(table);
      migrationSQL += generateIndexesSQL(table);
      migrationSQL += generateTriggersSQL(table);
      migrationSQL += generateRLSPoliciesSQL(table.table_name);

      migrationSQL += `\nCOMMIT;\n`;

      // Generate Supabase-compatible filename with timestamp
      const timestamp = generateTimestamp(baseTime, timestampOffset + 4); // Offset after schema, views, functions
      const sanitizedName = sanitizeFilename(table.table_name);
      const fileName = `${timestamp}_${sanitizedName}.sql`;

      const filePath = path.join(OUTPUT_DIR, fileName);
      fs.writeFileSync(filePath, migrationSQL);
      console.log(`✅ Généré: ${fileName}`);

      timestampOffset++;
    }

    // Generate consolidated schema migration (timestamp 000000)
    let consolidatedSQL = `-- Consolidated Schema Migration\n`;
    consolidatedSQL += `-- Generated: ${new Date().toISOString()}\n`;
    consolidatedSQL += `-- This file contains the complete schema from Supabase production database\n\n`;
    consolidatedSQL += `BEGIN;\n\n`;

    for (const table of tables) {
      consolidatedSQL += `\n-- ============================================\n`;
      consolidatedSQL += `-- Table: ${table.table_name}\n`;
      consolidatedSQL += `-- ============================================\n\n`;
      consolidatedSQL += generateCreateTableSQL(table);
      consolidatedSQL += generateIndexesSQL(table);
      consolidatedSQL += generateTriggersSQL(table);
      consolidatedSQL += generateRLSPoliciesSQL(table.table_name);
      consolidatedSQL += `\n`;
    }

    // Add views to consolidated schema
    consolidatedSQL += generateViewsSQL(views);

    // Add materialized views to consolidated schema
    consolidatedSQL += generateMaterializedViewsSQL(matViews);

    consolidatedSQL += `\nCOMMIT;\n`;

    const consolidatedTimestamp = generateTimestamp(baseTime, 0);
    const consolidatedPath = path.join(OUTPUT_DIR, `${consolidatedTimestamp}_consolidated_schema.sql`);
    fs.writeFileSync(consolidatedPath, consolidatedSQL);
    console.log(`\n✅ Généré: ${consolidatedTimestamp}_consolidated_schema.sql`);

    // Generate views & materialized views migration (timestamp 000002)
    let viewsSQL = `-- Views & Materialized Views Migration\n`;
    viewsSQL += `-- Generated: ${new Date().toISOString()}\n\n`;
    viewsSQL += `BEGIN;\n`;
    viewsSQL += generateViewsSQL(views);
    viewsSQL += generateMaterializedViewsSQL(matViews);
    viewsSQL += `\nCOMMIT;\n`;

    const viewsTimestamp = generateTimestamp(baseTime, 2);
    const viewsPath = path.join(OUTPUT_DIR, `${viewsTimestamp}_views_and_materialized_views.sql`);
    fs.writeFileSync(viewsPath, viewsSQL);
    console.log(`✅ Généré: ${viewsTimestamp}_views_and_materialized_views.sql (${views.length} vues + ${matViews.length} matérialisées)`);

    // Generate functions migration (timestamp 000003)
    const functionsQuery = `
      SELECT
        p.proname as function_name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname = 'public'
        AND l.lanname IN ('sql', 'plpgsql')
      ORDER BY p.proname;
    `;

    const functionsResult = await client.query(functionsQuery);

    if (functionsResult.rows.length > 0) {
      let functionsSQL = `-- Custom Functions Migration\n`;
      functionsSQL += `-- Generated: ${new Date().toISOString()}\n\n`;
      functionsSQL += `BEGIN;\n\n`;

      for (const fn of functionsResult.rows) {
        functionsSQL += `\n-- Function: ${fn.function_name}\n`;
        functionsSQL += `${fn.definition};\n\n`;
      }

      functionsSQL += `COMMIT;\n`;

      const functionsTimestamp = generateTimestamp(baseTime, 3);
      const functionsPath = path.join(OUTPUT_DIR, `${functionsTimestamp}_custom_functions.sql`);
      fs.writeFileSync(functionsPath, functionsSQL);
      console.log(`✅ Généré: ${functionsTimestamp}_custom_functions.sql (${functionsResult.rows.length} fonctions)`);
    }

    console.log(`\n🎉 Migrations générées avec succès dans: ${OUTPUT_DIR}`);
    console.log(`\n📁 Fichiers générés (format Supabase):`);
    console.log(`   - ${generateTimestamp(baseTime, 0)}_consolidated_schema.sql (schéma complet avec tables, vues et vues matérialisées)`);
    console.log(`   - ${generateTimestamp(baseTime, 2)}_views_and_materialized_views.sql (vues et vues matérialisées)`);
    console.log(`   - ${generateTimestamp(baseTime, 3)}_custom_functions.sql (fonctions personnalisées)`);
    console.log(`   - ${generateTimestamp(baseTime, 4)}_*.sql à ${generateTimestamp(baseTime, TABLE_ORDER.length + 3)}_*.sql (tables individuelles)`);
    console.log(`\n📋 Les migrations sont dans l'ordre de dépendance et prêtes à être appliquées.`);

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await client.end();
  }
}

generateMigrations();
