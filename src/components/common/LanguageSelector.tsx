import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, SupportedLanguage, SUPPORTED_LANGUAGES } from '../../i18n';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface LanguageSelectorProps {
  variant?: 'compact' | 'full' | 'inline';
  className?: string;
  showTitle?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'compact',
  className = '',
  showTitle = false,
}) => {
  const { language, setLanguage, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Full Grid / Card view (ideal for Profile views & Settings)
  if (variant === 'full') {
    return (
      <div className={`space-y-3 ${className}`}>
        {showTitle && (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              {t('language.language_preference')}
            </span>
          </div>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t('language.language_description')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                type="button"
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-700/70 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl shrink-0" role="img" aria-label={lang.label}>
                    {lang.flag}
                  </span>
                  <div>
                    <span className="font-bold text-sm block leading-snug">
                      {lang.nativeLabel}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {lang.label}
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Inline buttons row (simple pill group)
  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = language === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              type="button"
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                  : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-400'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.nativeLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default: Compact Pill with Dropdown (perfect for Header bar)
  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-full bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-700/70 transition-all shadow-2xs focus:outline-hidden"
        title={t('language.select_language')}
        aria-label="Select Language"
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-[11px] font-bold tracking-wide uppercase">
          {currentOption.code}
        </span>
        <span className="text-xs hidden sm:inline">{currentOption.nativeLabel}</span>
        <ChevronDown
          className={`w-3 h-3 text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white dark:bg-[#1B201D] border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 z-50 animate-scale-in origin-top-right">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
            {t('language.select_language')}
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                type="button"
                className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{lang.flag}</span>
                  <div>
                    <span className="text-xs font-bold block">{lang.nativeLabel}</span>
                    <span className="text-[10px] text-zinc-400 block">{lang.label}</span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
