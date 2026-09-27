/**
 * PayPal Webhook Handler
 *
 * 处理 PayPal 事件通知：
 * - CHECKOUT.ORDER.APPROVED: 订单已批准
 * - PAYMENT.CAPTURE.COMPLETED: 支付已完成
 * - PAYMENT.CAPTURE.DENIED: 支付被拒绝
 * - PAYMENT.CAPTURE.REFUNDED: 支付已退款
 *
 * 安全特性：
 * - Webhook 签名验证
 * - 幂等性保护（防止重复处理）
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

/**
 * 验证 PayPal Webhook 签名
 */
async function verifyWebhookSignature(
  request: Request,
  payload: any,
  env: any
): Promise<boolean> {
  try {
    const PAYPAL_MODE = env.PAYPAL_MODE || 'sandbox';
    const PAYPAL_WEBHOOK_ID = env.PAYPAL_WEBHOOK_ID;

    // 如果没有配置 Webhook ID，跳过验证（仅用于开发环境）
    if (!PAYPAL_WEBHOOK_ID) {
      console.warn('⚠️ PAYPAL_WEBHOOK_ID 未配置，跳过签名验证（生产环境必须配置）');
      return true;
    }

    const PAYPAL_API_URL = PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // 获取 webhook 签名相关的 headers
    const transmissionId = request.headers.get('paypal-transmission-id');
    const transmissionTime = request.headers.get('paypal-transmission-time');
    const certUrl = request.headers.get('paypal-cert-url');
    const authAlgo = request.headers.get('paypal-auth-algo');
    const transmissionSig = request.headers.get('paypal-transmission-sig');

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
      console.error('❌ 缺少 PayPal webhook 签名 headers');
      return false;
    }

    // 获取 PayPal Access Token
    const authResponse = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      console.error('❌ PayPal 认证失败');
      return false;
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // 验证 webhook 签名
    const verifyResponse = await fetch(
      `${PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          cert_url: certUrl,
          auth_algo: authAlgo,
          transmission_sig: transmissionSig,
          webhook_id: PAYPAL_WEBHOOK_ID,
          webhook_event: payload,
        }),
      }
    );

    if (!verifyResponse.ok) {
      console.error('❌ PayPal 签名验证请求失败');
      return false;
    }

    const verifyData = await verifyResponse.json();
    const isValid = verifyData.verification_status === 'SUCCESS';

    if (!isValid) {
      console.error('❌ PayPal webhook 签名验证失败:', verifyData);
    } else {
      console.log('✅ PayPal webhook 签名验证成功');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Webhook 签名验证异常:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = getEnv(locals);
    const validation = validateEnv(env, true);

    if (!validation.valid) {
      console.error('❌ 缺少环境变量:', validation.missing);
      return new Response('Configuration error', { status: 500 });
    }

    // 解析 webhook 数据
    const payload = await request.json();
    const eventType = payload.event_type;

    console.log('📥 收到 PayPal Webhook 事件:', eventType);

    // 验证 webhook 签名
    const isValid = await verifyWebhookSignature(request, payload, env);

    if (!isValid) {
      console.error('❌ Webhook 签名验证失败，拒绝处理');
      return new Response('Unauthorized', { status: 401 });
    }

    // 初始化 WooCommerce 认证
    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

    // 根据事件类型处理
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        // 支付完成
        const captureId = payload.resource.id;
        const customId = payload.resource.custom_id;
        const orderId = customId || payload.resource.supplementary_data?.related_ids?.order_id;

        console.log('✅ 支付完成，订单 ID:', orderId, '捕获 ID:', captureId);

        if (orderId) {
          // 幂等性检查：检查订单当前状态
          const orderCheckResponse = await fetch(
            `${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`,
            {
              headers: {
                'Authorization': `Basic ${wcAuth}`,
              },
            }
          );

          if (orderCheckResponse.ok) {
            const currentOrder = await orderCheckResponse.json();

            // 如果订单已经是 processing 或 completed，跳过更新
            if (currentOrder.status === 'processing' || currentOrder.status === 'completed') {
              console.log('⚠️ 订单已支付，跳过重复更新');
              return new Response('OK', { status: 200 });
            }

            // 检查是否已经处理过这个 capture ID
            const existingCaptureId = currentOrder.meta_data?.find(
              (meta: any) => meta.key === '_paypal_capture_id'
            )?.value;

            if (existingCaptureId === captureId) {
              console.log('⚠️ 该 capture ID 已处理，跳过重复更新');
              return new Response('OK', { status: 200 });
            }
          }

          // 更新订单状态为 processing
          const updateResponse = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`, {
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
                {
                  key: '_paypal_capture_id',
                  value: captureId
                },
                {
                  key: '_paypal_payment_status',
                  value: 'COMPLETED'
                },
                {
                  key: '_paypal_webhook_processed_at',
                  value: new Date().toISOString()
                }
              ]
            }),
          });

          if (updateResponse.ok) {
            console.log('✅ 订单状态更新为 processing');
          } else {
            const errorData = await updateResponse.json();
            console.error('❌ 更新订单失败:', errorData);
          }
        }
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED': {
        // 支付被拒绝
        const captureId = payload.resource.id;
        const customId = payload.resource.custom_id;
        const orderId = customId || payload.resource.supplementary_data?.related_ids?.order_id;

        console.log('❌ 支付被拒绝，订单 ID:', orderId);

        if (orderId) {
          // 更新订单状态为 failed
          const updateResponse = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${wcAuth}`,
            },
            body: JSON.stringify({
              status: 'failed',
              meta_data: [
                {
                  key: '_paypal_payment_status',
                  value: 'DENIED'
                },
                {
                  key: '_paypal_webhook_processed_at',
                  value: new Date().toISOString()
                }
              ]
            }),
          });

          if (updateResponse.ok) {
            console.log('✅ 订单状态更新为 failed');
          } else {
            const errorData = await updateResponse.json();
            console.error('❌ 更新订单失败:', errorData);
          }
        }
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        // 支付已退款
        const refundId = payload.resource.id;
        const customId = payload.resource.custom_id;
        const orderId = customId;

        console.log('💰 支付退款，订单 ID:', orderId, '退款 ID:', refundId);

        if (orderId) {
          // 更新订单状态为 refunded
          const updateResponse = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${wcAuth}`,
            },
            body: JSON.stringify({
              status: 'refunded',
              meta_data: [
                {
                  key: '_paypal_refund_id',
                  value: refundId
                },
                {
                  key: '_paypal_payment_status',
                  value: 'REFUNDED'
                },
                {
                  key: '_paypal_webhook_processed_at',
                  value: new Date().toISOString()
                }
              ]
            }),
          });

          if (updateResponse.ok) {
            console.log('✅ 订单状态更新为 refunded');
          } else {
            const errorData = await updateResponse.json();
            console.error('❌ 更新订单失败:', errorData);
          }
        }
        break;
      }

      case 'CHECKOUT.ORDER.APPROVED': {
        // 订单已批准（用户完成了 PayPal 登录和确认）
        const orderId = payload.resource.id;
        console.log('✅ PayPal 订单已批准:', orderId);
        // 这个事件不需要更新 WooCommerce 订单，等待 PAYMENT.CAPTURE.COMPLETED
        break;
      }

      default:
        console.log('ℹ️ 未处理的事件类型:', eventType);
    }

    // 返回 200 响应（告诉 PayPal webhook 已收到）
    return new Response('OK', { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook 处理失败:', error);
    return new Response('Webhook error', { status: 500 });
  }
};
