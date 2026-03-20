const TARGET_HOST = 'ais-pre-w3wueazt4fuychc3phhgme-391293482597.europe-west2.run.app';
const CUSTOM_DOMAIN = 'links.pixellink.co.uk';

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const targetUrl = `https://${TARGET_HOST}${url.pathname}${url.search}`;

  // 1. CLEAN HEADERS (Bypass Google's Proxy Detection)
  const cleanHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    const k = key.toLowerCase();
    // Strip Vercel/Cloudflare headers that trigger the 404
    if (!k.startsWith('x-vercel') && !k.startsWith('x-forwarded') && k !== 'host' && k !== 'connection') {
      cleanHeaders[key] = value;
    }
  }
  cleanHeaders['host'] = TARGET_HOST;
  cleanHeaders['user-agent'] = req.headers['user-agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: cleanHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.arrayBuffer() : undefined,
      redirect: 'manual'
    });

    // 2. HANDLE REDIRECTS
    if (response.status >= 300 && response.status < 400) {
      let location = response.headers.get('location');
      if (location && location.includes(TARGET_HOST)) {
        location = location.replace(TARGET_HOST, CUSTOM_DOMAIN);
        res.setHeader('location', location);
      }
    }

    // 3. COPY HEADERS
    response.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k !== 'content-encoding' && k !== 'transfer-encoding' && k !== 'content-length') {
        res.setHeader(key, value);
      }
    });

    // 4. REWRITE BODY (Links)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html') || contentType.includes('javascript') || contentType.includes('json')) {
      let body = await response.text();
      body = body.split(TARGET_HOST).join(CUSTOM_DOMAIN);
      return res.status(response.status).send(body);
    }

    const buffer = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).send(`Proxy Error: ${error.message}`);
  }
}
