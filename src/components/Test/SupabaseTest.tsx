/**
 * Composant de Test Supabase - Interface utilisateur pour tester la connexion
 * Permet de vérifier et diagnostiquer la configuration Supabase
 */

import React, { useState, useEffect } from 'react';
import { runSupabaseTests, SupabaseTestSuite, TestResult } from '../../utils/supabaseTest';
import { databaseAdapter } from '../../services/DatabaseAdapter';

export const SupabaseTest: React.FC = () => {
  const [testResults, setTestResults] = useState<SupabaseTestSuite | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentAdapter, setCurrentAdapter] = useState<string>('');

  useEffect(() => {
    // Obtenir l'adaptateur actuel
    setCurrentAdapter(databaseAdapter.getCurrentAdapter());
  }, []);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(null);

    try {
      console.log('🧪 Démarrage des tests Supabase...');
      const results = await runSupabaseTests();
      setTestResults(results);
    } catch (error) {
      console.error('Erreur lors des tests Supabase:', error);
      setTestResults({
        overallSuccess: false,
        results: [{
          testName: 'Erreur Globale',
          success: false,
          message: `Erreur lors de l'exécution des tests: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
        }],
        summary: {
          total: 1,
          passed: 0,
          failed: 1,
          duration: 0
        }
      });
    } finally {
      setIsRunning(false);
    }
  };

  const switchAdapter = async (useSupabase: boolean) => {
    try {
      if (useSupabase) {
        await databaseAdapter.switchToSupabase();
      } else {
        await databaseAdapter.switchToPostgreSQL();
      }
      setCurrentAdapter(databaseAdapter.getCurrentAdapter());
    } catch (error) {
      console.error('Erreur de basculement d\'adaptateur:', error);
    }
  };

  const getResultIcon = (result: TestResult): string => {
    return result.success ? '✅' : '❌';
  };

  const getResultColor = (result: TestResult): string => {
    return result.success ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🧪 Test de Configuration Supabase
        </h2>
        <p className="text-gray-600">
          Vérifiez que votre configuration Supabase est correcte et fonctionnelle.
        </p>
      </div>

      {/* Configuration actuelle */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">📊 Configuration Actuelle</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Adaptateur de Base de Données:</p>
            <p className="font-mono text-lg">
              {currentAdapter}
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                currentAdapter === 'Supabase' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {currentAdapter === 'Supabase' ? 'Cloud' : 'Local'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">URL Supabase:</p>
            <p className="font-mono text-sm text-gray-800">
              {import.meta.env.VITE_SUPABASE_URL || 'Non configurée'}
            </p>
          </div>
        </div>

        {/* Boutons de basculement */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => switchAdapter(true)}
            disabled={currentAdapter === 'Supabase'}
            className={`px-4 py-2 rounded text-sm font-medium ${
              currentAdapter === 'Supabase'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Utiliser Supabase
          </button>
          <button
            onClick={() => switchAdapter(false)}
            disabled={currentAdapter === 'PostgreSQL'}
            className={`px-4 py-2 rounded text-sm font-medium ${
              currentAdapter === 'PostgreSQL'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Utiliser PostgreSQL
          </button>
        </div>
      </div>

      {/* Bouton de test */}
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              Tests en cours...
            </>
          ) : (
            'Lancer les Tests Supabase'
          )}
        </button>
      </div>

      {/* Résultats des tests */}
      {testResults && (
        <div className="space-y-4">
          {/* Résumé */}
          <div className={`p-4 rounded-lg ${
            testResults.overallSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">
                {testResults.overallSuccess ? '🎉 Tous les tests réussis!' : '⚠️ Certains tests ont échoué'}
              </h3>
              <span className="text-sm text-gray-600">
                {testResults.summary.duration}ms
              </span>
            </div>
            <div className="flex space-x-4 text-sm">
              <span className="text-green-600">✅ {testResults.summary.passed} réussis</span>
              <span className="text-red-600">❌ {testResults.summary.failed} échoués</span>
              <span className="text-gray-600">📊 {testResults.summary.total} total</span>
            </div>
          </div>

          {/* Détails des tests */}
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-gray-900">📋 Détails des Tests</h4>
            {testResults.results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  result.success
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getResultIcon(result)}</span>
                    <span className="font-medium text-gray-900">{result.testName}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {result.duration}ms
                  </span>
                </div>
                <p className={`text-sm ${getResultColor(result)}`}>
                  {result.message}
                </p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                      Voir les détails
                    </summary>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          {/* Conseils et prochaines étapes */}
          {!testResults.overallSuccess && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-lg font-semibold text-yellow-800 mb-2">
                💡 Prochaines Étapes
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Vérifiez vos variables d'environnement dans le fichier .env</li>
                <li>• Assurez-vous que votre projet Supabase est actif</li>
                <li>• Vérifiez que les migrations ont été exécutées</li>
                <li>• Consultez la documentation dans docs/SUPABASE_SETUP.md</li>
              </ul>
            </div>
          )}

          {testResults.overallSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-lg font-semibold text-green-800 mb-2">
                🎯 Configuration Prête !
              </h4>
              <p className="text-sm text-green-700">
                Votre configuration Supabase est correcte. Vous pouvez maintenant utiliser
                l'application avec la base de données cloud Supabase.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Configuration avancée */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-lg font-semibold text-gray-900 mb-2">⚙️ Configuration Avancée</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Mode de développement:</strong> {import.meta.env.DEV ? 'Activé' : 'Désactivé'}
          </p>
          <p>
            <strong>Utilisation Supabase:</strong> {import.meta.env.VITE_USE_SUPABASE === 'true' ? 'Activée' : 'Désactivée'}
          </p>
          <p>
            <strong>Schéma Supabase:</strong> {import.meta.env.VITE_SUPABASE_SCHEMA || 'public'}
          </p>
          <p>
            <strong>Données mock:</strong> {import.meta.env.VITE_ENABLE_MOCK_DATA === 'true' ? 'Activées' : 'Désactivées'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupabaseTest;
