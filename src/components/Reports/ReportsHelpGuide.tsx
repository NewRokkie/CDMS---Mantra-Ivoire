import React, { useState } from 'react';
import { HelpCircle, X, ChevronRight, BarChart3, Filter, Download, Calendar, Zap } from 'lucide-react';

interface HelpStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  tips?: string[];
}

const HELP_STEPS: HelpStep[] = [
  {
    id: 'analytics',
    title: 'Onglet Analytics',
    description: 'Visualisez les métriques clés avec des graphiques interactifs et des KPIs en temps réel.',
    icon: BarChart3,
    tips: [
      'Cliquez sur les segments des graphiques pour voir les détails',
      'Utilisez le zoom pour explorer les données en profondeur',
      'Les graphiques se mettent à jour automatiquement avec les filtres'
    ]
  },
  {
    id: 'filters',
    title: 'Filtres Avancés',
    description: 'Affinez vos rapports avec des filtres par date, taille, statut et client.',
    icon: Filter,
    tips: [
      'Sauvegardez vos combinaisons de filtres favorites',
      'Utilisez les presets de date pour des analyses rapides',
      'Les filtres s\'appliquent à tous les graphiques et tableaux'
    ]
  },
  {
    id: 'export',
    title: 'Export de Rapports',
    description: 'Exportez vos données en 5 formats différents avec un formatage professionnel.',
    icon: Download,
    tips: [
      'CSV pour Excel et analyses de données',
      'PDF pour les présentations et l\'archivage',
      'HTML pour le partage web avec graphiques intégrés'
    ]
  },
  {
    id: 'scheduled',
    title: 'Rapports Planifiés',
    description: 'Automatisez la génération et l\'envoi de rapports par email.',
    icon: Calendar,
    tips: [
      'Configurez des rapports quotidiens, hebdomadaires ou mensuels',
      'Ajoutez plusieurs destinataires avec validation email',
      'Appliquez des filtres personnalisés aux rapports automatiques'
    ]
  },
  {
    id: 'realtime',
    title: 'Données en Temps Réel',
    description: 'Activez l\'actualisation automatique pour des données toujours à jour.',
    icon: Zap,
    tips: [
      'Configurez l\'intervalle d\'actualisation (15s à 5min)',
      'Surveillez la fraîcheur des données avec l\'indicateur',
      'Utilisez l\'actualisation manuelle pour des mises à jour immédiates'
    ]
  }
];

interface ReportsHelpGuideProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ReportsHelpGuide: React.FC<ReportsHelpGuideProps> = ({ isVisible, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isVisible) return null;

  const handleNext = () => {
    if (currentStep < HELP_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentHelpStep = HELP_STEPS[currentStep];
  const Icon = currentHelpStep.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HelpCircle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Guide des Rapports Avancés</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Étape {currentStep + 1} sur {HELP_STEPS.length}</span>
              <span>{Math.round(((currentStep + 1) / HELP_STEPS.length) * 100)}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / HELP_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start space-x-4 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Icon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {currentHelpStep.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {currentHelpStep.description}
              </p>
            </div>
          </div>

          {/* Tips */}
          {currentHelpStep.tips && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-3">💡 Conseils pratiques :</h4>
              <ul className="space-y-2">
                {currentHelpStep.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-blue-800">
                    <ChevronRight className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Step Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Précédent
            </button>

            {/* Step Indicators */}
            <div className="flex space-x-2">
              {HELP_STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-600'
                      : index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {currentStep === HELP_STEPS.length - 1 ? (
              <button
                onClick={onClose}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Terminer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Suivant
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>🚀 Module Reports - Version Avancée</span>
            <span>Besoin d'aide ? Contactez le support technique</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook pour gérer l'état du guide d'aide
export const useReportsHelp = () => {
  const [isHelpVisible, setIsHelpVisible] = useState(false);

  const showHelp = () => setIsHelpVisible(true);
  const hideHelp = () => setIsHelpVisible(false);

  // Vérifier si c'est la première visite
  React.useEffect(() => {
    const hasSeenHelp = localStorage.getItem('reports-help-seen');
    if (!hasSeenHelp) {
      // Afficher le guide après un court délai
      const timer = setTimeout(() => {
        setIsHelpVisible(true);
        localStorage.setItem('reports-help-seen', 'true');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return {
    isHelpVisible,
    showHelp,
    hideHelp
  };
};