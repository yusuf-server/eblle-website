import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, locals }) => {
  try {
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

    const env = getEnv(locals);
    const validation = validateEnv(env, false);

    if (!validation.valid) {
      console.error('WooCommerce credentials not configured');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Server configuration error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const auth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);
    const timestamp = Date.now();
    const ordersUrl = `${env.WC_STORE_URL}/wp-json/wc/v3/orders?customer=${encodeURIComponent(userId)}&per_page=100&_t=${timestamp}`;

    const response = await fetch(ordersUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
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

    // 对最近 5 笔订单直查单订单端点，防止 WordPress / SiteGround 列表缓存漏掉后台 VIP 插件动态追加的免费礼物
    if (Array.isArray(orders) && orders.length > 0) {
      const topCount = Math.min(orders.length, 5);
      const freshTopOrders = await Promise.all(
        orders.slice(0, topCount).map(async (ord: any) => {
          try {
            const singleRes = await fetch(
              `${env.WC_STORE_URL}/wp-json/wc/v3/orders/${ord.id}?_t=${Date.now()}`,
              {
                headers: {
                  Authorization: `Basic ${auth}`,
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  Pragma: 'no-cache',
                },
              }
            );
            if (singleRes.ok) {
              return await singleRes.json();
            }
          } catch {}
          return ord;
        })
      );

      for (let i = 0; i < topCount; i++) {
        orders[i] = freshTopOrders[i];
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orders,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
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