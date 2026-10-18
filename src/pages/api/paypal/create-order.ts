/**
 * 创建 WooCommerce 订单并生成 PayPal 订单 (支持动态货币与实际运费传递)
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

interface RequestBody {
  currency?: string;
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
  shippingCost?: string;
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

    const PAYPAL_MODE = env.PAYPAL_MODE || 'sandbox';
    const PAYPAL_API_URL = PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    // 默认前端站点地址，严禁填 WP_STORE_URL
    const SITE_URL = env.PUBLIC_SITE_URL || 'https://ebbellejewelry.com';

    const body = await request.json() as RequestBody;
    const {
      billing,
      shipping,
      shippingMethod = 'standard',
      shippingCost = '20.00',
      line_items,
      coupon_lines = [],
      currency = 'USD'
    } = body;

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

    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

    // 处理实际运费行，保证总价一致
    const shippingLines = [
      {
        method_id: shippingMethod === 'express' ? 'flat_rate' : 'standard_shipping',
        method_title: shippingMethod === 'express' ? 'Express Shipping' : 'Standard Delivery',
        total: parseFloat(shippingCost).toFixed(2)
      }
    ];

    // 处理客户身份关联
    let customerId: number | null = null;
    const userDataStr = cookies.get('user')?.value;

    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        customerId = userData.id || null;
      } catch (e) {}
    } else {
      try {
        const searchResponse = await fetch(
          `${env.WC_STORE_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(billing.email)}`,
          { headers: { 'Authorization': `Basic ${wcAuth}` } }
        );
        if (searchResponse.ok) {
          const customers = await searchResponse.json();
          if (customers.length > 0) customerId = customers[0].id;
        }
      } catch (e) {}
    }

    // 1. 创建 WooCommerce 初始订单
    const orderPayload: any = {
      status: 'pending',
      currency: currency.toUpperCase(),
      payment_method: 'paypal',
      payment_method_title: 'PayPal',
      set_paid: false,
      billing: billing,
      shipping: shipping,
      line_items: line_items.map(item => ({
        product_id: item.product_id,
        variation_id: item.variation_id || undefined,
        quantity: item.quantity
      })),
      shipping_lines: shippingLines,
      coupon_lines: coupon_lines,
      meta_data: [{ key: '_payment_pending', value: 'yes' }]
    };

    if (customerId) orderPayload.customer_id = customerId;

    const wcOrderRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!wcOrderRes.ok) {
      const errData = await wcOrderRes.json();
      return new Response(
        JSON.stringify({ error: 'Failed to create WooCommerce order', details: errData.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wcOrder = await wcOrderRes.json();
    const orderTotal = parseFloat(wcOrder.total).toFixed(2);
    const orderCurrency = (wcOrder.currency || currency).toUpperCase();

    // 2. 授权获取 PayPal Access Token
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

    // 3. 创建 PayPal 订单（回跳地址统一修正为前端确认页）
    const paypalOrderRes = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: wcOrder.id.toString(),
            description: `Order #${wcOrder.id} - E.B.Belle Jewelry`,
            custom_id: wcOrder.id.toString(),
            amount: {
              currency_code: orderCurrency,
              value: orderTotal,
            },
            shipping: {
              name: { full_name: `${shipping.first_name} ${shipping.last_name}` },
              address: {
                address_line_1: shipping.address_1,
                address_line_2: shipping.address_2 || undefined,
                admin_area_2: shipping.city,
                admin_area_1: shipping.state,
                postal_code: shipping.postcode,
                country_code: shipping.country || 'US',
              },
            },
          },
        ],
        application_context: {
          brand_name: 'E.B.Belle',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${SITE_URL}/checkout/confirmation?order_id=${wcOrder.id}&order_key=${wcOrder.order_key}`,
          cancel_url: `${SITE_URL}/checkout/payment?order_id=${wcOrder.id}&order_key=${wcOrder.order_key}&cancel=1`,
        },
      }),
    });

    if (!paypalOrderRes.ok) {
      const ppErr = await paypalOrderRes.json();
      console.error('PayPal Order Create Error:', ppErr);
      throw new Error('PayPal API error: ' + JSON.stringify(ppErr));
    }

    const paypalOrder = await paypalOrderRes.json();

    // 4. 将 PayPal Order ID 记录回 WooCommerce
    await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${wcOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify({
        meta_data: [{ key: '_paypal_order_id', value: paypalOrder.id }]
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        paypalOrderId: paypalOrder.id,
        orderId: wcOrder.id,
        orderKey: wcOrder.order_key,
        amount: orderTotal,
        currency: orderCurrency
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ 创建订单异常:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};