import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { SupportedLanguage, LanguageOption, SUPPORTED_LANGUAGES, LanguageContextType } from './types';
import { enTranslations, TranslationDictionary } from './translations/en';
import { hiTranslations } from './translations/hi';
import { paTranslations } from './translations/pa';
import { mrTranslations } from './translations/mr';
import { bnTranslations } from './translations/bn';
import { guTranslations } from './translations/gu';
import { taTranslations } from './translations/ta';
import { knTranslations } from './translations/kn';
import { mlTranslations } from './translations/ml';
import { urTranslations } from './translations/ur';
import { teTranslations } from './translations/te';
import { orTranslations } from './translations/or';
import { bhoTranslations } from './translations/bho';
import { asTranslations } from './translations/as';

const STORAGE_KEY = 'halder-language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const VALID_LANGUAGES: SupportedLanguage[] = [
  'en',
  'hi',
  'pa',
  'mr',
  'bn',
  'ta',
  'kn',
  'ml',
  'gu',
  'ur',
  'te',
  'or',
  'bho',
  'as',
];

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: enTranslations,
  hi: hiTranslations,
  pa: paTranslations,
  mr: mrTranslations,
  bn: bnTranslations,
  gu: guTranslations,
  ta: taTranslations,
  kn: knTranslations,
  ml: mlTranslations,
  ur: urTranslations,
  te: teTranslations,
  or: orTranslations,
  bho: bhoTranslations,
  as: asTranslations,
};

// Global state broadcaster for cross-component and standalone usage
let globalLanguage: SupportedLanguage = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage;
    if (saved && VALID_LANGUAGES.includes(saved)) {
      return saved;
    }
  } catch {}
  return DEFAULT_LANGUAGE;
})();

const listeners = new Set<(lang: SupportedLanguage) => void>();

export function getStoredLanguage(): SupportedLanguage {
  return globalLanguage;
}

export function setStoredLanguage(lang: SupportedLanguage): void {
  globalLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      const opt = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
      document.documentElement.dir = opt?.direction || 'ltr';
    }
  } catch {}
  listeners.forEach((listener) => {
    try {
      listener(lang);
    } catch {}
  });
}

// Translate function helper
export function translate(
  lang: SupportedLanguage,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = translations[lang] || translations.en;
  let text = (dict as any)?.[key] || (translations.en as any)?.[key] || key;

  if (params && typeof text === 'string') {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), () => String(paramValue));
    });
  }

  return text;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

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

  const handleSetLanguage = useCallback((newLang: SupportedLanguage) => {
    if (!VALID_LANGUAGES.includes(newLang)) return;
    setLanguageState(newLang);
    setStoredLanguage(newLang);
  }, []);

  useEffect(() => {
    const handleGlobalChange = (newLang: SupportedLanguage) => {
      setLanguageState(newLang);
    };

    listeners.add(handleGlobalChange);
    return () => {
      listeners.delete(handleGlobalChange);
    };
  }, []);

  // Sync HTML lang and dir attributes on mount and on language change (e.g., RTL for Urdu)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      const opt = SUPPORTED_LANGUAGES.find((l) => l.code === language);
      document.documentElement.dir = opt?.direction || 'ltr';
    }
  }, [language]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(language, key, params);
    },
    [language]
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

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // If inside LanguageProvider, React handles re-renders automatically.
    // If used outside, this listener updates the component when setStoredLanguage is called.
    if (!context) {
      const handleUpdate = () => forceUpdate({});
      listeners.add(handleUpdate);
      return () => {
        listeners.delete(handleUpdate);
      };
    }
  }, [context]);

  if (context) {
    return context;
  }

  // Standalone fallback outside of Provider
  return {
    language: globalLanguage,
    setLanguage: setStoredLanguage,
    t: (key: string, params?: Record<string, string | number>) =>
      translate(globalLanguage, key, params),
    languages: SUPPORTED_LANGUAGES,
  };
};
