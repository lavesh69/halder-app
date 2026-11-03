import { enTranslations } from '../src/i18n/translations/en';
import { hiTranslations } from '../src/i18n/translations/hi';
import { paTranslations } from '../src/i18n/translations/pa';
import { mrTranslations } from '../src/i18n/translations/mr';
import { bnTranslations } from '../src/i18n/translations/bn';
import { translate, translations } from '../src/i18n/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../src/i18n/types';

console.log('=== HALDER i18n System Verification ===');

const enKeys = Object.keys(enTranslations).sort();
const langDicts: Record<string, Record<string, string>> = {
  hi: hiTranslations,
  pa: paTranslations,
  mr: mrTranslations,
  bn: bnTranslations,
};

console.log(`Base English (en) dictionary keys: ${enKeys.length}`);

let totalErrors = 0;

for (const [lang, dict] of Object.entries(langDicts)) {
  const keys = Object.keys(dict).sort();
  const missing = enKeys.filter((k) => !(k in dict));
  const extra = keys.filter((k) => !(k in enTranslations));
  const empty = keys.filter((k) => !dict[k] || dict[k].trim() === '');

  console.log(`Checking [${lang.toUpperCase()}]: Total=${keys.length}, Missing=${missing.length}, Extra=${extra.length}, Empty=${empty.length}`);

  if (missing.length > 0) {
    console.error(`❌ [${lang}] Missing ${missing.length} keys:`, missing);
    totalErrors += missing.length;
  }
  if (extra.length > 0) {
    console.error(`❌ [${lang}] Extra ${extra.length} keys:`, extra);
    totalErrors += extra.length;
  }
  if (empty.length > 0) {
    console.error(`❌ [${lang}] Empty ${empty.length} keys:`, empty);
    totalErrors += empty.length;
  }
}

// Verify dynamic parameter interpolation
console.log('\n--- Verifying Dynamic Parameter Interpolation ---');
const testCases: Array<{ lang: SupportedLanguage; key: string; params: Record<string, any>; expectedSub: string }> = [
  { lang: 'en', key: 'geo.radius_label', params: { radius: 300 }, expectedSub: '300 km' },
  { lang: 'hi', key: 'geo.radius_label', params: { radius: 300 }, expectedSub: '300 किमी' },
  { lang: 'pa', key: 'geo.radius_label', params: { radius: 300 }, expectedSub: '300 ਕਿਮੀ' },
  { lang: 'mr', key: 'geo.radius_label', params: { radius: 300 }, expectedSub: '300 किमी' },
  { lang: 'bn', key: 'geo.radius_label', params: { radius: 300 }, expectedSub: '300 কিমি' },
  { lang: 'en', key: 'chat.typing', params: { name: 'Rajesh' }, expectedSub: 'Rajesh is typing' },
  { lang: 'hi', key: 'chat.typing', params: { name: 'Rajesh' }, expectedSub: 'Rajesh टाइप कर रहे हैं' },
  { lang: 'pa', key: 'chat.typing', params: { name: 'Rajesh' }, expectedSub: 'Rajesh ਟਾਈਪ ਕਰ ਰਿਹਾ ਹੈ' },
  { lang: 'mr', key: 'chat.typing', params: { name: 'Rajesh' }, expectedSub: 'Rajesh टाइप करत आहेत' },
  { lang: 'bn', key: 'chat.typing', params: { name: 'Rajesh' }, expectedSub: 'Rajesh লিখছেন' },
];

for (const tc of testCases) {
  const result = translate(tc.lang, tc.key, tc.params);
  if (!result.includes(tc.expectedSub)) {
    console.error(`❌ Interpolation failed for [${tc.lang}] key "${tc.key}": got "${result}", expected substring "${tc.expectedSub}"`);
    totalErrors++;
  } else {
    console.log(`✓ [${tc.lang}] ${tc.key} -> "${result}"`);
  }
}

// Verify domain coverage
console.log('\n--- Verifying Required Feature Domain Coverage ---');
const requiredDomains = [
  'nav.',
  'location.',
  'search.',
  'geo.',
  'catalog.',
  'mandi.',
  'cart.',
  'checkout.',
  'settlement.',
  'guarantee.',
  'orders.',
  'tracking.',
  'earnings.',
  'bank.',
  'kyc.',
  'trust.',
  'chat.',
  'profile.',
  'language.',
];

for (const domain of requiredDomains) {
  const matchingKeys = enKeys.filter((k) => k.startsWith(domain));
  if (matchingKeys.length === 0) {
    console.error(`❌ Missing domain coverage for "${domain}"`);
    totalErrors++;
  } else {
    console.log(`✓ Domain "${domain}": ${matchingKeys.length} keys`);
  }
}

if (totalErrors === 0) {
  console.log('\n======================================================');
  console.log('✅ ALL VERIFICATIONS PASSED (100% Key Parity, 0 Missing Keys)');
  console.log('======================================================');
  process.exit(0);
} else {
  console.error(`\n❌ VERIFICATION FAILED WITH ${totalErrors} ERROR(S)`);
  process.exit(1);
}
