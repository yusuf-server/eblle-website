/**
 * 捕获 PayPal 订单并更新 WooCommerce 订单状态
 *
 * 流程：
 * 1. 接收 PayPal 订单 ID
 * 2. 检查订单是否已支付（幂等性保护）
 * 3. 向 PayPal 发送捕获请求
 * 4. 更新 WooCommerce 订单状态为 on-hold（等待 webhook 确认）
 *
 * 注意：订单状态最终由 webhook 确认，这里只是预先捕获支付
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
    // 1. 读取环境变量
    const env = getEnv(locals);
    const validation = validateEnv(env, true);

    if (!validation.valid) {
      console.error('❌ 缺少环境变量:', validation.missing);
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          details: `Missing: ${validation.missing.join(', ')}`
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. 配置 PayPal API
    const PAYPAL_MODE = env.PAYPAL_MODE || 'sandbox';
    const PAYPAL_API_URL = PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // 3. 解析请求体
    const { paypalOrderId, orderId } = await request.json() as RequestBody;

    if (!paypalOrderId || !orderId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. 幂等性检查：检查订单是否已支付
    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

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

      // 如果订单已经是 processing 或 completed，不再捕获
      if (currentOrder.status === 'processing' || currentOrder.status === 'completed') {
        console.log('⚠️ 订单已支付，跳过捕获');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Order already paid',
            captureId: currentOrder.transaction_id || 'unknown',
            status: currentOrder.status,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // 检查是否已经有 capture ID（防止重复捕获）
      const existingCaptureId = currentOrder.meta_data?.find(
        (meta: any) => meta.key === '_paypal_capture_id'
      )?.value;

      if (existingCaptureId) {
        console.log('⚠️ 订单已有 capture ID，跳过重复捕获');
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment already captured',
            captureId: existingCaptureId,
            status: currentOrder.status,
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 5. 获取 PayPal Access Token
    const authResponse = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`)}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      throw new Error('Failed to authenticate with PayPal');
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;

    // 6. 捕获 PayPal 订单
    const captureResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      console.error('❌ PayPal 捕获失败:', errorData);
      throw new Error('Failed to capture PayPal order');
    }

    const captureData = await captureResponse.json();
    console.log('✅ PayPal 订单捕获成功:', captureData.id);

    // 7. 更新 WooCommerce 订单状态
    // 注意：这里设置为 on-hold，等待 webhook 确认后才设置为 processing
    const updateResponse = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify({
        status: 'on-hold',
        transaction_id: captureData.id,
        meta_data: [
          {
            key: '_paypal_capture_id',
            value: captureData.id
          },
          {
            key: '_paypal_payment_status',
            value: captureData.status
          },
          {
            key: '_paypal_capture_pending',
            value: 'yes'
          },
          {
            key: '_paypal_captured_at',
            value: new Date().toISOString()
          }
        ]
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('❌ 更新 WooCommerce 订单失败:', errorData);
      console.warn('⚠️ 订单更新失败，但支付已捕获，webhook 将处理订单状态');
    } else {
      console.log('✅ WooCommerce 订单状态更新为 on-hold（等待 webhook 确认）');
    }

    // 8. 返回成功响应
    return new Response(
      JSON.stringify({
        success: true,
        captureId: captureData.id,
        status: captureData.status,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ 捕获 PayPal 订单失败:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
