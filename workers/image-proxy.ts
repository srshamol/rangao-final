// Cloudflare Worker Image Proxy
// Handles: /img/products/photo.jpg?w=400&q=75&fmt=webp

export interface Env {
  // R2 bucket binding configured in wrangler.toml
  R2_BUCKET: R2Bucket;
  // Fallback bucket URL if needed
  R2_BUCKET_URL: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // We expect requests starting with /img/ or matching image extensions
    if (!pathname.startsWith('/img/')) {
      return new Response('Not Found', { status: 404 });
    }

    // Extract original file path inside R2
    // /img/products/example.jpg -> products/example.jpg
    const r2Key = pathname.substring(5); 

    if (!r2Key) {
      return new Response('Missing filename', { status: 400 });
    }

    // Parse resizing parameters
    const width = searchParams.get('w');
    const quality = searchParams.get('q') || '75';
    const format = searchParams.get('fmt'); // webp, avif, jpeg

    try {
      // 1. Fetch original file from Cloudflare R2
      const object = await env.R2_BUCKET.get(r2Key);

      if (!object) {
        return new Response('Image not found in storage', { status: 404 });
      }

      // Check if Cloudflare Image Resizing API is available (requires Cloudflare Pro/Business/Enterprise)
      // On the free tier, we can either serve the original or fetch via Cloudflare's Resize URL if configured.
      const supportsResizing = request.cf && 'image' in request.cf;

      // Define standard headers
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('Cache-Control', 'public, max-age=2592000'); // 30 days

      if (supportsResizing && (width || format)) {
        // Construct cloudflare resize options
        const resizeOptions: Record<string, any> = {
          quality: parseInt(quality, 10),
        };

        if (width) resizeOptions.width = parseInt(width, 10);
        if (format) resizeOptions.format = format;

        // Perform Cloudflare Image Resizing via fetch API
        // This is the standard pattern for Workers on accounts with Image Resizing enabled
        const resizeUrl = new URL(request.url);
        resizeUrl.pathname = `/cdn-cgi/image/${Object.entries(resizeOptions)
          .map(([k, v]) => `${k}=${v}`)
          .join(',')}/${r2Key}`;

        // Return a subrequest to the resize URL (Cloudflare caches this automatically)
        const resizedResponse = await fetch(resizeUrl.toString(), {
          headers: request.headers,
        });

        if (resizedResponse.ok) {
          const newHeaders = new Headers(resizedResponse.headers);
          newHeaders.set('Cache-Control', 'public, max-age=2592000'); // Ensure 30 days cache
          return new Response(resizedResponse.body, {
            status: resizedResponse.status,
            headers: newHeaders,
          });
        }
      }

      // 2. Fallback: serve the original image from R2 with optimized cache headers
      const mimeType = getMimeType(r2Key, format);
      headers.set('Content-Type', mimeType);

      return new Response(object.body, {
        headers,
      });
    } catch (err: any) {
      console.error('Image proxy error:', err);
      return new Response('Error rendering image', { status: 500 });
    }
  },
};

function getMimeType(filename: string, format: string | null): string {
  if (format === 'webp') return 'image/webp';
  if (format === 'avif') return 'image/avif';
  if (format === 'jpeg' || format === 'jpg') return 'image/jpeg';
  if (format === 'png') return 'image/png';

  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'webp') return 'image/webp';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

// Minimal Cloudflare R2 TypeScript type definitions for local compilation safety
interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
}
interface R2Object {
  body: ReadableStream;
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}
