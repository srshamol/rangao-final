const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

// Helper to decode base64url string
function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  try {
    return atob(base64);
  } catch (e) {
    // Edge runtime compatibility fallback for atob
    return Buffer.from(base64, 'base64').toString('binary');
  }
}

// Zero-dependency JWT verification using standard Web Crypto API
async function verifyJwt(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    // Import HMAC key using SHA-256
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode signature
    const signatureStr = base64urlDecode(signatureB64);
    const signatureBytes = new Uint8Array(signatureStr.split('').map(c => c.charCodeAt(0)));

    // Verify HMAC-SHA256 signature
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      enc.encode(message)
    );

    if (!isValid) return null;

    // Decode and parse payload
    const payloadJson = base64urlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);

    // Verify expiration claim
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return null;
    }

    return payload;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
}

// Helper to get cookie value by name from request
function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.substring(name.length + 1);
    }
  }
  return undefined;
}

export async function middleware(req: Request) {
  const url = new URL(req.url);
  const { pathname } = url;

  // Bot/Crawler detection
  const userAgent = req.headers.get('user-agent')?.toLowerCase() || '';
  const bots = [
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'pinterest',
    'slackbot',
    'discordbot',
    'googlebot',
    'bingbot',
    'yandexbot',
    'whatsapp'
  ];
  const isBot = bots.some(bot => userAgent.includes(bot));

  if (isBot) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yglexjxvypwmvjvsspil.supabase.co';
      const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_wiK1UV-Hm9bP3qeC1Uns2g_qWZ4fY7-';

      // 1. Fetch index.html template from the site origin
      const htmlResponse = await fetch(new URL('/index.html', req.url));
      if (htmlResponse.ok) {
        let html = await htmlResponse.text();

        // 2. Identify if this is a product detail page
        let isProductPage = false;
        let productIdOrSku = '';
        const parts = pathname.split('/').filter(Boolean);
        if (parts[0] === 'product' && parts[1]) {
          isProductPage = true;
          productIdOrSku = parts[1];
        } else if (parts.length === 2 && !['admin', 'api', 'assets', 'product'].includes(parts[0])) {
          isProductPage = true;
          productIdOrSku = parts[1];
        }

        let siteTitle = "Rangao — প্রিমিয়াম ইসলামিক ও হোম ডেকোর";
        let siteDesc = "Rangao (রাঙাও) — বাংলাদেশের সেরা প্রিমিয়াম ইসলামিক ওয়াল আর্ট, কাঠের ডেকোর, ক্যানভাস ও লাইফস্টাইল ডেকোর শপ।";
        let siteImage = "https://www.rangao.bd/brand/rangao-og-default.png";
        let fbAppId = "";

        // Get global configurations
        let seoSettings: any = {};
        let storeInfo: any = {};
        try {
          const settingsRes = await fetch(`${supabaseUrl}/rest/v1/store_settings?key=in.(seo_settings,store_info,homepage_seo)`, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`
            }
          });
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (Array.isArray(settingsData)) {
              const seoRow = settingsData.find(row => row.key === 'seo_settings');
              const storeRow = settingsData.find(row => row.key === 'store_info');
              seoSettings = seoRow?.value || {};
              storeInfo = storeRow?.value || {};

              siteTitle = seoSettings.site_title || storeInfo.name || siteTitle;
              siteDesc = seoSettings.site_description || storeInfo.tagline || siteDesc;
              siteImage = seoSettings.og_image || storeInfo.logo_url || siteImage;
              fbAppId = seoSettings.fb_app_id || storeInfo.tracking?.meta_pixel_id || "";
            }
          }
        } catch (e) {
          console.error('Error fetching general SEO settings for bot:', e);
        }

        if (isProductPage && productIdOrSku) {
          // Fetch product data
          try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productIdOrSku);
            let queryUrl = `${supabaseUrl}/rest/v1/products?sku=eq.${productIdOrSku}&select=*`;
            if (isUuid) {
              queryUrl = `${supabaseUrl}/rest/v1/products?id=eq.${productIdOrSku}&select=*`;
            }

            const prodRes = await fetch(queryUrl, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
              }
            });

            let productData: any = null;
            if (prodRes.ok) {
              const prods = await prodRes.json();
              if (prods && prods.length > 0) {
                productData = prods[0];
              }
            }

            // Fallback for slugified names
            if (!productData && !isUuid) {
              const allProdsRes = await fetch(`${supabaseUrl}/rest/v1/products?status=eq.active&select=*`, {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`
                }
              });
              if (allProdsRes.ok) {
                const allProds = await allProdsRes.json();
                productData = allProds?.find((p: any) => {
                  const skuSlug = p.sku ? p.sku.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") : "";
                  const nameSlug = p.name ? p.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") : "";
                  return skuSlug === productIdOrSku.toLowerCase() || nameSlug === productIdOrSku.toLowerCase();
                });
              }
            }

            if (productData) {
              const storeName = storeInfo.name || "Rangao";
              siteTitle = `${productData.name} | ${storeName}`;
              siteDesc = productData.description || siteDesc;
              if (Array.isArray(productData.images) && productData.images.length > 0) {
                siteImage = productData.images[0];
              } else if (productData.image_url) {
                siteImage = productData.image_url;
              }
            }
          } catch (e) {
            console.error('Error fetching product data for bot:', e);
          }
        }

        // 3. Inject tags into HTML response
        html = html.replace(/<title>.*?<\/title>/i, `<title>${siteTitle}</title>`);
        html = html.replace(/<meta\s+name=["']description["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="description" content="${siteDesc.replace(/"/g, '&quot;')}" />`);
        
        // Open Graph Meta Tags
        html = html.replace(/<meta\s+property=["']og:title["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:title" content="${siteTitle.replace(/"/g, '&quot;')}" />`);
        html = html.replace(/<meta\s+property=["']og:description["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:description" content="${siteDesc.replace(/"/g, '&quot;')}" />`);
        html = html.replace(/<meta\s+property=["']og:image["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:image" content="${siteImage}" />`);
        html = html.replace(/<meta\s+property=["']og:url["']\s+content=["'].*?["']\s*\/?>/i, `<meta property="og:url" content="${req.url}" />`);
        
        // Twitter Meta Tags
        html = html.replace(/<meta\s+name=["']twitter:title["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="twitter:title" content="${siteTitle.replace(/"/g, '&quot;')}" />`);
        html = html.replace(/<meta\s+name=["']twitter:description["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="twitter:description" content="${siteDesc.replace(/"/g, '&quot;')}" />`);
        html = html.replace(/<meta\s+name=["']twitter:image["']\s+content=["'].*?["']\s*\/?>/i, `<meta name="twitter:image" content="${siteImage}" />`);

        // Inject fb:app_id right after og:type if available
        if (fbAppId) {
          html = html.replace(
            /<meta\s+property=["']og:type["']\s+content=["']website["']\s*\/?>/i,
            `<meta property="og:type" content="website" />\n    <meta property="fb:app_id" content="${fbAppId}" />`
          );
        }

        return new Response(html, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        });
      }
    } catch (err) {
      console.error("Bot rewrite failed:", err);
    }
  }

  // Only protect /admin routes, excluding login static assets & login page itself
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = getCookie(req, 'sb-admin-auth-token');

    if (!token) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return Response.redirect(loginUrl.toString(), 307);
    }

    if (!JWT_SECRET) {
      console.warn('SUPABASE_JWT_SECRET environment variable is missing on Vercel.');
      // Secure default: If the secret is missing in prod, redirect to login rather than allowing access
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return Response.redirect(loginUrl.toString(), 307);
    }

    const payload = await verifyJwt(token, JWT_SECRET);
    const role = payload?.app_metadata?.role;
    const STAFF_ROLES = ['super_admin', 'admin', 'moderator', 'support', 'delivery_staff', 'manager', 'editor', 'sales', 'marketing', 'accountant'];

    if (!payload || !STAFF_ROLES.includes(role)) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return Response.redirect(loginUrl.toString(), 307);
    }
  }

  // Instruct Vercel to continue request processing
  return new Response(null, {
    headers: {
      'x-middleware-next': '1',
    },
  });
}

// Config to optimize middleware execution matching paths (matches all except assets, api, static files)
export const config = {
  matcher: ['/((?!assets|api|favicon.ico|placeholder.svg).*)'],
};
