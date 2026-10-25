/**
 * 检查 WooCommerce 订单状态并返回 PayPal 订单 ID
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const env = getEnv(locals);
    const validation = validateEnv(env, false);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    const orderKey = url.searchParams.get('orderKey');

    if (!orderId || !orderKey) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId or orderKey' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

    // 获取订单详情
    const orderRes = await fetch(
      `${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`,
      {
        headers: { 'Authorization': `Basic ${wcAuth}` }
      }
    );

    if (!orderRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const order = await orderRes.json();

    // 验证 order_key
    if (order.order_key !== orderKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid order key' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 查找 PayPal 订单 ID（从 meta_data 中）
    const paypalOrderId = order.meta_data?.find(
      (meta: any) => meta.key === '_paypal_order_id'
    )?.value;

    return new Response(
      JSON.stringify({
        orderId: order.id,
        status: order.status,
        paypalOrderId: paypalOrderId || null
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Check order error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
