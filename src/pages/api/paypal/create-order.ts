/**
 * 创建 WooCommerce 订单并生成 PayPal 订单
 *
 * 流程：
 * 1. 创建 WooCommerce 订单（状态：pending）
 * 2. 创建 PayPal 订单
 * 3. 返回 PayPal 订单 ID 给前端
 * 4. 用户在 PayPal 完成支付后，webhook 更新订单状态
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

interface RequestBody {
  billing: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  shippingMethod?: string;
  line_items: Array<{
    product_id: number;
    variation_id?: number;
    quantity: number;
  }>;
  coupon_lines?: Array<{
    code: string;
  }>;
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    // 1. 读取环境变量
    const env = getEnv(locals);
    const validation = validateEnv(env, true); // 包含 PayPal 验证

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
    const { billing, shipping, shippingMethod = 'standard', line_items, coupon_lines = [] } = await request.json() as RequestBody;

    // 4. 验证必需字段
    if (!billing.email || !billing.first_name || !billing.last_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required billing information' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!line_items || line_items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart is empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. 初始化 WooCommerce 认证
    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

    // 6. 准备订单数据
    const lineItems = line_items.map((item) => ({
      product_id: item.product_id,
      variation_id: item.variation_id || undefined,
      quantity: item.quantity,
    }));

    const shippingLines = [];
    if (shippingMethod === 'standard') {
      shippingLines.push({
        method_id: 'free_shipping',
        method_title: 'Standard Shipping',
        total: '0.00'
      });
    } else if (shippingMethod === 'express') {
      shippingLines.push({
        method_id: 'flat_rate',
        method_title: 'Express Shipping',
        total: '15.00'
      });
    }

    // 7. 检查用户登录状态
    let customerId: number | null = null;
    let autoCreatedAccount = false;
    const userDataStr = cookies.get('user')?.value;

    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        customerId = userData.id || null;
        console.log('✅ 用户已登录，客户 ID:', customerId);
      } catch (e) {
        console.warn('⚠️ 解析用户数据失败:', e);
      }
    } else {
      // 自动创建账户逻辑
      console.log('🔄 用户未登录，尝试查找或创建账户...');
      try {
        // 先查找是否已存在该邮箱的用户
        const searchResponse = await fetch(
          `${env.WC_STORE_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(billing.email)}`,
          {
            headers: {
              'Authorization': `Basic ${wcAuth}`,
            },
          }
        );

        if (searchResponse.ok) {
          const customers = await searchResponse.json();
          if (customers.length > 0) {
            customerId = customers[0].id;
            console.log('✅ 找到现有客户，客户 ID:', customerId);
          } else {
            // 创建新客户
            const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
            const username = billing.email.split('@')[0] + '_' + Date.now();

            const customerResponse = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/customers`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${wcAuth}`,
              },
              body: JSON.stringify({
                email: billing.email,
                username: username,
                password: randomPassword,
                first_name: billing.first_name,
                last_name: billing.last_name,
                billing: billing,
                shipping: shipping,
              }),
            });

            if (customerResponse.ok) {
              const customer = await customerResponse.json();
              customerId = customer.id;
              autoCreatedAccount = true;
              console.log('✅ 账户创建成功，客户 ID:', customerId);
            }
          }
        }
      } catch (error) {
        console.error('❌ 处理客户信息失败:', error);
      }
    }

    // 8. 创建 WooCommerce 订单
    const orderData: any = {
      status: 'pending',
      payment_method: 'paypal',
      payment_method_title: 'PayPal',
      set_paid: false,
      billing: billing,
      shipping: shipping,
      line_items: lineItems,
      shipping_lines: shippingLines,
      coupon_lines: coupon_lines,
      meta_data: [
        {
          key: '_payment_pending',
          value: 'yes'
        }
      ],
    };

    if (customerId) {
      orderData.customer_id = customerId;
    }

    const orderResponse = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify(orderData),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('❌ WooCommerce 订单创建失败:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Failed to create order',
          details: errorData.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wcOrder = await orderResponse.json();
    console.log('✅ WooCommerce 订单创建成功:', wcOrder.id);

    // 9. 获取 PayPal Access Token
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

    // 10. 创建 PayPal 订单
    const totalAmount = parseFloat(wcOrder.total).toFixed(2);
    const currency = wcOrder.currency.toUpperCase();

    const paypalOrderResponse = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: wcOrder.id.toString(),
            description: `Order #${wcOrder.id} - E.B.Belle Jewelry`,
            custom_id: wcOrder.id.toString(),
            amount: {
              currency_code: currency,
              value: totalAmount,
            },
            shipping: {
              name: {
                full_name: `${shipping.first_name} ${shipping.last_name}`,
              },
              address: {
                address_line_1: shipping.address_1,
                address_line_2: shipping.address_2 || undefined,
                admin_area_2: shipping.city,
                admin_area_1: shipping.state,
                postal_code: shipping.postcode,
                country_code: shipping.country,
              },
            },
          },
        ],
        application_context: {
          brand_name: 'E.B.Belle',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${env.WC_STORE_URL}/order-confirmation?order_id=${wcOrder.id}&order_key=${wcOrder.order_key}${autoCreatedAccount ? '&auto_created=1' : ''}`,
          cancel_url: `${env.WC_STORE_URL}/checkout?order_id=${wcOrder.id}&order_key=${wcOrder.order_key}&payment_failed=1`,
        },
      }),
    });

    if (!paypalOrderResponse.ok) {
      const errorData = await paypalOrderResponse.json();
      console.error('❌ PayPal 订单创建失败:', errorData);
      throw new Error('Failed to create PayPal order');
    }

    const paypalOrder = await paypalOrderResponse.json();
    console.log('✅ PayPal 订单创建成功:', paypalOrder.id);

    // 11. 更新 WooCommerce 订单，记录 PayPal 订单 ID
    await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${wcOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify({
        meta_data: [
          {
            key: '_paypal_order_id',
            value: paypalOrder.id
          }
        ]
      }),
    });

    // 12. 返回给前端
    return new Response(
      JSON.stringify({
        success: true,
        paypalOrderId: paypalOrder.id,
        orderId: wcOrder.id,
        orderKey: wcOrder.order_key,
        amount: totalAmount,
        currency: currency,
        autoCreatedAccount: autoCreatedAccount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ 创建 PayPal 订单失败:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
