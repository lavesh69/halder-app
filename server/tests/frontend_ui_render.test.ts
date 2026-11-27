import assert from 'node:assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Product } from '../../src/types';

function setupMockBrowserGlobals() {
  const store = new Map<string, string>();
  const mockStorage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, val: string) => {
      store.set(key, String(val));
    },
  };

  const classListSet = new Set<string>();
  const mockDoc = {
    documentElement: {
      lang: 'en',
      dir: 'ltr',
      classList: {
        add: (cls: string) => classListSet.add(cls),
        remove: (cls: string) => classListSet.delete(cls),
        toggle: (cls: string, force?: boolean) => {
          if (force === undefined) {
            if (classListSet.has(cls)) classListSet.delete(cls);
            else classListSet.add(cls);
          } else if (force) {
            classListSet.add(cls);
          } else {
            classListSet.delete(cls);
          }
        },
        contains: (cls: string) => classListSet.has(cls),
      },
    },
  };

  const mockWindow = {
    location: {
      origin: 'https://halder-app.vercel.app',
      hostname: 'halder-app.vercel.app',
      port: '',
      href: 'https://halder-app.vercel.app/',
      pathname: '/',
      search: '',
      assign: () => {},
    },
    history: {
      replaceState: () => {},
      pushState: () => {},
    },
    matchMedia: () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };

  Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, configurable: true });
  Object.defineProperty(globalThis, 'document', { value: mockDoc, configurable: true });
  Object.defineProperty(globalThis, 'window', { value: mockWindow, configurable: true });
}

async function runFrontendUiTests() {
  console.log('\n=============================================================');
  console.log('🧪 HALDHAR FRONTEND UI RENDERING & COMPONENT SUITE');
  console.log('=============================================================\n');

  setupMockBrowserGlobals();

  const { AppProvider } = await import('../../src/context/AppContext');
  const { ThemeProvider } = await import('../../src/context/ThemeContext');
  const {
    LanguageProvider,
    ensureLanguageLoaded,
  } = await import('../../src/i18n');
  const { CustomerProfileView } = await import('../../src/components/customer/CustomerProfileView');
  const { ListingCard } = await import('../../src/components/common/ListingCard');
  const { MarketplaceHome } = await import('../../src/components/customer/MarketplaceHome');
  const { AdminBackendDataView } = await import('../../src/components/admin/AdminBackendDataView');
  const { AdminDeviceBansTab } = await import('../../src/components/admin/AdminDeviceBansTab');
  const { AdminKycViewerModal } = await import('../../src/components/admin/AdminKycViewerModal');
  const {
    isDummyOrTestAccount,
    mapBackendProduct,
    nextGeneratedId,
  } = await import('../../src/context/appContextUtils');

  let passed = 0;
  let failed = 0;

  function testCase(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}: ${err?.message || err}`);
      failed++;
    }
  }

  const wrapWithProviders = (node: React.ReactElement, lang: 'en' | 'hi' | 'pa' | 'ur' = 'en') =>
    React.createElement(
      LanguageProvider,
      { initialLanguage: lang },
      React.createElement(ThemeProvider, null, React.createElement(AppProvider, null, node))
    );

  // Preload non-English translation bundles before SSR assertions
  await Promise.all([
    ensureLanguageLoaded('hi'),
    ensureLanguageLoaded('pa'),
    ensureLanguageLoaded('ur'),
  ]);

  testCase('1. CustomerProfileView renders localized auth.logout across English, Hindi, Punjabi, Urdu', () => {
    globalThis.localStorage.setItem('halder-loggedin', 'true');
    const expectations: Array<{ lang: 'en' | 'hi' | 'pa' | 'ur'; expected: string }> = [
      { lang: 'en', expected: 'Log Out' },
      { lang: 'hi', expected: 'लॉग आउट' },
      { lang: 'pa', expected: 'ਲੌਗ ਆਉਟ' },
      { lang: 'ur', expected: 'لاگ آؤٹ' },
    ];
    for (const item of expectations) {
      const html = renderToStaticMarkup(
        wrapWithProviders(React.createElement(CustomerProfileView), item.lang)
      );
      assert(!html.includes('auth.logout'), `Raw key auth.logout leaked in ${item.lang}`);
      assert(html.includes(item.expected), `Missing localized "${item.expected}" in ${item.lang}`);
    }
  });

  testCase('2. ListingCard hides produce currency prices in buyer views', () => {
    const sampleProduct: Product = {
      id: 'prod-ui-1',
      farmerId: 'farmer-1',
      farmerName: 'Kishan Singh',
      farmName: 'Himalayan Valley Farm',
      farmerAvatar: 'https://example.com/avatar.jpg',
      category: 'Vegetables',
      name: 'Fresh Red Tomatoes',
      description: 'Harvested this morning',
      price: 45,
      unit: 'kg',
      availableQuantity: 120,
      image: 'https://example.com/tomato.jpg',
      isOrganic: true,
      isAvailableToday: true,
      location: 'Dehradun',
      city: 'Dehradun',
      distanceKm: 4.2,
      rating: 4.9,
      isAvailable: true,
    };

    const htmlFeed = renderToStaticMarkup(
      wrapWithProviders(React.createElement(ListingCard, { product: sampleProduct, variant: 'vertical-feed' }))
    );
    const htmlGrid = renderToStaticMarkup(
      wrapWithProviders(React.createElement(ListingCard, { product: sampleProduct, variant: 'compact-grid' }))
    );
    assert(htmlFeed.includes('Fresh Red Tomatoes'));
    assert(htmlGrid.includes('Fresh Red Tomatoes'));
    assert(!htmlFeed.includes('₹'), 'Buyer feed card must not expose ₹ produce price');
    assert(!htmlGrid.includes('₹'), 'Buyer grid card must not expose ₹ produce price');
  });

  testCase('3. MarketplaceHome renders HALDHAR branding without legacy HALDER footer typo', () => {
    const html = renderToStaticMarkup(wrapWithProviders(React.createElement(MarketplaceHome)));
    assert(html.includes('HALDHAR'), 'Expected HALDHAR branding in MarketplaceHome');
    assert(!html.includes('HALDER Agricultural Marketplace'), 'Found legacy HALDER typo in footer');
  });

  testCase('4. AdminBackendDataView never pre-fills hardcoded demo password', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminBackendDataView, { showToast: () => {} })
    );
    assert(!html.includes('halder123'), 'AdminBackendDataView leaked hardcoded demo password');
  });

  testCase('5. AdminDeviceBansTab renders clean single console and device ban rows', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminDeviceBansTab, {
        bannedDevicesList: [
          {
            id: 'ban-1',
            device_id: 'dev-fp-9988',
            user_name: 'Fraud Actor',
            user_phone: '+919999999999',
            device_model: 'Pixel 8',
            reason: 'Repeated counterfeit listings',
            banned_at: '2026-11-20T10:00:00Z',
          },
        ],
        manualDeviceIdInput: '',
        setManualDeviceIdInput: () => {},
        banReasonInput: 'Fraud',
        setBanReasonInput: () => {},
        banTarget: null,
        isBanningInProgress: false,
        deviceBanSearch: '',
        setDeviceBanSearch: () => {},
        onRefresh: () => {},
        onConfirmDeviceBan: () => {},
        onUnbanDevice: () => {},
      })
    );
    const headerMatches = html.match(/Permanent Hardware Device Bans/g) || [];
    assert.strictEqual(headerMatches.length, 1, 'Device Bans section should render once, not duplicated');
    assert(html.includes('dev-fp-9988'));
    assert(html.includes('Unban Hardware'));
  });

  testCase('6. AdminKycViewerModal renders honest no-phone message when farmer phone is missing', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminKycViewerModal, {
        inspectingKycDoc: {
          id: 'farmer-kyc-42',
          farmer_name: 'Sohan Lal',
          farm_name: 'Green Ridge',
          city: 'Nainital',
          location: 'Haldwani Road',
          kyc_document_number: '1234-5678-9012',
        },
        onClose: () => {},
        onRejectClick: () => {},
        onApproveKyc: () => {},
      })
    );
    assert(html.includes('Sohan Lal'));
    assert(html.includes('No phone number on file'));
    assert(!html.includes('9876543210'), 'Must not fall back to fake phone 9876543210');
  });

  testCase('7. appContextUtils: coordinate distance, dummy filter, and unique ID generation work accurately', () => {
    const mapped = mapBackendProduct(
      {
        id: 'prod-1',
        name: 'Apples',
        price: 0,
        unit: 'kg',
        available_quantity: 50,
        farmer_id: 'farmer-1',
        farmer_name: 'Rajesh',
        farm_name: 'Orchard',
        location: 'Mussoorie',
        latitude: 30.4598,
        longitude: 78.0644,
        image: 'https://example.com/a.jpg',
      },
      { lat: 30.3165, lng: 78.0322 }
    );
    assert(mapped.distanceKm > 10 && mapped.distanceKm < 25, `Unexpected distanceKm=${mapped.distanceKm}`);
    assert.strictEqual(isDummyOrTestAccount({ id: 'test-123', name: 'Test User', email: 'test@example.com' }), true);
    assert.strictEqual(isDummyOrTestAccount({ id: 'user-cust-1', name: 'Aman', email: 'aman@halder.com' }), false);
    assert.notStrictEqual(nextGeneratedId('prod'), nextGeneratedId('prod'));
  });

  console.log('\n=============================================================');
  console.log(`📊 FRONTEND UI RENDER SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runFrontendUiTests().catch((err) => {
  console.error('Fatal frontend UI test error:', err);
  process.exit(1);
});
