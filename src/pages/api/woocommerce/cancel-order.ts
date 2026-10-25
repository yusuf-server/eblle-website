/**
 * 取消 WooCommerce 订单
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

interface RequestBody {
  orderId: number;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = getEnv(locals);
    const validation = validateEnv(env, false);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { orderId } = await request.json() as RequestBody;

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

    console.log(`🚫 取消订单 ${orderId}...`);

    // 更新订单状态为 cancelled
    const updateRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify({
        status: 'cancelled',
        meta_data: [
          { key: '_cancelled_by_user', value: 'true' },
          { key: '_cancelled_at', value: new Date().toISOString() }
        ]
      }),
    });

    if (!updateRes.ok) {
      const error = await updateRes.json();
      console.error('❌ 取消订单失败:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to cancel order', details: error }),
        { status: updateRes.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orderData = await updateRes.json();
    console.log('✅ 订单已取消:', orderData.id);

    return new Response(
      JSON.stringify({ success: true, orderId: orderData.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Cancel Order Error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
