import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de connexion via pooler à Supabase
const DB_CONFIG = {
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nelmhiqsoamjluadnlvd',
  password: 's7l5RHnP9y7ZnM75',
  ssl: { rejectUnauthorized: false },
};

// Interface pour la structure de la base de données
interface DatabaseSchema {
  tables: TableSchema[];
  views: ViewSchema[];
  materializedViews: MaterializedViewSchema[];
  functions: FunctionSchema[];
  extensions: ExtensionSchema[];
  generatedAt: string;
}

interface TableSchema {
  name: string;
  description?: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  triggers: TriggerSchema[];
  constraints: ConstraintSchema[];
}

interface ColumnSchema {
  name: string;
  dataType: string;
  characterMaximumLength?: number;
  numericPrecision?: number;
  numericScale?: number;
  isNullable: boolean;
  columnDefault?: string;
  constraintType?: string;
  foreignTable?: string;
  foreignColumn?: string;
}

interface IndexSchema {
  name: string;
  definition: string;
}

interface TriggerSchema {
  name: string;
  eventManipulation: string;
  eventObjectTable: string;
  actionStatement: string;
  actionTiming: string;
}

interface ConstraintSchema {
  name: string;
  type: string;
  columnName: string;
  foreignTableName?: string;
  foreignColumnName?: string;
}

interface ViewSchema {
  name: string;
  definition: string;
  isUpdatable: boolean;
}

interface MaterializedViewSchema {
  name: string;
  definition: string;
  isPopulated: boolean;
  indexes: IndexSchema[];
}

interface FunctionSchema {
  name: string;
  kind: string;
  language: string;
}

interface ExtensionSchema {
  name: string;
  version: string;
}

async function analyzeDatabase() {
  const client = new Client(DB_CONFIG);
  const schema: DatabaseSchema = {
    tables: [],
    views: [],
    materializedViews: [],
    functions: [],
    extensions: [],
    generatedAt: new Date().toISOString(),
  };

  try {
    await client.connect();
    console.log('✅ Connecté à la base de données Supabase\n');

    // ===========================================
    // 1. TABLES
    // ===========================================
    console.log('📊 TABLES DE LA BASE DE DONNÉES\n');
    console.log('='.repeat(80));

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

    for (const table of tablesResult.rows) {
      console.log(`\n📋 Table: ${table.table_name}`);
      if (table.description) {
        console.log(`   Description: ${table.description}`);
      }

      const tableSchema: TableSchema = {
        name: table.table_name,
        description: table.description || undefined,
        columns: [],
        indexes: [],
        triggers: [],
        constraints: [],
      };

      // 2. Colonnes de chaque table
      const columnsQuery = `
        SELECT
          c.column_name,
          c.data_type,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          c.is_nullable,
          c.column_default,
          CASE
            WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PK'
            WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'FK'
            ELSE ''
          END as constraint_type,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.columns c
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON c.table_name = ccu.table_name
          AND c.column_name = ccu.column_name
        LEFT JOIN information_schema.table_constraints tc
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_name = c.table_name
        WHERE c.table_schema = 'public'
          AND c.table_name = $1
        ORDER BY c.ordinal_position;
      `;

      const columnsResult = await client.query(columnsQuery, [table.table_name]);

      console.log('   Colonnes:');
      for (const col of columnsResult.rows) {
        let colInfo = `     - ${col.column_name}: ${col.data_type}`;
        if (col.character_maximum_length) {
          colInfo += `(${col.character_maximum_length})`;
        } else if (col.numeric_precision) {
          colInfo += `(${col.numeric_precision},${col.numeric_scale || 0})`;
        }
        if (col.is_nullable === 'NO') {
          colInfo += ' NOT NULL';
        }
        if (col.column_default) {
          colInfo += ` DEFAULT ${col.column_default}`;
        }
        if (col.constraint_type) {
          colInfo += ` [${col.constraint_type}]`;
        }
        if (col.foreign_table && col.foreign_column) {
          colInfo += ` → ${col.foreign_table}.${col.foreign_column}`;
        }
        console.log(colInfo);

        tableSchema.columns.push({
          name: col.column_name,
          dataType: col.data_type,
          characterMaximumLength: col.character_maximum_length || undefined,
          numericPrecision: col.numeric_precision || undefined,
          numericScale: col.numeric_scale || undefined,
          isNullable: col.is_nullable === 'YES',
          columnDefault: col.column_default || undefined,
          constraintType: col.constraint_type || undefined,
          foreignTable: col.foreign_table || undefined,
          foreignColumn: col.foreign_column || undefined,
        });
      }

      // 3. Index de la table
      const indexQuery = `
        SELECT
          i.indexname,
          i.indexdef
        FROM pg_indexes i
        WHERE i.schemaname = 'public'
          AND i.tablename = $1
        ORDER BY i.indexname;
      `;

      const indexResult = await client.query(indexQuery, [table.table_name]);

      if (indexResult.rows.length > 0) {
        console.log('   Index:');
        for (const idx of indexResult.rows) {
          console.log(`     - ${idx.indexname}`);
          tableSchema.indexes.push({
            name: idx.indexname,
            definition: idx.indexdef,
          });
        }
      }

      // 4. Triggers de la table
      const triggerQuery = `
        SELECT
          t.trigger_name,
          t.event_manipulation,
          t.event_object_table,
          t.action_statement,
          t.action_timing
        FROM information_schema.triggers t
        WHERE t.trigger_schema = 'public'
          AND t.event_object_table = $1
        ORDER BY t.trigger_name;
      `;

      const triggerResult = await client.query(triggerQuery, [table.table_name]);

      if (triggerResult.rows.length > 0) {
        console.log('   Triggers:');
        for (const tr of triggerResult.rows) {
          console.log(`     - ${tr.trigger_name} (${tr.action_timing} ${tr.event_manipulation})`);
          tableSchema.triggers.push({
            name: tr.trigger_name,
            eventManipulation: tr.event_manipulation,
            eventObjectTable: tr.event_object_table,
            actionStatement: tr.action_statement,
            actionTiming: tr.action_timing,
          });
        }
      }

      // 5. Contraintes uniques et check
      const constraintQuery = `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type NOT IN ('PRIMARY KEY')
        ORDER BY tc.constraint_type, tc.constraint_name;
      `;

      const constraintResult = await client.query(constraintQuery, [table.table_name]);

      if (constraintResult.rows.length > 0) {
        console.log('   Contraintes:');
        for (const c of constraintResult.rows) {
          if (c.constraint_type === 'FOREIGN KEY') {
            console.log(`     - FK: ${c.column_name} → ${c.foreign_table_name}.${c.foreign_column_name}`);
          } else if (c.constraint_type === 'UNIQUE') {
            console.log(`     - UNIQUE: ${c.column_name}`);
          } else {
            console.log(`     - ${c.constraint_type}: ${c.column_name}`);
          }
          tableSchema.constraints.push({
            name: c.constraint_name,
            type: c.constraint_type,
            columnName: c.column_name,
            foreignTableName: c.foreign_table_name || undefined,
            foreignColumnName: c.foreign_column_name || undefined,
          });
        }
      }

      schema.tables.push(tableSchema);
    }

    // ===========================================
    // 6. FONCTIONS PERSONNALISÉES
    // ===========================================
    console.log('\n\n🔧 FONCTIONS PERSONNALISÉES\n');
    console.log('='.repeat(80));

    const functionsQuery = `
      SELECT
        p.proname as function_name,
        CASE p.prokind
            WHEN 'f' THEN 'FUNCTION'
            WHEN 'p' THEN 'PROCEDURE'
            WHEN 'a' THEN 'AGGREGATE'
            WHEN 'w' THEN 'WINDOW'
        END as kind,
        l.lanname as language
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      JOIN pg_language l ON p.prolang = l.oid
      WHERE n.nspname = 'public'
        AND l.lanname IN ('sql', 'plpgsql')
      ORDER BY p.proname;
    `;

    const functionsResult = await client.query(functionsQuery);

    if (functionsResult.rows.length > 0) {
      console.log(`\n📝 ${functionsResult.rows.length} fonctions trouvées:`);
      for (const fn of functionsResult.rows) {
        console.log(`   - ${fn.function_name} (${fn.kind})`);
        schema.functions.push({
          name: fn.function_name,
          kind: fn.kind,
          language: fn.language,
        });
      }
    } else {
      console.log('Aucune fonction personnalisée trouvée.');
    }

    // ===========================================
    // 7. VUES (VIEWS)
    // ===========================================
    console.log('\n\n👁️ VUES (VIEWS)\n');
    console.log('='.repeat(80));

    const viewsQuery = `
      SELECT
        v.table_name as view_name,
        v.view_definition,
        v.is_updatable
      FROM information_schema.views v
      WHERE v.table_schema = 'public'
      ORDER BY v.table_name;
    `;

    const viewsResult = await client.query(viewsQuery);

    if (viewsResult.rows.length > 0) {
      for (const view of viewsResult.rows) {
        console.log(`\n📋 Vue: ${view.view_name}`);
        console.log(`   Updatable: ${view.is_updatable ? 'Oui' : 'Non'}`);
        console.log(`   Définition: ${view.view_definition?.substring(0, 200)}...`);
        schema.views.push({
          name: view.view_name,
          definition: view.view_definition,
          isUpdatable: view.is_updatable === 'YES',
        });
      }
    } else {
      console.log('Aucune vue trouvée.');
    }

    // ===========================================
    // 8. VUES MATÉRIALISÉES (MATERIALIZED VIEWS)
    // ===========================================
    console.log('\n\n📦 VUES MATÉRIALISÉES (MATERIALIZED VIEWS)\n');
    console.log('='.repeat(80));

    const matViewsQuery = `
      SELECT
        matviewname as name,
        definition,
        ispopulated as is_populated
      FROM pg_matviews
      WHERE schemaname = 'public'
      ORDER BY matviewname;
    `;

    const matViewsResult = await client.query(matViewsQuery);

    if (matViewsResult.rows.length > 0) {
      for (const matView of matViewsResult.rows) {
        console.log(`\n📋 Vue Matérialisée: ${matView.name}`);
        console.log(`   Populated: ${matView.is_populated ? 'Oui' : 'Non'}`);
        console.log(`   Définition: ${matView.definition?.substring(0, 200)}...`);

        const matViewSchema: MaterializedViewSchema = {
          name: matView.name,
          definition: matView.definition,
          isPopulated: matView.is_populated,
          indexes: [],
        };

        // Récupérer les index de la vue matérialisée
        const matViewIndexQuery = `
          SELECT
            i.indexname,
            i.indexdef
          FROM pg_indexes i
          WHERE i.schemaname = 'public'
            AND i.tablename = $1
          ORDER BY i.indexname;
        `;

        const matViewIndexResult = await client.query(matViewIndexQuery, [matView.name]);

        if (matViewIndexResult.rows.length > 0) {
          console.log('   Index:');
          for (const idx of matViewIndexResult.rows) {
            console.log(`     - ${idx.indexname}`);
            matViewSchema.indexes.push({
              name: idx.indexname,
              definition: idx.indexdef,
            });
          }
        }

        schema.materializedViews.push(matViewSchema);
      }
    } else {
      console.log('Aucune vue matérialisée trouvée.');
    }

    // ===========================================
    // 9. EXTENSIONS
    // ===========================================
    console.log('\n\n🧩 EXTENSIONS\n');
    console.log('='.repeat(80));

    const extensionsQuery = `
      SELECT
        extname as extension_name,
        extversion as version
      FROM pg_extension
      ORDER BY extname;
    `;

    const extensionsResult = await client.query(extensionsQuery);

    for (const ext of extensionsResult.rows) {
      console.log(`- ${ext.extension_name} (v${ext.version})`);
      schema.extensions.push({
        name: ext.extension_name,
        version: ext.version,
      });
    }

    // ===========================================
    // 10. EXPORT JSON
    // ===========================================
    console.log('\n\n💾 EXPORT DU SCHÉMA JSON...\n');

    const outputDir = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, 'database-schema.json');
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2), 'utf-8');

    console.log(`✅ Schéma exporté vers: ${outputPath}`);
    console.log('\n\n✅ Analyse terminée avec succès!');

  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await client.end();
  }
}

analyzeDatabase();
