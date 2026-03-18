/**
 * DEPRECATED: This file has been replaced by i18n integration
 * 
 * Migration Guide:
 * - Old: import { useLanguage } from './hooks/useLanguage'
 * - New: import { useTranslation } from 'react-i18next'
 * 
 * Or use the compatibility wrapper:
 * - import { useLanguage } from './hooks/useLanguageI18n'
 * 
 * The old LanguageContext and LanguageProvider are no longer needed.
 * i18n is now initialized in main.tsx
 */

import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

/**
 * Compatibility wrapper for the old useLanguage hook
 * This maintains backward compatibility while using i18n under the hood
 */
export const useLanguage = () => {
  const { i18n, t: i18nT } = useTranslation();

  const t = useCallback((key: string, defaultValue?: string): string => {
    const translation = i18nT(key);
    if (translation === key && defaultValue) {
      return defaultValue;
    }
    return translation;
  }, [i18nT]);

  const setLanguage = useCallback((lang: string) => {
    i18n.changeLanguage(lang);
  }, [i18n]);

  return {
    language: i18n.language,
    setLanguage,
    t,
    i18n
  };
};

// These exports are kept for backward compatibility but are no longer used
export const LanguageContext = null;
export const LanguageProvider = null;

export default useLanguage;
