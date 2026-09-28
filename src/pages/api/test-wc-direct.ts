import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const WC_STORE_URL = import.meta.env.WC_STORE_URL;
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    const url = new URL(`${WC_STORE_URL}/wp-json/wc/v3/products`);
    const isHttps = url.protocol === 'https:';

    url.searchParams.append('per_page', '5');

    console.log('Protocol:', url.protocol);
    console.log('Is HTTPS:', isHttps);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9'
    };

    if (isHttps) {
      url.searchParams.append('consumer_key', WC_CONSUMER_KEY);
      url.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
      console.log('Using URL params auth (HTTPS)');
    } else {
      const auth = btoa(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`);
      headers['Authorization'] = `Basic ${auth}`;
      console.log('Using Basic Auth (HTTP)');
    }

    console.log('Requesting:', url.toString().replace(WC_CONSUMER_KEY, 'KEY').replace(WC_CONSUMER_SECRET, 'SECRET'));

    const response = await fetch(url.toString(), { headers });

    const responseText = await response.text();

    const result = {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      isHttps,
      protocol: url.protocol,
      headers: {
        'content-type': response.headers.get('content-type'),
        'x-wp-total': response.headers.get('x-wp-total'),
        'x-wp-totalpages': response.headers.get('x-wp-totalpages')
      },
      bodyLength: responseText.length,
      bodyPreview: responseText.substring(0, 500)
    };

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        result['productsCount'] = Array.isArray(data) ? data.length : 'not an array';
        result['firstProductId'] = data[0]?.id;
        result['firstProductName'] = data[0]?.name;
      } catch (e) {
        result['parseError'] = e.message;
      }
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
