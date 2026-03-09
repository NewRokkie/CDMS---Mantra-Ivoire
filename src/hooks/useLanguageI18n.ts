import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

/**
 * Custom hook for i18n integration
 * Provides translation function and language management
 * Replaces the old useLanguage hook
 */
export const useLanguage = () => {
  const { i18n, t: i18nT } = useTranslation();

  const t = useCallback((key: string, defaultValue?: string): string => {
    const translation = i18nT(key);
    // If translation returns the key itself, it means it wasn't found
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

export default useLanguage;
