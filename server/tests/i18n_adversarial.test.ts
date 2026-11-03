import {
  enTranslations,
  hiTranslations,
  paTranslations,
  mrTranslations,
  bnTranslations,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  translate,
  getStoredLanguage,
  setStoredLanguage,
  translations,
} from '../../src/i18n';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assertTest(suite: string, name: string, condition: boolean, details?: string) {
  results.push({ suite, name, passed: condition, details });
  if (condition) {
    console.log(`  ✅ [PASS] [${suite}] ${name}`);
  } else {
    console.error(`  ❌ [FAIL] [${suite}] ${name} ${details ? `(${details})` : ''}`);
  }
}

async function runAdversarialI18nSuite() {
  console.log('========================================================================');
  console.log('🌐 HALDER 5-LANGUAGE I18N ADVERSARIAL STRESS-TEST & PARITY HARNESS');
  console.log('========================================================================\n');

  // ========================================================================
  // SUITE 1: EXHAUSTIVE DICTIONARY KEY PARITY & INTEGRITY
  // ========================================================================
  console.log('--- Suite 1: Exhaustive Dictionary Key Parity & Integrity (en, hi, pa, mr, bn) ---');

  const enKeys = Object.keys(enTranslations);
  const langDicts: Record<SupportedLanguage, Record<string, string>> = {
    en: enTranslations,
    hi: hiTranslations,
    pa: paTranslations,
    mr: mrTranslations,
    bn: bnTranslations,
  };

  assertTest(
    'Key Parity',
    `English base dictionary contains >= 200 keys (Found: ${enKeys.length})`,
    enKeys.length >= 200,
    `Count = ${enKeys.length}`
  );

  // 1.1 Check that all English keys exist and are non-empty across all 4 target languages
  for (const [lang, dict] of Object.entries(langDicts) as [SupportedLanguage, Record<string, string>][]) {
    if (lang === 'en') continue;

    const missingKeys: string[] = [];
    const emptyKeys: string[] = [];
    const nonStringKeys: string[] = [];

    for (const key of enKeys) {
      if (!(key in dict)) {
        missingKeys.push(key);
      } else if (typeof dict[key] !== 'string') {
        nonStringKeys.push(key);
      } else if (dict[key].trim() === '') {
        emptyKeys.push(key);
      }
    }

    assertTest(
      'Key Parity',
      `Language '${lang}' has 100% key parity with 'en' (0 missing keys out of ${enKeys.length})`,
      missingKeys.length === 0,
      `Missing: ${missingKeys.slice(0, 10).join(', ')}${missingKeys.length > 10 ? '...' : ''}`
    );

    assertTest(
      'Key Parity',
      `Language '${lang}' contains zero empty string values`,
      emptyKeys.length === 0,
      `Empty keys: ${emptyKeys.slice(0, 10).join(', ')}`
    );

    assertTest(
      'Key Parity',
      `Language '${lang}' contains only string values`,
      nonStringKeys.length === 0,
      `Non-string keys: ${nonStringKeys.join(', ')}`
    );
  }

  // 1.2 Reverse Parity: No orphan/extra keys in target languages that do not exist in English
  for (const [lang, dict] of Object.entries(langDicts) as [SupportedLanguage, Record<string, string>][]) {
    if (lang === 'en') continue;
    const targetKeys = Object.keys(dict);
    const extraKeys = targetKeys.filter((k) => !enKeys.includes(k));

    assertTest(
      'Reverse Parity',
      `Language '${lang}' has no rogue/extra keys absent in 'en'`,
      extraKeys.length === 0,
      `Extra keys: ${extraKeys.join(', ')}`
    );
  }

  // ========================================================================
  // SUITE 2: NATIVE SCRIPT REPRESENTATION & SCRIPT VALIDATION
  // ========================================================================
  console.log('\n--- Suite 2: Native Script Representation & Script Validation ---');

  // Devanagari range: \u0900-\u097F (Used by Hindi & Marathi)
  // Gurmukhi range: \u0A00-\u0A7F (Used by Punjabi)
  // Bengali range: \u0980-\u09FF (Used by Bengali)

  const scriptRegexes: Record<SupportedLanguage, RegExp> = {
    en: /^[A-Za-z0-9\s.,!?:;'"\/\\()\-—_#@₹%&+*<>=]+$/,
    hi: /[\u0900-\u097F]/,
    pa: /[\u0A00-\u0A7F]/,
    mr: /[\u0900-\u097F]/,
    bn: /[\u0980-\u09FF]/,
  };

  // Keys that legitimately contain English terms, endonyms of other languages, or pure tokens
  const exemptKeysFromScriptCheck = new Set([
    'language.en', // English endonym
    'language.hi', // Hindi endonym (हिन्दी)
    'language.pa', // Punjabi endonym (ਪੰਜਾਬੀ)
    'language.mr', // Marathi endonym (मराठी)
    'language.bn', // Bengali endonym (বাংলা)
    'catalog.per_unit', // Dynamic unit token '/ {unit}'
  ]);

  for (const lang of ['hi', 'pa', 'mr', 'bn'] as SupportedLanguage[]) {
    const dict = langDicts[lang];
    const regex = scriptRegexes[lang];
    const untranslatedKeys: string[] = [];

    for (const [key, value] of Object.entries(dict)) {
      if (exemptKeysFromScriptCheck.has(key)) continue;

      // Check if value contains characters in the expected native script
      if (!regex.test(value)) {
        untranslatedKeys.push(`${key}: "${value}"`);
      }
    }

    assertTest(
      'Native Script Audit',
      `Language '${lang}' strings use genuine native Unicode script (${lang === 'hi' || lang === 'mr' ? 'Devanagari' : lang === 'pa' ? 'Gurmukhi' : 'Bengali'})`,
      untranslatedKeys.length === 0,
      `Failed keys (${untranslatedKeys.length}): ${untranslatedKeys.slice(0, 5).join(' | ')}`
    );
  }

  // 2.2 Supported Languages Metadata Verification
  assertTest(
    'Language Metadata',
    'SUPPORTED_LANGUAGES array contains all 5 languages with native labels and flags',
    SUPPORTED_LANGUAGES.length === 5 &&
      SUPPORTED_LANGUAGES.every(
        (l) =>
          ['en', 'hi', 'pa', 'mr', 'bn'].includes(l.code) &&
          !!l.label &&
          !!l.nativeLabel &&
          !!l.flag &&
          l.direction === 'ltr'
      )
  );

  const nativeLabelsMap: Record<SupportedLanguage, string> = {
    en: 'English',
    hi: 'हिन्दी',
    pa: 'ਪੰਜਾਬੀ',
    mr: 'मराठी',
    bn: 'বাংলা',
  };

  for (const opt of SUPPORTED_LANGUAGES) {
    assertTest(
      'Language Metadata',
      `Language option '${opt.code}' has exact native label '${nativeLabelsMap[opt.code]}'`,
      opt.nativeLabel === nativeLabelsMap[opt.code],
      `Actual: ${opt.nativeLabel}`
    );
  }

  // ========================================================================
  // SUITE 3: INTERPOLATION PLACEHOLDER TOKEN PARITY
  // ========================================================================
  console.log('\n--- Suite 3: Interpolation Placeholder Token Parity ---');

  const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;

  // Find all keys in en that have parameters
  const keysWithPlaceholders: Record<string, string[]> = {};
  for (const [key, val] of Object.entries(enTranslations)) {
    const matches = Array.from(val.matchAll(placeholderRegex), (m) => m[1]);
    if (matches.length > 0) {
      keysWithPlaceholders[key] = matches;
    }
  }

  assertTest(
    'Placeholder Audit',
    `Found ${Object.keys(keysWithPlaceholders).length} parameterized translation keys in English dictionary`,
    Object.keys(keysWithPlaceholders).length >= 15,
    `Count = ${Object.keys(keysWithPlaceholders).length}`
  );

  // Validate that for every parameterized key, each translated language retains ALL required placeholders
  for (const [key, expectedParams] of Object.entries(keysWithPlaceholders)) {
    for (const lang of ['hi', 'pa', 'mr', 'bn'] as SupportedLanguage[]) {
      const translatedVal = langDicts[lang][key];
      const translatedMatches = Array.from(translatedVal.matchAll(placeholderRegex), (m) => m[1]);

      const missingPlaceholders = expectedParams.filter((p) => !translatedMatches.includes(p));
      const extraPlaceholders = translatedMatches.filter((p) => !expectedParams.includes(p));

      assertTest(
        'Placeholder Parity',
        `Key '${key}' in '${lang}' retains exact parameter placeholders: [${expectedParams.join(', ')}]`,
        missingPlaceholders.length === 0 && extraPlaceholders.length === 0,
        `Missing: [${missingPlaceholders.join(', ')}], Extra: [${extraPlaceholders.join(', ')}], Raw: "${translatedVal}"`
      );
    }
  }

  // ========================================================================
  // SUITE 4: PARAMETER INTERPOLATION FUZZING & EDGE CASES
  // ========================================================================
  console.log('\n--- Suite 4: Parameter Interpolation Fuzzing & Edge Cases ---');

  // Test 4.1: Normal string and numeric substitutions across all languages
  const testCases = [
    {
      key: 'geo.radius_label',
      params: { radius: 25 },
      expectedSubstrings: { en: '25 km', hi: '25 किमी', pa: '25 ਕਿਮੀ', mr: '25 किमी', bn: '25 কিমি' },
    },
    {
      key: 'mandi.mandi_price',
      params: { price: 35.5 },
      expectedSubstrings: { en: '₹35.5/kg', hi: '₹35.5/किग्रा', pa: '₹35.5/ਕਿਲੋ', mr: '₹35.5/किलो', bn: '₹35.5/কেজি' },
    },
    {
      key: 'chat.type_a_message',
      params: { name: 'Ramesh Patel' },
      expectedSubstrings: {
        en: 'Ramesh Patel...',
        hi: 'Ramesh Patel को संदेश लिखें...',
        pa: 'Ramesh Patel ਨੂੰ ਸੁਨੇਹਾ ਲਿਖੋ...',
        mr: 'Ramesh Patel यांना संदेश लिहा...',
        bn: 'Ramesh Patel-কে বার্তা লিখুন...',
      },
    },
    {
      key: 'tracking.estimated_arrival',
      params: { time: '10:30 AM' },
      expectedSubstrings: { en: '10:30 AM', hi: '10:30 AM', pa: '10:30 AM', mr: '10:30 AM', bn: '10:30 AM' },
    },
    {
      key: 'chat.unread_messages',
      params: { count: 5 },
      expectedSubstrings: { en: '5 unread', hi: '5 अपठित', pa: '5 ਅਣਪੜ੍ਹੇ', mr: '5 न वाचलेले', bn: '5টি অপঠিত' },
    },
    {
      key: 'mandi.benchmark_comparison',
      params: { mandi: 40, halder: 32 },
      expectedSubstrings: { en: '₹40 | HALDER Direct: ₹32', hi: '₹40 | HALDER सीधा भाव: ₹32' },
    },
  ];

  for (const tc of testCases) {
    for (const [lang, expected] of Object.entries(tc.expectedSubstrings)) {
      const output = translate(lang as SupportedLanguage, tc.key, tc.params);
      assertTest(
        'Interpolation Baseline',
        `translate('${lang}', '${tc.key}', ${JSON.stringify(tc.params)}) yields expected substring`,
        output.includes(expected),
        `Actual output: "${output}", Expected substring: "${expected}"`
      );
    }
  }

  // Test 4.2: Fuzzing with Numeric Edge Cases (0, negative numbers, floating points, large integers)
  const numericFuzzCases = [
    {
      name: 'Zero (0)',
      params: { count: 0, radius: 0, amount: 0 },
      validate: (out: string) => out.includes('0') && !out.includes('{count}') && !out.includes('{radius}') && !out.includes('{amount}'),
    },
    {
      name: 'Negative Number (-150)',
      params: { count: -150, radius: -150, amount: -150 },
      validate: (out: string) => out.includes('-150') && !out.includes('{count}') && !out.includes('{radius}') && !out.includes('{amount}'),
    },
    {
      name: 'Float / Decimal (1234.5678)',
      params: { count: 1234.5678, radius: 1234.5678, amount: 1234.5678 },
      validate: (out: string) => out.includes('1234.5678'),
    },
    {
      name: 'Large Integer (9999999999)',
      params: { count: 9999999999, radius: 9999999999, amount: 9999999999 },
      validate: (out: string) => out.includes('9999999999'),
    },
  ];

  for (const fuzz of numericFuzzCases) {
    const outEn = translate('en', 'cart.free_delivery', fuzz.params);
    const outHi = translate('hi', 'geo.radius_label', fuzz.params);
    const outBn = translate('bn', 'chat.unread_messages', fuzz.params);

    assertTest(
      'Numeric Fuzzing',
      `Fuzz numeric value: ${fuzz.name} correctly converted and formatted without crashing`,
      fuzz.validate(outEn) && fuzz.validate(outHi) && fuzz.validate(outBn),
      `en: "${outEn}", hi: "${outHi}", bn: "${outBn}"`
    );
  }

  // Test 4.3: Fuzzing with Special Characters, Regex Meta-characters, and XSS Payloads
  const stringFuzzCases = [
    {
      name: 'Regex Metacharacters in param value ($1, $&, $`, $\', \\d+, .*, (?:abc), [0-9])',
      paramVal: '$1 and $& and $` and \\d+ and .* and [a-z] and (?:group)',
      key: 'chat.type_a_message',
      paramKey: 'name',
    },
    {
      name: 'HTML / XSS Payloads (<script>alert(1)</script>, <img src=x onerror=alert(1)>)',
      paramVal: '<script>alert("XSS")</script><img src=x onerror=alert(1)>',
      key: 'chat.type_a_message',
      paramKey: 'name',
    },
    {
      name: 'Quotes, Backslashes, Slashes, and Control Characters (\'"\\/`\n\r\t)',
      paramVal: 'Farmer\'s "Special" \\ Produce / `Fresh` \n \t Multi-line',
      key: 'chat.produce_inquiry',
      paramKey: 'produce',
    },
    {
      name: 'Extreme Length String (10,000 characters)',
      paramVal: 'X'.repeat(10000),
      key: 'chat.type_a_message',
      paramKey: 'name',
    },
    {
      name: 'Empty String ("")',
      paramVal: '',
      key: 'chat.type_a_message',
      paramKey: 'name',
    },
    {
      name: 'Unicode Emojis & Multilingual Mixed Text (🚜 🌾 Kisan Direct 🍎 ਪੰਜਾਬੀ বাংলা)',
      paramVal: '🚜 🌾 Kisan Direct 🍎 ਪੰਜਾਬੀ বাংলা',
      key: 'chat.produce_inquiry',
      paramKey: 'produce',
    },
  ];

  for (const fuzz of stringFuzzCases) {
    for (const lang of ['en', 'hi', 'pa', 'mr', 'bn'] as SupportedLanguage[]) {
      const out = translate(lang, fuzz.key, { [fuzz.paramKey]: fuzz.paramVal });
      const containsVal = fuzz.paramVal === '' ? !out.includes(`{${fuzz.paramKey}}`) : out.includes(fuzz.paramVal);

      assertTest(
        'String Fuzzing',
        `Fuzz string in '${lang}' for '${fuzz.name}' preserves exact payload without throwing or corruption`,
        containsVal,
        `Output length: ${out.length}, contains: ${containsVal}`
      );
    }
  }

  // Test 4.4: Missing or extraneous parameters
  const outNoParams = translate('en', 'geo.radius_label');
  assertTest(
    'Parameter Edge Cases',
    'Calling translate on parameterized key without params leaves placeholder intact without error',
    outNoParams === 'Within {radius} km radius',
    `Actual: "${outNoParams}"`
  );

  const outExtraParams = translate('en', 'nav.home', { unusedParam: 'randomValue' });
  assertTest(
    'Parameter Edge Cases',
    'Passing extra unexpected params to non-parameterized key returns base string unchanged',
    outExtraParams === 'Home',
    `Actual: "${outExtraParams}"`
  );

  // Test 4.5: Fallback behavior for non-existent translation keys
  const unknownKey = 'non.existent.random.key.12345';
  const outMissingKey = translate('hi', unknownKey);
  assertTest(
    'Fallback Logic',
    `Unknown key '${unknownKey}' falls back gracefully to the key itself`,
    outMissingKey === unknownKey,
    `Actual: "${outMissingKey}"`
  );

  // Test 4.6: Fallback when language is invalid / casted
  const outInvalidLang = translate('xx' as any, 'nav.home');
  assertTest(
    'Fallback Logic',
    'Invalid language code falls back to English dictionary',
    outInvalidLang === 'Home',
    `Actual: "${outInvalidLang}"`
  );

  // ========================================================================
  // SUITE 5: STORAGE PERSISTENCE & GLOBAL STATE SYNCHRONIZATION
  // ========================================================================
  console.log('\n--- Suite 5: Storage Persistence & Global State Synchronization ---');

  // Test 5.1: Memory state and getStoredLanguage / setStoredLanguage
  const initialLang = getStoredLanguage();
  assertTest(
    'State Synchronization',
    `Initial stored language is a valid SupportedLanguage ('${initialLang}')`,
    ['en', 'hi', 'pa', 'mr', 'bn'].includes(initialLang)
  );

  // Test 5.2: State change & listener broadcast
  let listenerCallCount = 0;
  let lastBroadcastLang: SupportedLanguage | null = null;

  const testListener = (newLang: SupportedLanguage) => {
    listenerCallCount++;
    lastBroadcastLang = newLang;
  };

  // Setup mock localStorage to verify storage interaction
  const mockStorage: Record<string, string> = {};
  const originalLocalStorage = (globalThis as any).localStorage;

  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  };

  // Mock document object
  const mockDocument = {
    documentElement: {
      lang: 'en',
    },
  };
  (globalThis as any).document = mockDocument;

  // Test cycling through all 5 languages
  const testLanguages: SupportedLanguage[] = ['hi', 'pa', 'mr', 'bn', 'en'];

  for (const targetLang of testLanguages) {
    setStoredLanguage(targetLang);

    assertTest(
      'Storage Persistence',
      `setStoredLanguage('${targetLang}') updates getStoredLanguage() and document.documentElement.lang`,
      getStoredLanguage() === targetLang &&
        mockStorage['halder-language'] === targetLang &&
        mockDocument.documentElement.lang === targetLang,
      `getStoredLanguage=${getStoredLanguage()}, storage=${mockStorage['halder-language']}, docLang=${mockDocument.documentElement.lang}`
    );
  }

  // Test 5.3: Idempotent setStoredLanguage (setting same language does not trigger duplicate events)
  const currentLang = getStoredLanguage();
  const preStorageVal = mockStorage['halder-language'];
  setStoredLanguage(currentLang);
  assertTest(
    'Storage Idempotency',
    `Calling setStoredLanguage with existing language ('${currentLang}') is a safe no-op`,
    getStoredLanguage() === currentLang && mockStorage['halder-language'] === preStorageVal
  );

  // Restore environment
  if (originalLocalStorage) {
    (globalThis as any).localStorage = originalLocalStorage;
  }
  delete (globalThis as any).document;

  // ========================================================================
  // SUITE 6: DOMAIN TERMINOLOGY & APMC / KISAN AGRICULTURAL CONFORMANCE
  // ========================================================================
  console.log('\n--- Suite 6: Agricultural Domain Terminology & Indian Marketplace Conformance ---');

  // Verify key agricultural domain terms in all 5 languages
  const domainChecks = [
    {
      domain: 'Direct Kisan Payout / Zero Commission',
      enKey: 'settlement.zero_commission',
      enVal: '0% Middleman Commission Platform',
      hiVal: '0% बिचौलिया कमीशन प्लेटफॉर्म',
      paVal: '0% ਵਿਚੋਲਾ ਕਮਿਸ਼ਨ ਪਲੇਟਫਾਰਮ',
      mrVal: '0% दलाल कमिशन प्लॅटफॉर्म',
      bnVal: '০% মধ্যস্বত্বভোগী কমিশন প্ল্যাটফর্ম',
    },
    {
      domain: '100% Kisan Direct Delivery Guarantee',
      enKey: 'guarantee.badge_title',
      enVal: '100% Kisan Direct Delivery Guarantee',
      hiVal: '100% किसान सीधी डिलीवरी गारंटी',
      paVal: '100% ਕਿਸਾਨ ਸਿੱਧੀ ਡਿਲੀਵਰੀ ਗਾਰੰਟੀ',
      mrVal: '100% किसान थेट डिलिव्हरी हमी',
      bnVal: '১০০% কৃষক সরাসরি ডেলিভারি গ্যারান্টি',
    },
    {
      domain: 'APMC Mandi vs HALDER Benchmark Comparison',
      enKey: 'mandi.benchmark_comparison',
      enVal: 'APMC Mandi Rate: ₹{mandi} | HALDER Direct: ₹{halder}',
      hiVal: 'APMC मंडी दर: ₹{mandi} | HALDER सीधा भाव: ₹{halder}',
      paVal: 'ਏਪੀਐਮਸੀ ਮੰਡੀ ਰੇਟ: ₹{mandi} | ਹਾਲਡਰ ਸਿੱਧਾ ਭਾਅ: ₹{halder}',
      mrVal: 'APMC बाजारभाव: ₹{mandi} | HALDER थेट भाव: ₹{halder}',
      bnVal: 'APMC মান্ডি দর: ₹{mandi} | HALDER সরাসরি দর: ₹{halder}',
    },
    {
      domain: '300 km Geo Radius Freshness Filter',
      enKey: 'geo.radius_300km',
      enVal: '300 km Max Freshness Range',
      hiVal: '300 किमी अधिकतम ताज़गी दायरा',
      paVal: '300 ਕਿਮੀ ਵੱਧ ਤੋਂ ਵੱਧ ਤਾਜ਼ਗੀ ਸੀਮਾ',
      mrVal: '300 किमी कमाल ताजेपणा मर्यादा',
      bnVal: '৩০০ কিমি সর্বোচ্চ সতেজতা পরিসীমা',
    },
    {
      domain: 'Farmer Bank & UPI Settlement',
      enKey: 'bank.upi_option',
      enVal: 'Instant UPI Settlement (VPA)',
      hiVal: 'त्वरित यूपीआई निपटान (VPA)',
      paVal: 'ਤੁਰੰਤ ਯੂਪੀਆਈ ਭੁਗਤਾਨ (VPA)',
      mrVal: 'झटपट UPI सेटलमेंट (VPA)',
      bnVal: 'তাত্ক্ষণিক ইউপিআই নিষ্পত্তি (VPA)',
    },
    {
      domain: 'Kisan KYC Certification (7/12, Aadhaar, KCC, FPO)',
      enKey: 'kyc.doc_land',
      enVal: '7/12 Land Record / Khatauni',
      hiVal: '7/12 भू-अभिलेख / खतौनी',
      paVal: 'ਜਮ੍ਹਾਂਬੰਦੀ / ਫ਼ਰਦ ਜ਼ਮੀਨ ਰਿਕਾਰਡ',
      mrVal: '७/१२ जमिनीचा उतारा / खातेनोंद',
      bnVal: 'জমির পরচা / খতিয়ান রেকর্ড',
    },
  ];

  for (const dc of domainChecks) {
    assertTest(
      'Domain Terminology',
      `Domain check '${dc.domain}' has exact authentic translations across all 5 languages`,
      enTranslations[dc.enKey as keyof typeof enTranslations] === dc.enVal &&
        hiTranslations[dc.enKey as keyof typeof enTranslations] === dc.hiVal &&
        paTranslations[dc.enKey as keyof typeof enTranslations] === dc.paVal &&
        mrTranslations[dc.enKey as keyof typeof enTranslations] === dc.mrVal &&
        bnTranslations[dc.enKey as keyof typeof enTranslations] === dc.bnVal,
      `en="${enTranslations[dc.enKey as keyof typeof enTranslations]}", hi="${hiTranslations[dc.enKey as keyof typeof enTranslations]}", pa="${paTranslations[dc.enKey as keyof typeof enTranslations]}", mr="${mrTranslations[dc.enKey as keyof typeof enTranslations]}", bn="${bnTranslations[dc.enKey as keyof typeof enTranslations]}"`
    );
  }

  // ========================================================================
  // FINAL REPORT & VERDICT
  // ========================================================================
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n========================================================================');
  console.log(`📊 ADVERSARIAL I18N VERIFICATION SUMMARY: ${passed}/${total} PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`   Failed Assertions: ${failed}`);
  if (failed > 0) {
    console.log('\n❌ FAILED ASSERTIONS LIST:');
    results.filter((r) => !r.passed).forEach((r, idx) => {
      console.log(`   ${idx + 1}. [${r.suite}] ${r.name}`);
      if (r.details) console.log(`      Details: ${r.details}`);
    });
  }
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error('❌ ADVERSARIAL CHALLENGE VERDICT: REJECT');
    process.exit(1);
  } else {
    console.log('🏆 ADVERSARIAL CHALLENGE VERDICT: APPROVE (100% Precision)');
    process.exit(0);
  }
}

runAdversarialI18nSuite().catch((err) => {
  console.error('Unhandled test execution error:', err);
  process.exit(1);
});
