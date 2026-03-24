import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_CONFIG = {
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.nelmhiqsoamjluadnlvd',
  password: 's7l5RHnP9y7ZnM75',
  ssl: { rejectUnauthorized: false },
};

async function runMigration() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('🔌 Connexion à la base de données...\n');
    console.log('═'.repeat(80));
    console.log('📦 MIGRATION EDI SCHEMA FIXES');
    console.log('═'.repeat(80));
    console.log();

    // Lire le fichier SQL
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260317000001_edi_schema_fixes.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Fichier de migration:', migrationPath);
    console.log();
    console.log('⚙️  Exécution de la migration...\n');

    // Vérifier si la migration a déjà été appliquée
    const checkColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'edi_transmission_logs'
        AND column_name = 'gate_out_operation_id'
      );
    `);

    if (checkColumn.rows[0].exists) {
      console.log('⚠️  La migration a déjà été appliquée (gate_out_operation_id existe déjà)\n');
    } else {
      // Exécuter la migration dans une transaction
      await client.query('BEGIN;');

      // Exécuter le SQL
      await client.query(sqlContent);

      await client.query('COMMIT;');

      console.log('✅ Migration exécutée avec succès!\n');
    }

    // Vérifications
    console.log('🔍 Vérifications...\n');

    // 1. Vérifier edi_transmission_logs columns
    console.log('1️⃣ edi_transmission_logs - Colonnes:');
    const logColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'edi_transmission_logs'
      AND column_name IN ('gate_in_operation_id', 'gate_out_operation_id')
      ORDER BY column_name;
    `);
    logColumns.rows.forEach(row => {
      console.log(`   ✅ ${row.column_name} (${row.data_type})`);
    });

    // 2. Vérifier updated_at trigger
    console.log('\n2️⃣ edi_transmission_logs - Trigger updated_at:');
    const triggerResult = await client.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = 'edi_transmission_logs'
      AND trigger_name = 'update_edi_transmission_logs_updated_at';
    `);
    if (triggerResult.rows.length > 0) {
      console.log('   ✅ Trigger updated_at présent');
    } else {
      console.log('   ⚠️  Trigger updated_at manquant');
    }

    // 3. Vérifier edi_client_settings.notification_prefs
    console.log('\n3️⃣ edi_client_settings - notification_prefs:');
    const notificationPrefsColumn = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'edi_client_settings'
      AND column_name = 'notification_prefs';
    `);
    if (notificationPrefsColumn.rows.length > 0) {
      console.log(`   ✅ notification_prefs (${notificationPrefsColumn.rows[0].data_type})`);
    } else {
      console.log('   ⚠️  notification_prefs manquant');
    }

    // 4. Vérifier edi_notifications table
    console.log('\n4️⃣ edi_notifications - Table:');
    const notificationsExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'edi_notifications'
      );
    `);
    if (notificationsExists.rows[0].exists) {
      console.log('   ✅ Table edi_notifications créée');

      // Compter les colonnes
      const colCount = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'edi_notifications';
      `);
      console.log(`   ✅ ${colCount.rows[0].count} colonnes`);
    } else {
      console.log('   ⚠️  Table edi_notifications manquante');
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ MIGRATION TERMINÉE AVEC SUCCÈS');
    console.log('═'.repeat(80));
    console.log('\n📋 Résumé des changements:');
    console.log('   • gate_operation_id → gate_in_operation_id (FK vers gate_in_operations)');
    console.log('   • gate_out_operation_id ajouté (FK vers gate_out_operations)');
    console.log('   • updated_at trigger ajouté sur edi_transmission_logs');
    console.log('   • notification_prefs JSONB ajouté à edi_client_settings');
    console.log('   • Table edi_notifications créée');
    console.log('\n');

  } catch (error: any) {
    await client.query('ROLLBACK;');
    console.error('\n❌ Erreur lors de la migration:', error.message);
    if (error.detail) console.error('   Détail:', error.detail);
    if (error.hint) console.error('   Conseil:', error.hint);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration();
