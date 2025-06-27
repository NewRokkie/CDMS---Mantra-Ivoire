import { useState, useEffect, createContext, useContext } from 'react';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.containers': 'Containers',
    'nav.releases': 'Release Orders',
    'nav.edi': 'EDI Management',
    'nav.reports': 'Reports',
    'nav.logout': 'Sign Out',
    
    // Dashboard
    'dashboard.title': 'Container Depot Management',
    'dashboard.welcome': 'Welcome back',
    'dashboard.stats.containers': 'Total Containers',
    'dashboard.stats.in': 'Containers In',
    'dashboard.stats.out': 'Containers Out',
    'dashboard.stats.pending': 'Pending Release Orders',
    'dashboard.stats.movements': 'Today\'s Movements',
    'dashboard.stats.revenue': 'Monthly Revenue',
    'dashboard.stats.occupancy': 'Occupancy Rate',
    
    // Containers
    'containers.title': 'Container Management',
    'containers.gate_in': 'Gate In',
    'containers.gate_out': 'Gate Out',
    'containers.search': 'Search containers...',
    
    // Release Orders
    'releases.title': 'Release Orders',
    'releases.create': 'Create Release Order',
    'releases.pending': 'Pending Validation',
    'releases.validated': 'Validated',
    'releases.executed': 'Executed',
    
    // Common
    'common.status': 'Status',
    'common.actions': 'Actions',
    'common.date': 'Date',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.close': 'Close'
  },
  fr: {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.containers': 'Conteneurs',
    'nav.releases': 'Ordres de sortie',
    'nav.edi': 'Gestion EDI',
    'nav.reports': 'Rapports',
    'nav.logout': 'Se déconnecter',
    
    // Dashboard
    'dashboard.title': 'Gestion de Dépôt de Conteneurs',
    'dashboard.welcome': 'Bon retour',
    'dashboard.stats.containers': 'Total Conteneurs',
    'dashboard.stats.in': 'Conteneurs Entrés',
    'dashboard.stats.out': 'Conteneurs Sortis',
    'dashboard.stats.pending': 'Ordres en Attente',
    'dashboard.stats.movements': 'Mouvements du Jour',
    'dashboard.stats.revenue': 'Revenus Mensuels',
    'dashboard.stats.occupancy': 'Taux d\'Occupation',
    
    // Containers
    'containers.title': 'Gestion des Conteneurs',
    'containers.gate_in': 'Entrée',
    'containers.gate_out': 'Sortie',
    'containers.search': 'Rechercher des conteneurs...',
    
    // Release Orders
    'releases.title': 'Ordres de Sortie',
    'releases.create': 'Créer un Ordre',
    'releases.pending': 'En Attente de Validation',
    'releases.validated': 'Validés',
    'releases.executed': 'Exécutés',
    
    // Common
    'common.status': 'Statut',
    'common.actions': 'Actions',
    'common.date': 'Date',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.confirm': 'Confirmer',
    'common.close': 'Fermer'
  }
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const useLanguageProvider = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return (stored as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return {
    language,
    setLanguage,
    t
  };
};

export { LanguageContext };