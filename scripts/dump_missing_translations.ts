import fs from 'fs';
import path from 'path';
import { enTranslations } from '../src/i18n/translations/en';
import { hiTranslations } from '../src/i18n/translations/hi';
import { paTranslations } from '../src/i18n/translations/pa';

const enKeys = Object.keys(enTranslations);
const paKeys = new Set(Object.keys(paTranslations));
const missing = enKeys.filter((k) => !paKeys.has(k));

const data = missing.map((k) => ({
  key: k,
  en: (enTranslations as any)[k],
  hi: (hiTranslations as any)[k] || (enTranslations as any)[k],
}));

fs.writeFileSync(
  path.join(process.cwd(), 'scripts', 'missing_keys.json'),
  JSON.stringify(data, null, 2),
  'utf-8'
);

console.log(`Saved ${data.length} missing keys to scripts/missing_keys.json`);
