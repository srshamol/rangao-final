async function main() {
  const htmlRes = await fetch('https://www.rangao.bd/');
  console.log('--- HEADERS ---');
  for (const [k, v] of htmlRes.headers.entries()) {
    if (k.toLowerCase().includes('content-security-policy') || k.toLowerCase().includes('server')) {
      console.log(`${k}: ${v}`);
    }
  }
  const html = await htmlRes.text();
  const scriptMatch = html.match(/src="(\/assets\/index\.[^"]+\.js)"/);
  if (scriptMatch) {
    const bundleUrl = `https://www.rangao.bd${scriptMatch[1]}`;
    console.log('Fetching bundle:', bundleUrl);
    const bundleRes = await fetch(bundleUrl);
    const bundleText = await bundleRes.text();
    console.log('Bundle loaded. Length:', bundleText.length);

    // Search for connect.facebook.net
    const fbNet = bundleText.includes('connect.facebook.net');
    console.log('Includes connect.facebook.net:', fbNet);

    // Search for fbq calls
    console.log('Includes "Purchase":', bundleText.includes('"Purchase"'));
    console.log('Includes 1862583688445311:', bundleText.includes('1862583688445311'));
    console.log('Includes 18625836884445311 (invalid typo):', bundleText.includes('18625836884445311'));

    // Check fbevents.js reachability
    const fbRes = await fetch('https://connect.facebook.net/en_US/fbevents.js');
    console.log('connect.facebook.net/en_US/fbevents.js status:', fbRes.status);
    const fbText = await fbRes.text();
    console.log('fbevents.js length:', fbText.length);
  }
}

main().catch(console.error);
