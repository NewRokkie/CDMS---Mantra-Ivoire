import React, { createContext, ReactNode } from 'react';
import { Language } from '../types';

export interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode; value: LanguageContextType }> = ({ children, value }) => {
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
