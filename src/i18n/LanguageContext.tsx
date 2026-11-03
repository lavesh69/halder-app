import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SupportedLanguage, LanguageOption, SUPPORTED_LANGUAGES, LanguageContextType } from './types';
import { enTranslations, TranslationDictionary } from './translations/en';
import { hiTranslations } from './translations/hi';
import { paTranslations } from './translations/pa';
import { mrTranslations } from './translations/mr';
import { bnTranslations } from './translations/bn';

const STORAGE_KEY = 'halder-language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en: enTranslations,
  hi: hiTranslations,
  pa: paTranslations,
  mr: mrTranslations,
  bn: bnTranslations,
};

// Global state broadcaster for cross-component and multi-tree synchronization
let globalLanguage: SupportedLanguage = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'en' || saved === 'hi' || saved === 'pa' || saved === 'mr' || saved === 'bn')) {
      return saved as SupportedLanguage;
    }
  } catch {}
  return DEFAULT_LANGUAGE;
})();

const listeners = new Set<(lang: SupportedLanguage) => void>();

export function getStoredLanguage(): SupportedLanguage {
  return globalLanguage;
}

export function setStoredLanguage(lang: SupportedLanguage): void {
  if (globalLanguage === lang) return;
  globalLanguage = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  } catch {}
  listeners.forEach((listener) => listener(lang));
}

// Translate function helper
export function translate(
  lang: SupportedLanguage,
  key: string,
  params?: Record<string, string | number>
): string {
  const dict = translations[lang] || translations.en;
  let text = (dict as any)[key] || (translations.en as any)[key] || key;

  if (params && typeof text === 'string') {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), () => String(paramValue));
    });
  }

  return text;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key: string, params?: Record<string, string | number>) => translate(DEFAULT_LANGUAGE, key, params),
  languages: SUPPORTED_LANGUAGES,
});

export const LanguageProvider: React.FC<{ children: ReactNode; initialLanguage?: SupportedLanguage }> = ({
  children,
  initialLanguage,
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    return getStoredLanguage();
  });

  useEffect(() => {
    const handleGlobalChange = (newLang: SupportedLanguage) => {
      setLanguageState(newLang);
    };

    listeners.add(handleGlobalChange);
    return () => {
      listeners.delete(handleGlobalChange);
    };
  }, []);

  const handleSetLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    setStoredLanguage(newLang);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(language, key, params);
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const handleUpdate = () => {
      forceUpdate({});
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const currentLang = context?.language || globalLanguage;

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    if (context?.setLanguage) {
      context.setLanguage(lang);
    } else {
      setStoredLanguage(lang);
    }
  }, [context]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(currentLang, key, params);
    },
    [currentLang]
  );

  return {
    language: currentLang,
    setLanguage,
    t,
    languages: SUPPORTED_LANGUAGES,
  };
};
