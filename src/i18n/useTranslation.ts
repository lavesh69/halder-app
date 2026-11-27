import { createContext, useContext, useEffect, useState } from 'react';
import { LanguageContextType, SUPPORTED_LANGUAGES } from './types';
import {
  getStoredLanguage,
  setStoredLanguage,
  subscribeLanguageChange,
  translate,
} from './translationUtils';

export const LanguageContext = createContext<LanguageContextType | null>(null);

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    if (!context) {
      return subscribeLanguageChange(() => forceUpdate({}));
    }
  }, [context]);

  if (context) {
    return context;
  }

  return {
    language: getStoredLanguage(),
    setLanguage: setStoredLanguage,
    t: (key: string, params?: Record<string, string | number>) =>
      translate(getStoredLanguage(), key, params),
    languages: SUPPORTED_LANGUAGES,
  };
};
