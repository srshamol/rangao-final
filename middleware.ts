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

// Config to optimize middleware execution matching paths
export const config = {
  matcher: ['/admin/:path*'],
};
