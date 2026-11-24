import { translations } from '../src/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../src/i18n/types';

const baseline = Object.keys(translations.en);
console.log('========================================================');
console.log(`🌐 HALDER TRANSLATION AUDIT: ${SUPPORTED_LANGUAGES.length} LANGUAGES`);
console.log(`Baseline English Keys: ${baseline.length}`);
console.log('========================================================\n');

let totalIssues = 0;
const results: Record<string, { total: number; missing: string[]; untranslated: string[] }> = {};

for (const lang of SUPPORTED_LANGUAGES) {
  const dict = (translations as any)[lang.code] || {};
  const keys = Object.keys(dict);
  const missing = baseline.filter((k) => dict[k] === undefined || dict[k] === '');
  
  // Check if string is identical to English (excluding numbers, symbols, brand name 'HALDHAR')
  const untranslated: string[] = [];
  if (lang.code !== 'en') {
    for (const k of baseline) {
      if (dict[k] && dict[k] === translations.en[k as keyof typeof translations.en]) {
        // If it's not a short brand/symbol or formatting
        const val = dict[k];
        if (typeof val === 'string' && val.length > 5 && !val.includes('₹') && !val.includes('HALDHAR') && !val.includes('GPS') && !val.includes('OTP')) {
          untranslated.push(k);
        }
      }
    }
  }

  results[lang.code] = { total: keys.length, missing, untranslated };
  const status = missing.length === 0 ? '✅ 100% COVERED' : `⚠️ MISSING ${missing.length}`;
  console.log(`${lang.code.padEnd(5)} | ${lang.nativeLabel.padEnd(12)} (${lang.label.padEnd(10)}) : ${keys.length} keys | ${status}`);
  if (missing.length > 0) {
    totalIssues += missing.length;
    console.log(`      Sample Missing: ${missing.slice(0, 5).join(', ')}`);
  }
}

console.log('\n========================================================');
console.log(`AUDIT FINISHED. Total Missing Keys: ${totalIssues}`);
console.log('========================================================');
