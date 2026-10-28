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

/**
 * 将国家名称或代码转换为 ISO 2 字母代码
 */
function normalizeCountryCode(country: string): string {
  if (!country) return 'US';

  const upperCountry = country.toUpperCase().trim();

  // 如果已经是 2 字母代码，直接返回
  if (upperCountry.length === 2 && /^[A-Z]{2}$/.test(upperCountry)) {
    return upperCountry;
  }

  // 常见国家名称映射
  const countryMap: Record<string, string> = {
    'UNITED STATES': 'US',
    'UNITED STATES OF AMERICA': 'US',
    'USA': 'US',
    'UNITED KINGDOM': 'GB',
    'UK': 'GB',
    'GREAT BRITAIN': 'GB',
    'CHINA': 'CN',
    'CANADA': 'CA',
    'AUSTRALIA': 'AU',
    'GERMANY': 'DE',
    'FRANCE': 'FR',
    'ITALY': 'IT',
    'SPAIN': 'ES',
    'JAPAN': 'JP',
    'SOUTH KOREA': 'KR',
    'KOREA': 'KR',
    'BRAZIL': 'BR',
    'MEXICO': 'MX',
    'INDIA': 'IN',
    'NETHERLANDS': 'NL',
    'SWEDEN': 'SE',
    'NORWAY': 'NO',
    'DENMARK': 'DK',
    'FINLAND': 'FI',
    'POLAND': 'PL',
    'SWITZERLAND': 'CH',
    'AUSTRIA': 'AT',
    'BELGIUM': 'BE',
    'IRELAND': 'IE',
    'NEW ZEALAND': 'NZ',
    'SINGAPORE': 'SG',
    'MALAYSIA': 'MY',
    'THAILAND': 'TH',
    'VIETNAM': 'VN',
    'PHILIPPINES': 'PH',
    'INDONESIA': 'ID',
    'PORTUGAL': 'PT',
    'GREECE': 'GR',
    'TURKEY': 'TR',
    'RUSSIA': 'RU',
    'SOUTH AFRICA': 'ZA',
    'ARGENTINA': 'AR',
    'CHILE': 'CL',
    'COLOMBIA': 'CO',
    'PERU': 'PE',
    'ISRAEL': 'IL',
    'SAUDI ARABIA': 'SA',
    'UNITED ARAB EMIRATES': 'AE',
    'UAE': 'AE',
  };

  return countryMap[upperCountry] || 'US';
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
    // 优先使用登录用户的 ID，确保已登录用户的订单始终关联到其账户
    let customerId: number | null = null;
    const userId = cookies.get('user_id')?.value;
    const userEmail = cookies.get('user_email')?.value;

    if (userId) {
      // 用户已登录，使用登录用户的 ID
      try {
        customerId = parseInt(userId);
        console.log('✅ 用户已登录，使用客户 ID:', customerId, '登录邮箱:', userEmail, '填写邮箱:', billing.email);
      } catch (e) {
        console.error('❌ 解析登录用户 ID 失败:', e);
      }
    } else {
      // 用户未登录，根据填写的邮箱搜索客户
      try {
        const searchResponse = await fetch(
          `${env.WC_STORE_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(billing.email)}`,
          { headers: { 'Authorization': `Basic ${wcAuth}` } }
        );
        if (searchResponse.ok) {
          const customers = await searchResponse.json();
          if (customers.length > 0) {
            customerId = customers[0].id;
            console.log('✅ 未登录，根据邮箱找到客户 ID:', customerId, 'Email:', billing.email);
          } else {
            console.log('⚠️ 未登录，未找到邮箱对应的客户:', billing.email);
          }
        }
      } catch (e) {
        console.error('❌ 搜索客户失败:', e);
      }
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

    console.log('📦 准备创建 WooCommerce 订单:', {
      billing: orderPayload.billing,
      shipping: orderPayload.shipping,
      line_items: orderPayload.line_items,
      shipping_lines: orderPayload.shipping_lines
    });

    const wcOrderRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${wcAuth}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!wcOrderRes.ok) {
      let errData;
      const contentType = wcOrderRes.headers.get('content-type');
      try {
        if (contentType && contentType.includes('application/json')) {
          errData = await wcOrderRes.json();
        } else {
          const text = await wcOrderRes.text();
          console.error('❌ WooCommerce API 返回非 JSON 响应:', text);
          errData = { message: text };
        }
      } catch (parseErr) {
        console.error('❌ 解析 WooCommerce 错误响应失败:', parseErr);
        errData = { message: 'Unable to parse error response' };
      }
      return new Response(
        JSON.stringify({ error: 'Failed to create WooCommerce order', details: errData.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let wcOrder;
    try {
      const responseText = await wcOrderRes.text();
      console.log('✅ WooCommerce 订单响应原始文本:', responseText.substring(0, 200));
      wcOrder = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('❌ 解析 WooCommerce 订单响应失败:', parseErr);
      return new Response(
        JSON.stringify({ error: 'Failed to parse WooCommerce order response' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
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
                country_code: normalizeCountryCode(shipping.country),
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

    console.log('✅ PayPal 订单创建成功:', {
      paypalOrderId: paypalOrder.id,
      wcOrderId: wcOrder.id,
      status: paypalOrder.status,
      amount: orderTotal,
      currency: orderCurrency
    });

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