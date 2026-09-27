import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // 检查用户是否登录
    const userId = cookies.get('user_id')?.value;

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Not authenticated',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // WooCommerce API 配置
    const WC_URL = import.meta.env.WC_STORE_URL || import.meta.env.WC_URL;
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
      console.error('WooCommerce credentials not configured');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Server configuration error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取用户订单
    const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const ordersUrl = `${WC_URL}/wp-json/wc/v3/orders?customer=${userId}&per_page=100`;

    const response = await fetch(ordersUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to fetch orders',
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orders = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        orders: orders,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get orders error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
