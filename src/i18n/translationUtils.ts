import { SupportedLanguage, SUPPORTED_LANGUAGES } from './types';
import { enTranslations, TranslationDictionary } from './translations/en';

const STORAGE_KEY = 'halder-language';
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export const VALID_LANGUAGES: SupportedLanguage[] = [
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

export function subscribeLanguageChange(listener: (lang: SupportedLanguage) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

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
