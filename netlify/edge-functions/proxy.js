export default async (request, context) => {
  const TARGET_HOST = 'ais-pre-w3wueazt4fuychc3phhgme-391293482597.europe-west2.run.app';
  const CUSTOM_DOMAIN = 'links.pixellink.co.uk';

  const url = new URL(request.url);
  const targetUrl = `https://${TARGET_HOST}${url.pathname}${url.search}`;

  // 1. CLEAN HEADERS (The "Stealth" part)
  const cleanHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const k = key.toLowerCase();
    // Strip Netlify and proxy headers that Google blocks
    if (!k.startsWith('x-nf') && !k.startsWith('x-forwarded') && k !== 'host') {
      cleanHeaders.set(key, value);
    }
  }
  cleanHeaders.set('Host', TARGET_HOST);

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: cleanHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.blob() : null,
      redirect: 'manual'
    });

    const respHeaders = new Headers(response.headers);

    // 2. HANDLE REDIRECTS
    if (response.status >= 300 && response.status < 400) {
      let location = response.headers.get('Location');
      if (location && location.includes(TARGET_HOST)) {
        location = location.replace(TARGET_HOST, CUSTOM_DOMAIN);
        respHeaders.set('Location', location);
      }
    }

    // 3. REWRITE BODY (Links)
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('text/html') || contentType.includes('javascript') || contentType.includes('json')) {
      let body = await response.text();
      body = body.split(TARGET_HOST).join(CUSTOM_DOMAIN);
      return new Response(body, { status: response.status, headers: respHeaders });
    }

    return new Response(response.body, { status: response.status, headers: respHeaders });
  } catch (err) {
    return new Response("Proxy Error: " + err.message, { status: 500 });
  }
};
