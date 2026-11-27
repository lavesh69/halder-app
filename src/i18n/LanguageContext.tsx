import React, { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, LanguageContextType } from './types';
import { LanguageContext } from './useTranslation';
import {
  VALID_LANGUAGES,
  ensureLanguageLoaded,
  getStoredLanguage,
  setStoredLanguage,
  subscribeLanguageChange,
  translate,
} from './translationUtils';

export const LanguageProvider: React.FC<{
  children: ReactNode;
  initialLanguage?: SupportedLanguage;
}> = ({ children, initialLanguage }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (initialLanguage && VALID_LANGUAGES.includes(initialLanguage)) {
      return initialLanguage;
    }
    return getStoredLanguage();
  });
  const [dictRevision, setDictRevision] = useState(0);

  const handleSetLanguage = useCallback((newLang: SupportedLanguage) => {
    if (!VALID_LANGUAGES.includes(newLang)) return;
    setLanguageState(newLang);
    setStoredLanguage(newLang);
  }, []);

  useEffect(() => {
    ensureLanguageLoaded(language);
  }, [language]);

  useEffect(() => {
    return subscribeLanguageChange((newLang) => {
      setLanguageState(newLang);
      setDictRevision((r) => r + 1);
    });
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      const opt = SUPPORTED_LANGUAGES.find((l) => l.code === language);
      document.documentElement.dir = opt?.direction || 'ltr';
    }
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      void dictRevision;
      return translate(language, key, params);
    },
    [language, dictRevision]
  );

  const contextValue = useMemo<LanguageContextType>(
    () => ({
      language,
      setLanguage: handleSetLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
    }),
    [language, handleSetLanguage, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};
