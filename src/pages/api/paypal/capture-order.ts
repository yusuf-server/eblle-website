/**
 * 捕获 PayPal 订单并在捕获成功后安全更新 WooCommerce 订单
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

interface RequestBody {
  paypalOrderId: string;
  orderId: number;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = getEnv(locals);
    const validation = validateEnv(env, true);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const PAYPAL_MODE = env.PAYPAL_MODE || 'sandbox';
    const PAYPAL_API_URL = PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const { paypalOrderId, orderId } = await request.json() as RequestBody;

    if (!paypalOrderId || !orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

    // 1. 幂等性验证：先检查订单状态
    const checkRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { 'Authorization': `Basic ${wcAuth}` }
    });

    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing.status === 'processing' || existing.status === 'completed') {
        return new Response(
          JSON.stringify({ success: true, message: 'Already processed', captureId: existing.transaction_id }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. 获取 PayPal Access Token
    const authRes = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authRes.ok) throw new Error('PayPal authorization failed');
    const authData = await authRes.json();

    // 3. 执行捕获
    const captureRes = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
      },
    });

    const captureData = await captureRes.json();

    if (!captureRes.ok) {
      console.error('❌ PayPal Capture Error:', captureData);
      return new Response(
        JSON.stringify({
          error: 'Capture rejected',
          paypalError: {
            name: captureData.name,
            message: captureData.message,
            details: captureData.details || []
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || captureData.id;
    console.log('✅ PayPal 捕获成功，Capture ID:', captureId);

    // 4. 🔴 关键修复：在 Cloudflare Worker 中必须 await 确保 WooCommerce 同步更新完成
    // 绝不能做悬空 Promise，否则 Worker 提前退出会导致更新被中断
    console.log(`📦 正在同步更新 WooCommerce 订单 ${orderId} 为 processing...`);

    const wcUpdateRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify({
        status: 'processing',
        set_paid: true,
        transaction_id: captureId,
        meta_data: [
          { key: '_paypal_capture_id', value: captureId },
          { key: '_paypal_payment_status', value: 'COMPLETED' },
          { key: '_paypal_captured_at', value: new Date().toISOString() }
        ]
      }),
    });

    if (!wcUpdateRes.ok) {
      const wcError = await wcUpdateRes.json().catch(() => ({}));
      console.error('⚠️ WooCommerce 订单更新返回非 200，但 PayPal 已经扣款:', wcError);
    } else {
      console.log(`✅ WooCommerce 订单 ${orderId} 已成功同步为 processing`);
    }

    return new Response(
      JSON.stringify({ success: true, captureId: captureId, status: 'COMPLETED' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Capture Order Failed:', error);
    return new Response(
      JSON.stringify({ error: 'Capture Error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};