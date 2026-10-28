import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({
          exists: false,
          message: 'Email is required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // WooCommerce API 配置
    const WC_URL = import.meta.env.WC_STORE_URL || import.meta.env.WC_URL;
    const WC_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // 搜索用户
    const searchUrl = `${WC_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`;
    const auth = btoa(`${WC_KEY}:${WC_SECRET}`);

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('WooCommerce API error:', response.status);
      return new Response(
        JSON.stringify({
          exists: false,
          message: 'Failed to check email',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const users = await response.json();

    return new Response(
      JSON.stringify({
        exists: users.length > 0,
        email: email,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Check email error:', error);
    return new Response(
      JSON.stringify({
        exists: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
