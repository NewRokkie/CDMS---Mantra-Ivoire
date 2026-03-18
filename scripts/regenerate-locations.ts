import { Client } from 'pg';

const DB_CONFIG = {
  host: 'aws-1-eu-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.nelmhiqsoamjluadnlvd',
  password: 's7l5RHnP9y7ZnM75',
  ssl: { rejectUnauthorized: false },
};

async function regenerateAllLocations() {
  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('🔌 Connexion à la base de données...\n');
    console.log('═'.repeat(80));
    console.log('🔄 RÉGÉNÉRATION DE TOUS LES EMPLACEMENTS (LOCATIONS)');
    console.log('═'.repeat(80));
    console.log('\n⚠️  Cette opération va recréer tous les emplacements pour tous les stacks\n');

    // 1. Compter les locations actuelles
    const countBefore = await client.query('SELECT COUNT(*) as count FROM public.locations');
    console.log(`📊 Locations actuelles: ${countBefore.rows[0].count}`);

    // 2. Récupérer tous les stacks actifs
    const stacksQuery = `
      SELECT id, yard_id, stack_number, rows, max_tiers, is_virtual, is_active
      FROM public.stacks
      WHERE is_active = true
      ORDER BY yard_id, stack_number;
    `;
    const stacks = await client.query(stacksQuery);
    console.log(`📦 Stacks actifs trouvés: ${stacks.rows.length}\n`);

    // 3. Générer les locations pour chaque stack
    let totalLocations = 0;
    let stacksProcessed = 0;

    for (const stack of stacks.rows) {
      try {
        // Skip virtual stacks for location generation (they use physical locations)
        if (stack.is_virtual) {
          console.log(`   ⚪ Virtual stack S${String(stack.stack_number).padStart(2, '0')} - skipped`);
          continue;
        }

        const rows = stack.rows || 6;
        let locationsForStack = 0;

        // Parse row_tier_config if it exists (JSON array of {row, maxTiers})
        let rowTierConfig: Array<{row: number, maxTiers: number}> = [];
        if (stack.row_tier_config) {
          try {
            rowTierConfig = typeof stack.row_tier_config === 'string' 
              ? JSON.parse(stack.row_tier_config)
              : stack.row_tier_config;
          } catch (e) {
            console.warn(`   ⚠️  Failed to parse row_tier_config for stack ${stack.stack_number}`);
          }
        }

        // Generate location IDs for this stack
        const locationIds = [];
        
        if (rowTierConfig && rowTierConfig.length > 0) {
          // Use custom row-tier config
          for (const config of rowTierConfig) {
            const row = config.row;
            const maxTiers = config.maxTiers;
            
            for (let tier = 1; tier <= maxTiers; tier++) {
              // Format: S{stack}R{row}H{tier} - supports 2-3 digit stacks
              const locationId = `S${String(stack.stack_number).padStart(2, '0')}R${row}H${tier}`;
              
              locationIds.push({
                location_id: locationId,
                stack_id: stack.id,
                yard_id: stack.yard_id,
                row_number: row,
                tier_number: tier,
                is_virtual: false,
                is_occupied: false,
                is_active: true,
                available: true,
              });
              locationsForStack++;
            }
          }
        } else {
          // Fallback to uniform rows * maxTiers
          const maxTiers = stack.max_tiers || 4;
          locationsForStack = rows * maxTiers;
          
          for (let row = 1; row <= rows; row++) {
            for (let tier = 1; tier <= maxTiers; tier++) {
              const locationId = `S${String(stack.stack_number).padStart(2, '0')}R${row}H${tier}`;
              
              locationIds.push({
                location_id: locationId,
                stack_id: stack.id,
                yard_id: stack.yard_id,
                row_number: row,
                tier_number: tier,
                is_virtual: false,
                is_occupied: false,
                is_active: true,
                available: true,
              });
            }
          }
        }

        // Insert locations (use INSERT ... ON CONFLICT DO NOTHING)
        for (const loc of locationIds) {
          await client.query(`
            INSERT INTO public.locations (
              location_id, stack_id, yard_id, row_number, tier_number,
              is_virtual, is_occupied, is_active, available
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9
            )
            ON CONFLICT (location_id) DO NOTHING;
          `, [
            loc.location_id,
            loc.stack_id,
            loc.yard_id,
            loc.row_number,
            loc.tier_number,
            loc.is_virtual,
            loc.is_occupied,
            loc.is_active,
            loc.available,
          ]);
        }

        totalLocations += locationsForStack;
        stacksProcessed++;

        if (stacksProcessed % 10 === 0 || stacksProcessed === stacks.rows.length) {
          console.log(`   ✅ ${stacksProcessed}/${stacks.rows.length} stacks traités (${totalLocations} locations créées)`);
        }
      } catch (error: any) {
        console.error(`   ❌ Erreur pour stack ${stack.stack_number}: ${error.message}`);
      }
    }

    // 4. Vérifier le résultat
    const countAfter = await client.query('SELECT COUNT(*) as count FROM public.locations');
    console.log(`\n📊 Locations après régénération: ${countAfter.rows[0].count}`);
    console.log(`📈 Nouvelles locations créées: ${countAfter.rows[0].count - countBefore.rows[0].count}`);

    // 5. Mettre à jour les statistiques
    console.log('\n🔄 Mise à jour des statistiques...');
    await client.query('ANALYZE public.locations;');
    console.log('   ✅ Statistiques mises à jour');

    console.log('\n' + '═'.repeat(80));
    console.log('✅ RÉGÉNÉRATION TERMINÉE AVEC SUCCÈS');
    console.log('═'.repeat(80));
    console.log('\n📋 Résumé:');
    console.log(`   • ${stacksProcessed} stacks traités`);
    console.log(`   • ${totalLocations} locations générées`);
    console.log(`   • ${countAfter.rows[0].count} locations totales en base`);
    console.log('\n📝 Prochaines étapes:');
    console.log('   1. Tester Gate In avec assignation de location');
    console.log('   2. Vérifier que les stacks virtuels (40ft) fonctionnent');
    console.log('   3. Tester la validation de location');
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ Erreur critique:', error.message);
    if (error.detail) console.error('   Détail:', error.detail);
    throw error;
  } finally {
    await client.end();
  }
}

regenerateAllLocations();
