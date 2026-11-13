export type SupportedLanguage =
  | 'en'
  | 'hi'
  | 'pa'
  | 'mr'
  | 'bn'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'gu'
  | 'ur';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  flag: string;
  shortCode: string;
  direction?: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧', shortCode: 'EN', direction: 'ltr' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳', shortCode: 'HI', direction: 'ltr' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', flag: '🇮🇳', shortCode: 'PA', direction: 'ltr' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', flag: '🇮🇳', shortCode: 'MR', direction: 'ltr' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', flag: '🇮🇳', shortCode: 'BN', direction: 'ltr' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', flag: '🇮🇳', shortCode: 'GU', direction: 'ltr' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🇮🇳', shortCode: 'TA', direction: 'ltr' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', flag: '🇮🇳', shortCode: 'KN', direction: 'ltr' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', flag: '🇮🇳', shortCode: 'ML', direction: 'ltr' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', flag: '🇮🇳', shortCode: 'UR', direction: 'rtl' },
];

export interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: LanguageOption[];
}
