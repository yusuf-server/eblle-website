/**
 * Airwallex 异步 Webhook 接收端点
 * 监听 payment_intent.succeeded（扣款兜底核单）与 refund.accepted / refund.settled（后台退款自动同步 WooCommerce）
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

async function hmacSha256Hex(secretStr: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretStr),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signedBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signedBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyAirwallexSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signatureHeader: string
): Promise<boolean> {
  if (!secret || !timestamp || !signatureHeader) return false;

  const cleanSecret = secret.trim();
  const cleanTs = timestamp.trim();
  const cleanSig = signatureHeader.trim().replace(/^(v1=|sha256=)/i, '').toLowerCase();
  const signedPayload = `${cleanTs}${rawBody}`;

  // 1. 标准模式：直接使用完整的 whsec_xxx 字符串作为 HMAC 密钥
  const expectedFull = await hmacSha256Hex(cleanSecret, signedPayload);
  if (expectedFull === cleanSig) return true;

  // 2. 兼容模式：剥离 whsec_ 前缀作为原始密钥
  if (cleanSecret.startsWith('whsec_')) {
    const strippedSecret = cleanSecret.slice(6);
    const expectedStripped = await hmacSha256Hex(strippedSecret, signedPayload);
    if (expectedStripped === cleanSig) return true;
  }

  return false;
}

export const POST: APIRoute = async (context) => {
  const { request } = context;
  try {
    const env = getEnv(context);
    const validation = validateEnv(env, false);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error', missing: validation.missing }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rawBody = await request.text();
    const webhookSecret = env.AIRWALLEX_WEBHOOK_SECRET || '';
    const isProd = (env.AIRWALLEX_ENV || '').toLowerCase() === 'prod';

    if (webhookSecret) {
      const timestamp =
        request.headers.get('x-timestamp') ||
        request.headers.get('x-airwallex-timestamp') ||
        '';
      const signature =
        request.headers.get('x-signature') ||
        request.headers.get('x-airwallex-signature') ||
        request.headers.get('airwallex-signature') ||
        '';

      const isValid = await verifyAirwallexSignature(webhookSecret, timestamp, rawBody, signature);

      if (!isValid) {
        console.warn('⚠️ Airwallex Webhook 签名未匹配:', {
          isProd,
          hasTimestamp: Boolean(timestamp),
          sigPreview: signature.slice(0, 16),
        });
        if (isProd) {
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    const event = JSON.parse(rawBody);
    const eventName = String(event?.name || '');
    const obj = event?.data?.object || {};

    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);
    const wcBase = env.WC_STORE_URL;

    // 1. 支付成功兜底核单
    if (eventName === 'payment_intent.succeeded') {
      const orderId = parseInt(String(obj.merchant_order_id || '0'), 10);
      const attemptId = obj.latest_payment_attempt?.id || obj.id || '';

      if (orderId > 0) {
        const checkRes = await fetch(`${wcBase}/wp-json/wc/v3/orders/${orderId}`, {
          headers: { Authorization: `Basic ${wcAuth}` },
        });
        if (checkRes.ok) {
          const existing = await checkRes.json();
          if (existing.status !== 'processing' && existing.status !== 'completed' && existing.status !== 'refunded') {
            await fetch(`${wcBase}/wp-json/wc/v3/orders/${orderId}`, {
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
                  { key: '_airwallex_intent_id', value: obj.id || '' },
                  { key: '_airwallex_attempt_id', value: attemptId },
                  { key: '_airwallex_payment_status', value: 'SUCCEEDED' },
                ],
              }),
            });
          }
        }
      }
    }

    // 2. 退款受理或结算完成（refund.accepted / refund.settled / refund.succeeded）自动同步 WooCommerce 订单退款
    if (
      eventName === 'refund.accepted' ||
      eventName === 'refund.settled' ||
      eventName === 'refund.succeeded'
    ) {
      const orderId = parseInt(String(obj.merchant_order_id || '0'), 10);
      const refundId = String(obj.id || '');
      const refundAmount = parseFloat(String(obj.amount || '0')) || 0;
      const refundReason = String(obj.reason || 'Airwallex Refund');
      const refundStatusLabel = eventName === 'refund.accepted' ? 'ACCEPTED' : 'SETTLED';

      if (orderId > 0) {
        const orderRes = await fetch(`${wcBase}/wp-json/wc/v3/orders/${orderId}`, {
          headers: { Authorization: `Basic ${wcAuth}` },
        });

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const orderTotal = parseFloat(String(orderData.total || '0')) || 0;

          // 幂等防重：检查是否已处理过同一笔 refundId（防止 accepted 和 settled 重复创建退款单）
          const alreadyProcessed =
            Array.isArray(orderData.meta_data) &&
            orderData.meta_data.some((m: any) => m.key === '_airwallex_refund_id' && m.value === refundId);

          if (!alreadyProcessed && orderData.status !== 'refunded') {
            // 调用 WooCommerce 官方退款接口写入退款流水明细
            await fetch(`${wcBase}/wp-json/wc/v3/orders/${orderId}/refunds`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${wcAuth}`,
              },
              body: JSON.stringify({
                amount: refundAmount > 0 ? refundAmount.toFixed(2) : orderTotal.toFixed(2),
                reason: `${refundReason} (Airwallex ID: ${refundId})`,
                api_refund: false,
              }),
            }).catch(() => {});

            // 若为全额退款，确保订单主状态直接切换为 refunded
            const isFullRefund = refundAmount <= 0 || refundAmount >= orderTotal - 0.01;
            await fetch(`${wcBase}/wp-json/wc/v3/orders/${orderId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${wcAuth}`,
              },
              body: JSON.stringify({
                ...(isFullRefund ? { status: 'refunded' } : {}),
                meta_data: [
                  { key: '_airwallex_refund_id', value: refundId },
                  { key: '_airwallex_refund_status', value: refundStatusLabel },
                ],
              }),
            });
          } else if (alreadyProcessed && refundStatusLabel === 'SETTLED') {
            // 若已由 refund.accepted 提前完成退款，后续 refund.settled 到达时仅静默更新最终清算状态标记
            await fetch(`${wcBase}/wp-json/wc/v3/orders/${orderId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${wcAuth}`,
              },
              body: JSON.stringify({
                meta_data: [{ key: '_airwallex_refund_status', value: 'SETTLED' }],
              }),
            }).catch(() => {});
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true, event: eventName }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ Airwallex Webhook Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};