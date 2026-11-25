import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, LanguageContextType } from './types';
import { enTranslations, TranslationDictionary } from './translations/en';

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

const LANGUAGE_LOADERS: Record<Exclude<SupportedLanguage, 'en'>, () => Promise<TranslationDictionary>> = {
  hi: () => import('./translations/hi').then((m) => m.hiTranslations),
  pa: () => import('./translations/pa').then((m) => m.paTranslations),
  mr: () => import('./translations/mr').then((m) => m.mrTranslations),
  bn: () => import('./translations/bn').then((m) => m.bnTranslations),
  gu: () => import('./translations/gu').then((m) => m.guTranslations),
  ta: () => import('./translations/ta').then((m) => m.taTranslations),
  kn: () => import('./translations/kn').then((m) => m.knTranslations),
  ml: () => import('./translations/ml').then((m) => m.mlTranslations),
  ur: () => import('./translations/ur').then((m) => m.urTranslations),
  te: () => import('./translations/te').then((m) => m.teTranslations),
  or: () => import('./translations/or').then((m) => m.orTranslations),
  bho: () => import('./translations/bho').then((m) => m.bhoTranslations),
  as: () => import('./translations/as').then((m) => m.asTranslations),
};

export const translations: Partial<Record<SupportedLanguage, TranslationDictionary>> = {
  en: enTranslations,
};

const inFlightLoads = new Map<SupportedLanguage, Promise<TranslationDictionary>>();

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

export async function ensureLanguageLoaded(lang: SupportedLanguage): Promise<void> {
  if (lang === 'en' || translations[lang]) return;
  const loader = LANGUAGE_LOADERS[lang];
  if (!loader) return;

  let pending = inFlightLoads.get(lang);
  if (!pending) {
    pending = loader()
      .then((dict) => {
        translations[lang] = dict;
        inFlightLoads.delete(lang);
        listeners.forEach((listener) => {
          try {
            listener(globalLanguage);
          } catch {}
        });
        return dict;
      })
      .catch((err) => {
        inFlightLoads.delete(lang);
        throw err;
      });
    inFlightLoads.set(lang, pending);
  }
  await pending.catch(() => {});
}

// Kick off preload immediately if stored language is not English
if (globalLanguage !== 'en') {
  ensureLanguageLoaded(globalLanguage);
}

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
  if (lang !== 'en' && !translations[lang]) {
    ensureLanguageLoaded(lang);
  }
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
    const handleGlobalChange = (newLang: SupportedLanguage) => {
      setLanguageState(newLang);
      setDictRevision((r) => r + 1);
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
