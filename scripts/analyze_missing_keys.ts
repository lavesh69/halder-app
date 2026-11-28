import { ensureLanguageLoaded, translations } from '../src/i18n/translationUtils';

await ensureLanguageLoaded('pa');

const baseline = Object.keys(translations.en!);
const paKeys = new Set(Object.keys((translations as any).pa));
const missing = baseline.filter((k) => !paKeys.has(k));

console.log('Total missing in 12 regional languages:', missing.length);

const grouped: Record<string, string[]> = {};
for (const k of missing) {
  const prefix = k.split('.')[0];
  if (!grouped[prefix]) grouped[prefix] = [];
  grouped[prefix].push(k);
}

for (const [prefix, list] of Object.entries(grouped)) {
  console.log(`Prefix '${prefix}': ${list.length} keys`);
  console.log(`   Keys: ${list.slice(0, 5).join(', ')}...`);
}
