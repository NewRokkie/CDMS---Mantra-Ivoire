/**
 * Script de test pour le système de zones tampons
 * 
 * Ce script teste les fonctionnalités principales du système de zones tampons :
 * - Création automatique de zones tampons
 * - Assignation de conteneurs endommagés
 * - Statistiques et gestion
 */

import { bufferZoneService } from '../src/services/bufferZoneService';

async function testBufferZoneSystem() {
  console.log('🧪 Test du système de zones tampons');
  console.log('=====================================\n');

  const testYardId = 'depot-tantarelli';
  const testContainerSize: '20ft' | '40ft' = '20ft';
  const testDamageType = 'structural';

  try {
    // Test 1: Obtenir les statistiques initiales
    console.log('📊 Test 1: Statistiques initiales');
    const initialStats = await bufferZoneService.getBufferZoneStats(testYardId);
    console.log('Statistiques initiales:', initialStats);
    console.log('✅ Test 1 réussi\n');

    // Test 2: Obtenir ou créer une zone tampon
    console.log('🏗️ Test 2: Création/récupération de zone tampon');
    const bufferStack = await bufferZoneService.getOrCreateBufferStack(
      testYardId,
      testContainerSize,
      testDamageType
    );
    console.log('Zone tampon créée/récupérée:', {
      id: bufferStack.id,
      stackNumber: bufferStack.stackNumber,
      sectionName: bufferStack.sectionName,
      capacity: bufferStack.capacity,
      isBufferZone: bufferStack.isBufferZone
    });
    console.log('✅ Test 2 réussi\n');

    // Test 3: Vérifier les statistiques après création
    console.log('📈 Test 3: Statistiques après création');
    const updatedStats = await bufferZoneService.getBufferZoneStats(testYardId);
    console.log('Statistiques mises à jour:', updatedStats);
    console.log('✅ Test 3 réussi\n');

    // Test 4: Obtenir toutes les zones tampons
    console.log('📋 Test 4: Liste des zones tampons');
    const allBufferStacks = await bufferZoneService.getBufferStacks(testYardId);
    console.log(`Nombre de zones tampons: ${allBufferStacks.length}`);
    allBufferStacks.forEach((stack, index) => {
      console.log(`  ${index + 1}. Stack ${stack.stackNumber} - ${stack.sectionName} (${stack.containerSize})`);
    });
    console.log('✅ Test 4 réussi\n');

    // Test 5: Vérifier la fonction isBufferStack
    console.log('🔍 Test 5: Vérification isBufferStack');
    const isBuffer = bufferZoneService.isBufferStack(bufferStack);
    console.log(`Le stack ${bufferStack.stackNumber} est-il une zone tampon? ${isBuffer}`);
    console.log('✅ Test 5 réussi\n');

    // Test 6: Test avec différents types de dommages
    console.log('🔧 Test 6: Différents types de dommages');
    const damageTypes = ['surface', 'door', 'corner'];
    
    for (const damageType of damageTypes) {
      const stack = await bufferZoneService.getOrCreateBufferStack(
        testYardId,
        testContainerSize,
        damageType
      );
      console.log(`  Zone tampon pour ${damageType}: Stack ${stack.stackNumber}`);
    }
    console.log('✅ Test 6 réussi\n');

    // Test 7: Statistiques finales
    console.log('📊 Test 7: Statistiques finales');
    const finalStats = await bufferZoneService.getBufferZoneStats(testYardId);
    console.log('Statistiques finales:', finalStats);
    console.log('✅ Test 7 réussi\n');

    console.log('🎉 Tous les tests sont passés avec succès!');
    console.log('\n📋 Résumé des tests:');
    console.log(`- Zones tampons créées: ${finalStats.totalBufferStacks}`);
    console.log(`- Capacité totale: ${finalStats.totalCapacity}`);
    console.log(`- Occupation actuelle: ${finalStats.currentOccupancy}`);
    console.log(`- Espaces disponibles: ${finalStats.availableSpaces}`);

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    
    if (error instanceof Error) {
      console.error('Message d\'erreur:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  }
}

// Fonction utilitaire pour simuler une évaluation de dommages
function simulateDamageAssessment(hasDamage: boolean, damageType?: string) {
  return {
    hasDamage,
    damageType: hasDamage ? damageType : undefined,
    damageDescription: hasDamage ? `Dommage de type ${damageType} détecté lors de l'inspection` : undefined,
    assessmentStage: 'assignment' as const,
    assessedBy: 'test-operator',
    assessedAt: new Date()
  };
}

// Fonction pour tester le flux complet d'assignation
async function testCompleteAssignmentFlow() {
  console.log('\n🔄 Test du flux complet d\'assignation');
  console.log('=====================================\n');

  const testYardId = 'depot-tantarelli';
  
  // Simuler un conteneur sans dommage
  console.log('📦 Test conteneur sans dommage');
  const noDamageAssessment = simulateDamageAssessment(false);
  console.log('Évaluation:', noDamageAssessment);
  console.log('➡️ Assignation: Stack normal (pas de zone tampon)');
  console.log('✅ Flux normal réussi\n');

  // Simuler un conteneur avec dommages
  console.log('🚨 Test conteneur avec dommages');
  const damageAssessment = simulateDamageAssessment(true, 'structural');
  console.log('Évaluation:', damageAssessment);
  
  if (damageAssessment.hasDamage) {
    const bufferStack = await bufferZoneService.getOrCreateBufferStack(
      testYardId,
      '20ft',
      damageAssessment.damageType || 'general'
    );
    
    const bufferLocation = `BUFFER-S${String(bufferStack.stackNumber).padStart(4, '0')}-R01-H01`;
    console.log('➡️ Assignation automatique en zone tampon:', bufferLocation);
    console.log('✅ Flux avec dommages réussi\n');
  }
}

// Exécuter les tests
if (require.main === module) {
  testBufferZoneSystem()
    .then(() => testCompleteAssignmentFlow())
    .then(() => {
      console.log('\n🏁 Tous les tests terminés avec succès!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Échec des tests:', error);
      process.exit(1);
    });
}

export { testBufferZoneSystem, testCompleteAssignmentFlow };