/**
 * 主动向 Airwallex 查询 PaymentIntent 状态，确认 SUCCEEDED 后安全更新 WooCommerce 订单
 */
import type { APIRoute } from 'astro';
import { getEnv, validateAirwallexEnv } from '../../../lib/env';
import { getAirwallexAccessToken, getAirwallexBaseUrl } from '../../../lib/airwallex';

export const prerender = false;

interface RequestBody {
  intentId: string;
  orderId: number;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = getEnv(locals);
    const validation = validateAirwallexEnv(env);

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { intentId, orderId } = (await request.json()) as RequestBody;
    if (!intentId || !orderId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

    // 1. 幂等校验：若订单已更新过，直接返回成功
    const checkRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: `Basic ${wcAuth}` },
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing.status === 'processing' || existing.status === 'completed') {
        return new Response(
          JSON.stringify({
            success: true,
            status: 'SUCCEEDED',
            transactionId: existing.transaction_id || intentId,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. 调用 Airwallex Retrieve PaymentIntent 接口向官方核实真实支付结果
    const token = await getAirwallexAccessToken(env);
    const awxBaseUrl = getAirwallexBaseUrl(env);

    const retrieveRes = await fetch(`${awxBaseUrl}/api/v1/pa/payment_intents/${encodeURIComponent(intentId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const intentData = await retrieveRes.json();
    if (!retrieveRes.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve PaymentIntent', details: intentData }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const awxStatus = String(intentData.status || '').toUpperCase();
    const attemptId = intentData.latest_payment_attempt?.id || intentData.id;

    if (awxStatus === 'SUCCEEDED') {
      const wcUpdateRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${wcAuth}`,
        },
        body: JSON.stringify({
          status: 'processing',
          set_paid: true,
          payment_method: 'airwallex_card',
          payment_method_title: 'Credit / Debit Card (Airwallex)',
          transaction_id: attemptId,
          meta_data: [
            { key: '_airwallex_intent_id', value: intentData.id },
            { key: '_airwallex_attempt_id', value: attemptId },
            { key: '_airwallex_payment_status', value: 'SUCCEEDED' },
            { key: '_airwallex_captured_at', value: new Date().toISOString() },
          ],
        }),
      });

      if (!wcUpdateRes.ok) {
        const wcErr = await wcUpdateRes.text();
        console.error('⚠️ WooCommerce 更新订单状态失败:', wcErr);
      }

      return new Response(
        JSON.stringify({ success: true, status: 'SUCCEEDED', transactionId: attemptId }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 若仍在处理中或失败
    const failureMsg =
      intentData.latest_payment_attempt?.failure_details?.message ||
      intentData.latest_payment_attempt?.authentication_data?.ds_data?.challenge_status ||
      `Payment status: ${awxStatus}`;

    return new Response(
      JSON.stringify({
        success: false,
        status: awxStatus,
        message: failureMsg,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Airwallex Confirm Order Error:', error);
    return new Response(
      JSON.stringify({ error: 'Confirm Error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};