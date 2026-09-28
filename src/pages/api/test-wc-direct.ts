import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const WC_STORE_URL = import.meta.env.WC_STORE_URL;
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    const url = new URL(`${WC_STORE_URL}/wp-json/wc/v3/products`);
    url.searchParams.append('consumer_key', WC_CONSUMER_KEY);
    url.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
    url.searchParams.append('per_page', '5');

    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    console.log('Using URL params auth (no Authorization header)');
    console.log('Requesting:', url.toString().replace(WC_CONSUMER_KEY, 'KEY').replace(WC_CONSUMER_SECRET, 'SECRET'));

    const response = await fetch(url.toString(), { headers });

    const responseText = await response.text();

    const result = {
      authMethod: 'URL params (no Authorization header)',
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
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
