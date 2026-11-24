import fs from 'fs';
import path from 'path';
import { enTranslations } from '../src/i18n/translations/en';
import { hiTranslations } from '../src/i18n/translations/hi';

// Complete dictionary of all 166 missing keys translated for all 12 regional languages
import { regionalTranslations } from './regional_data';

const translationDir = path.join(process.cwd(), 'src', 'i18n', 'translations');
const targetLangs = ['pa', 'mr', 'bn', 'gu', 'ta', 'te', 'kn', 'ml', 'or', 'bho', 'as', 'ur'];

console.log('Starting backfill for 12 regional languages...');

for (const lang of targetLangs) {
  const filePath = path.join(translationDir, `${lang}.ts`);
  let content = fs.readFileSync(filePath, 'utf-8');

  const langData = regionalTranslations[lang];
  if (!langData) {
    console.error(`Missing regional dataset for ${lang}`);
    continue;
  }

  // Find the closing }; of the object
  const lastBraceIndex = content.lastIndexOf('};');
  if (lastBraceIndex === -1) {
    console.error(`Could not locate closing "};" in ${lang}.ts`);
    continue;
  }

  let injection = `\n  // --- Complete Core & UI Additions ---\n`;
  let addedCount = 0;

  for (const [key, value] of Object.entries(langData)) {
    // Only add if not already present in content
    if (!content.includes(`'${key}':`) && !content.includes(`"${key}":`)) {
      // Escape single quotes in value
      const safeVal = String(value).replace(/'/g, "\\'");
      injection += `  '${key}': '${safeVal}',\n`;
      addedCount++;
    }
  }

  const updatedContent = content.slice(0, lastBraceIndex) + injection + content.slice(lastBraceIndex);
  fs.writeFileSync(filePath, updatedContent, 'utf-8');
  console.log(`✅ [${lang}] Injected ${addedCount} missing translation keys.`);
}

console.log('Finished translation backfill!');
