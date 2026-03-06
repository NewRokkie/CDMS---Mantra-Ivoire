import { Client } from 'pg';

const DB_CONFIG = {
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.nelmhiqsoamjluadnlvd',
  password: 's7l5RHnP9y7ZnM75',
  ssl: { rejectUnauthorized: false },
};

// Tables à CONSERVER (données de référence)
const TABLES_TO_KEEP = [
  // Reference data
  'clients',
  'yards',
  'sections',
  'stacks',
  'stack_pairings',
  'virtual_stack_pairs',
  'container_types',
  
  // Users & Auth
  'users',
  'user_module_access',
  
  // Locations (lié aux stacks)
  'locations',
  'location_id_mappings',
  
  // Client pools
  'client_pools',
  'stack_assignments',
  
  // EDI Server config
  'edi_server_configurations',
  'edi_client_settings',
];

// Tables à VIDER (données transactionnelles)
const TABLES_TO_TRUNCATE = [
  // Operations (FOCUS)
  'gate_in_operations',
  'gate_out_operations',
  
  // Containers (FOCUS)
  'containers',
  'container_buffer_zones',
  
  // Bookings (FOCUS)
  'booking_references',
  
  // EDI Logs
  'edi_transmission_logs',
  
  // Normalized tables (nouvelles)
  'gate_in_edi_details',
  'gate_in_transport_info',
  'gate_in_damage_assessments',
  'gate_out_edi_details',
  'gate_out_transport_info',
  
  // Audit logs
  'audit_logs',
  'location_audit_log',
  'user_activities',
  'user_login_history',
  'module_access_sync_log'
];

async function resetDatabase() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('🔌 Connexion à la base de données...\n');
    console.log('═'.repeat(80));
    console.log('🗑️  RESET DE LA BASE DE DONNÉES');
    console.log('═'.repeat(80));
    console.log('\n⚠️  ATTENTION: Cette opération va SUPPRIMER toutes les données transactionnelles!\n');
    
    // Vider les tables transactionnelles dans l'ordre pour éviter les problèmes de FK
    console.log('1️⃣ Suppression des données transactionnelles...\n');
    
    // D'abord, supprimer les tables qui ont des FK vers les autres
    const tablesWithFK = [
      'gate_in_edi_details',
      'gate_in_transport_info',
      'gate_in_damage_assessments',
      'gate_out_edi_details',
      'gate_out_transport_info',
      'container_buffer_zones',
      'edi_transmission_logs',
      'audit_logs',
      'location_audit_log',
      'user_activities',
      'user_login_history',
      'module_access_sync_log',
    ];
    
    for (const table of tablesWithFK) {
      try {
        const existsQuery = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1);`;
        const exists = await client.query(existsQuery, [table]);
        
        if (exists.rows[0].exists) {
          await client.query(`TRUNCATE TABLE public.${table} CASCADE;`);
          console.log(`   ✅ ${table} vidée`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      }
    }
    
    // Ensuite les tables principales
    const mainTables = [
      'gate_in_operations',
      'gate_out_operations',
      'containers',
      'booking_references',
    ];
    
    for (const table of mainTables) {
      try {
        const existsQuery = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1);`;
        const exists = await client.query(existsQuery, [table]);
        
        if (exists.rows[0].exists) {
          await client.query(`TRUNCATE TABLE public.${table} CASCADE;`);
          console.log(`   ✅ ${table} vidée`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      }
    }
    



    // Réinitialiser les locations (marquer comme non occupées)
    console.log('\n3️⃣ Réinitialisation des locations...\n');
    
    try {
      const updateResult = await client.query(`
        UPDATE public.locations 
        SET 
          is_occupied = false,
          container_id = NULL,
          container_size = NULL,
          updated_at = NOW()
        WHERE is_occupied = true;
      `);
      console.log(`   ✅ ${updateResult.rowCount} locations réinitialisées (marquées comme non occupées)`);
    } catch (error: any) {
      console.log(`   ⚠️  Erreur lors de la réinitialisation des locations: ${error.message}`);
    }

    // Réinitialiser les séquences
    console.log('\n4️⃣ Réinitialisation des séquences...\n');
    
    // Reset manual pour les séquences connues
    const sequencesToReset = [
      'gate_in_operations_id_seq',
      'gate_out_operations_id_seq',
      'containers_id_seq',
      'booking_references_id_seq',
      'edi_transmission_logs_id_seq',
      'audit_logs_id_seq',
    ];
    
    for (const seq of sequencesToReset) {
      try {
        await client.query(`ALTER SEQUENCE public.${seq} RESTART WITH 1;`);
        console.log(`   ✅ ${seq} réinitialisée`);
      } catch (error: any) {
        console.log(`   ⚠️  ${seq}: ${error.message}`);
      }
    }

    // VÉRIFICATIONS
    console.log('\n5️⃣ Vérifications post-reset...\n');
    
    // Compter les lignes restantes dans les tables transactionnelles
    console.log('   📊 Tables transactionnelles (devraient être vides):\n');
    
    const tablesToCheck = [
      'gate_in_operations',
      'gate_out_operations',
      'containers',
      'booking_references',
      'gate_in_edi_details',
      'gate_in_transport_info',
      'gate_in_damage_assessments',
      'gate_out_edi_details',
      'gate_out_transport_info',
    ];
    
    for (const table of tablesToCheck) {
      try {
        const existsQuery = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1);`;
        const exists = await client.query(existsQuery, [table]);
        
        if (exists.rows[0].exists) {
          const countQuery = `SELECT COUNT(*) as count FROM public.${table}`;
          const count = await client.query(countQuery);
          const status = count.rows[0].count === '0' ? '✅' : '⚠️';
          console.log(`      ${status} ${table}: ${count.rows[0].count} lignes`);
        }
      } catch (error: any) {
        console.log(`      ${table}: erreur - ${error.message}`);
      }
    }

    // Compter les lignes conservées
    console.log('\n   📊 Tables de référence (données conservées):\n');
    
    const refTablesToCheck = [
      'clients',
      'yards',
      'stacks',
      'locations',
      'users',
      'user_module_access',
    ];
    
    for (const table of refTablesToCheck) {
      try {
        const existsQuery = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1);`;
        const exists = await client.query(existsQuery, [table]);
        
        if (exists.rows[0].exists) {
          const countQuery = `SELECT COUNT(*) as count FROM public.${table}`;
          const count = await client.query(countQuery);
          
          // Pour locations, afficher aussi le nombre de locations occupées
          if (table === 'locations') {
            const occupiedQuery = `SELECT COUNT(*) as count FROM public.locations WHERE is_occupied = true`;
            const occupiedCount = await client.query(occupiedQuery);
            console.log(`      ${table}: ${count.rows[0].count} lignes (${occupiedCount.rows[0].count} occupées)`);
          } else {
            console.log(`      ${table}: ${count.rows[0].count} lignes`);
          }
        }
      } catch (error: any) {
        console.log(`      ${table}: erreur - ${error.message}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('✅ RESET TERMINÉ AVEC SUCCÈS');
    console.log('═'.repeat(80));
    console.log('\n📋 Résumé:');
    console.log(`   • ${TABLES_TO_TRUNCATE.length} tables transactionnelles vidées`);
    console.log(`   • ${TABLES_TO_KEEP.length} tables de référence conservées`);
    console.log(`   • Locations réinitialisées (marquées comme non occupées)`);
    console.log(`   • Séquences réinitialisées`);
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Vérifier que les données de référence sont intactes');
    console.log('   2. Vérifier que toutes les locations sont disponibles (is_occupied = false)');
    console.log('   3. Tester la création de Gate In / Gate Out / Containers / Bookings');
    console.log('   4. Vérifier que les triggers fonctionnent correctement');
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ Erreur critique:', error.message);
    if (error.detail) console.error('   Détail:', error.detail);
    throw error;
  } finally {
    await client.end();
  }
}

resetDatabase();
