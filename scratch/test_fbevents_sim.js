import { JSDOM } from 'jsdom';

async function testFbEvents() {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, {
    url: "https://www.rangao.bd/",
    referrer: "https://www.rangao.bd/",
    contentType: "text/html",
    runScripts: "dangerously",
    resources: "usable"
  });

  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;
  global.location = window.location;

  // Intercept all network requests / Image creation / fetch / sendBeacon
  const networkRequests = [];

  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    networkRequests.push({ type: 'fetch', url: args[0], body: args[1] });
    return originalFetch ? originalFetch.apply(this, args) : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  };

  if (window.navigator) {
    window.navigator.sendBeacon = function(url, data) {
      networkRequests.push({ type: 'sendBeacon', url, data });
      return true;
    };
  }

  // Monitor Image src
  const origImage = window.Image;
  window.Image = function() {
    const img = new origImage();
    Object.defineProperty(img, 'src', {
      set(val) {
        networkRequests.push({ type: 'image', url: val });
        this.setAttribute('src', val);
      },
      get() {
        return this.getAttribute('src');
      }
    });
    return img;
  };

  // Step 1: Initialize fbq stub as in standard snippet
  (function(f,b,e,v,n,t,s){
    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    b.head.appendChild(t);
  })(window, window.document,'script','https://connect.facebook.net/en_US/fbevents.js');

  console.log('Stub created. typeof window.fbq:', typeof window.fbq);
  console.log('window.fbq.loaded:', window.fbq.loaded);
  console.log('window.fbq.version:', window.fbq.version);
  console.log('window.fbq.callMethod:', typeof window.fbq.callMethod);

  // Init Pixel
  window.fbq('init', '1862583688445311');
  window.fbq('track', 'PageView');

  console.log('Queued commands in stub:', window.fbq.queue);

  // Fetch and eval real fbevents.js
  const fbeventsRes = await fetch('https://connect.facebook.net/en_US/fbevents.js');
  const fbeventsCode = await fbeventsRes.text();
  console.log('Evaluating fbevents.js...');
  
  window.eval(fbeventsCode);

  console.log('After fbevents.js load:');
  console.log('typeof window.fbq.callMethod:', typeof window.fbq.callMethod);
  console.log('window.fbq.getState():', window.fbq.getState ? window.fbq.getState() : 'N/A');

  // Test Minimal Purchase BDT
  console.log('\n--- Testing Minimal Purchase BDT ---');
  window.fbq('track', 'Purchase', { value: 780, currency: 'BDT' }, { eventID: 'evt_purchase_BROWSER_TEST_001' });

  // Test Minimal Purchase USD
  console.log('\n--- Testing Minimal Purchase USD ---');
  window.fbq('track', 'Purchase', { value: 780, currency: 'USD' }, { eventID: 'evt_purchase_BROWSER_TEST_USD_001' });

  // Test ViewContent & AddToCart
  console.log('\n--- Testing ViewContent & AddToCart ---');
  window.fbq('track', 'ViewContent', {}, { eventID: 'evt_browser_test_viewcontent_001' });
  window.fbq('track', 'AddToCart', { value: 650, currency: 'BDT' }, { eventID: 'evt_browser_test_cart_001' });

  // Test Full Production Payload
  console.log('\n--- Testing Full Production Payload ---');
  window.fbq('track', 'Purchase', {
    content_ids: ['PROD-123'],
    content_type: 'product',
    contents: [{ id: 'PROD-123', quantity: 1, item_price: 2450 }],
    value: 2450,
    currency: 'BDT',
    num_items: 1,
    order_id: 'ORD-260821-5589'
  }, { eventID: 'evt_purchase_ORD-260821-5589' });

  // Wait a tick for microtasks
  await new Promise(r => setTimeout(r, 500));

  console.log('\n--- Captured Network Requests (' + networkRequests.length + ') ---');
  for (const req of networkRequests) {
    console.log(`[${req.type}] ${req.url}`);
    if (req.url.includes('tr')) {
      const u = new URL(req.url);
      console.log('  -> ev:', u.searchParams.get('ev'), '| id:', u.searchParams.get('id'), '| eid:', u.searchParams.get('eid'), '| cd:', u.searchParams.get('cd[currency]'), u.searchParams.get('cd[value]'));
    }
  }
}

testFbEvents().catch(console.error);
