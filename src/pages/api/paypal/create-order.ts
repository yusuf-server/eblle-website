/**
 * 创建或复用 Pending WooCommerce 订单并生成 PayPal 订单
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

interface LineItemInput {
  product_id: number;
  variation_id?: number;
  name?: string;
  quantity: number;
  price?: number;
  isXmasMysteryGift?: boolean;
}

interface RequestBody {
  existingOrderId?: number;
  existingOrderKey?: string;
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
  discountTotal?: number;
  pointsSpent?: number;
  pointsEarned?: number;
  appliedOffers?: string[];
  line_items: LineItemInput[];
  coupon_lines?: Array<{
    code: string;
  }>;
}

function normalizeCountryCode(country: string): string {
  if (!country) return 'US';
  const trimmed = country.trim();
  const upper = trimmed.toUpperCase();

  if (upper.length === 2 && /^[A-Z]{2}$/.test(upper)) {
    return upper;
  }

  const countryMap: Record<string, string> = {
    'ALBANIA': 'AL', 'ALGERIA': 'DZ', 'AMERICAN SAMOA': 'AS', 'ANDORRA': 'AD', 'ANGOLA': 'AO',
    'ARGENTINA': 'AR', 'ARMENIA': 'AM', 'AUSTRALIA': 'AU', 'AUSTRIA': 'AT', 'BAHRAIN': 'BH',
    'BANGLADESH': 'BD', 'BARBADOS': 'BB', 'BELARUS': 'BY', 'BELGIUM': 'BE', 'BENIN': 'BJ',
    'BOLIVIA': 'BO', 'BRAZIL': 'BR', 'BRUNEI': 'BN', 'BULGARIA': 'BG', 'CANADA': 'CA',
    'CAPE VERDE': 'CV', 'CHAD': 'TD', 'CHILE': 'CL', 'CHINA': 'CN',
    'CHINA (HONG KONG)': 'HK', 'HONG KONG': 'HK', 'CHINA (MACAO)': 'MO', 'MACAO': 'MO',
    'COLLECTIVITY OF SAINT MARTIN': 'MF', 'COLOMBIA': 'CO', 'COSTA RICA': 'CR', 'CROATIA': 'HR',
    'CYPRUS': 'CY', 'CZECH REPUBLIC': 'CZ', 'CÔTE D\'IVOIRE': 'CI', 'COTE D\'IVOIRE': 'CI',
    'DEMOCRATIC REPUBLIC OF THE CONGO': 'CD', 'DENMARK': 'DK', 'ECUADOR': 'EC', 'EGYPT': 'EG',
    'EL SALVADOR': 'SV', 'ESTONIA': 'EE', 'ESWATINI': 'SZ', 'FAROE ISLANDS': 'FO', 'FIJI': 'FJ',
    'FINLAND': 'FI', 'FRANCE': 'FR', 'FRENCH GUIANA': 'GF', 'FRENCH POLYNESIA': 'PF',
    'GAMBIA': 'GM', 'GEORGIA': 'GE', 'GERMANY': 'DE', 'GHANA': 'GH', 'GREECE': 'GR',
    'GRENADA': 'GD', 'GUADELOUPE': 'GP', 'GUATEMALA': 'GT', 'HONDURAS': 'HN', 'HUNGARY': 'HU',
    'ICELAND': 'IS', 'INDONESIA': 'ID', 'IRAQ': 'IQ', 'IRELAND': 'IE', 'ISRAEL': 'IL',
    'ITALY': 'IT', 'JAPAN': 'JP', 'JORDAN': 'JO', 'KAZAKHSTAN': 'KZ', 'KENYA': 'KE',
    'KUWAIT': 'KW', 'LAOS': 'LA', 'LATVIA': 'LV', 'LEBANON': 'LB', 'LESOTHO': 'LS',
    'LIBERIA': 'LR', 'LIBYA': 'LY', 'LIECHTENSTEIN': 'LI', 'LITHUANIA': 'LT', 'LUXEMBOURG': 'LU',
    'MADAGASCAR': 'MG', 'MALAWI': 'MW', 'MALAYSIA': 'MY', 'MALDIVES': 'MV', 'MALI': 'ML',
    'MALTA': 'MT', 'MARSHALL ISLANDS': 'MH', 'MARTINIQUE': 'MQ', 'MAURITANIA': 'MR',
    'MAURITIUS': 'MU', 'MAYOTTE': 'YT', 'MEXICO': 'MX', 'MICRONESIA': 'FM', 'MOLDOVA': 'MD',
    'MOROCCO': 'MA', 'MOZAMBIQUE': 'MZ', 'NAMIBIA': 'NA', 'NEPAL': 'NP', 'NETHERLANDS': 'NL',
    'NEW CALEDONIA': 'NC', 'NEW ZEALAND': 'NZ', 'NICARAGUA': 'NI', 'NIGER': 'NE', 'NIGERIA': 'NG',
    'NORTH MACEDONIA': 'MK', 'NORWAY': 'NO', 'OMAN': 'OM', 'PAKISTAN': 'PK', 'PALAU': 'PW',
    'PANAMA': 'PA', 'PAPUA NEW GUINEA': 'PG', 'PARAGUAY': 'PY', 'PERU': 'PE', 'PHILIPPINES': 'PH',
    'POLAND': 'PL', 'PORTUGAL': 'PT', 'PUERTO RICO': 'PR', 'QATAR': 'QA', 'ROMANIA': 'RO',
    'RWANDA': 'RW', 'RÉUNION': 'RE', 'REUNION': 'RE', 'SAUDI ARABIA': 'SA', 'SENEGAL': 'SN',
    'SERBIA': 'RS', 'SEYCHELLES': 'SC', 'SINGAPORE': 'SG', 'SINT MAARTEN': 'SX', 'SLOVAKIA': 'SK',
    'SLOVENIA': 'SI', 'SOUTH AFRICA': 'ZA', 'SOUTH KOREA': 'KR', 'KOREA': 'KR', 'SPAIN': 'ES',
    'SRI LANKA': 'LK', 'SURINAME': 'SR', 'SWEDEN': 'SE', 'SWITZERLAND': 'CH', 'SYRIA': 'SY',
    'TANZANIA': 'TZ', 'THAILAND': 'TH', 'TRINIDAD AND TOBAGO': 'TT', 'TUNISIA': 'TN',
    'TURKEY': 'TR', 'UGANDA': 'UG', 'UNITED ARAB EMIRATES': 'AE', 'UAE': 'AE',
    'UNITED KINGDOM': 'GB', 'UK': 'GB', 'GREAT BRITAIN': 'GB',
    'UNITED STATES': 'US', 'UNITED STATES OF AMERICA': 'US', 'USA': 'US',
    'URUGUAY': 'UY', 'VENEZUELA': 'VE', 'VIETNAM': 'VN', 'WESTERN SAMOA': 'WS', 'ZAMBIA': 'ZM'
  };

  return countryMap[upper] || 'US';
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const env = getEnv(locals);
    const validation = validateEnv(env, true);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error', details: `Missing: ${validation.missing.join(', ')}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const PAYPAL_MODE = env.PAYPAL_MODE || 'sandbox';
    const PAYPAL_API_URL = PAYPAL_MODE === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

    const SITE_URL = env.PUBLIC_SITE_URL || 'https://ebbellejewelry.com';

    const body = await request.json() as RequestBody;
    const {
      existingOrderId = 0,
      existingOrderKey = '',
      billing,
      shipping,
      shippingMethod = 'standard',
      shippingCost = '0.00',
      discountTotal = 0,
      pointsSpent = 0,
      pointsEarned = 0,
      appliedOffers = [],
      line_items,
      coupon_lines = [],
      currency = 'USD'
    } = body;

    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

    // 1. 检查是否传入了可复用的 Pending 订单（防止取消弹窗或点击 Complete Payment 时重复建单）
    let wcOrder: any = null;
    if (Number(existingOrderId) > 0) {
      try {
        const checkRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${Number(existingOrderId)}`, {
          headers: { 'Authorization': `Basic ${wcAuth}` },
        });
        if (checkRes.ok) {
          const candidate = await checkRes.json();
          const keyMatches = !existingOrderKey || candidate.order_key === existingOrderKey;
          if (candidate.status === 'pending' && keyMatches) {
            wcOrder = candidate;
          }
        }
      } catch (e) {
        console.warn('检查已有 pending 订单失败，将创建新订单:', e);
      }
    }

    // 2. 若无有效 Pending 订单可复用，则校验购物车并创建新 WooCommerce 订单
    if (!wcOrder) {
      if (!billing?.email || !billing?.first_name || !billing?.last_name) {
        return new Response(JSON.stringify({ error: 'Missing required billing information' }), { status: 400 });
      }
      if (!line_items || line_items.length === 0) {
        return new Response(JSON.stringify({ error: 'Cart is empty' }), { status: 400 });
      }

      const billingIsoCountry = normalizeCountryCode(billing.country);
      const shippingIsoCountry = normalizeCountryCode(shipping.country || billing.country);

      const normalizedBilling = { ...billing, country: billingIsoCountry };
      const normalizedShipping = { ...shipping, country: shippingIsoCountry };

      const parsedShipping = parseFloat(shippingCost);
      const safeShippingCost = isNaN(parsedShipping) ? 0 : parsedShipping;
      const shippingLines = [
        {
          method_id: shippingMethod === 'express' ? 'flat_rate' : 'standard_shipping',
          method_title: shippingMethod === 'express' ? 'Express Shipping' : 'Standard Delivery',
          total: safeShippingCost.toFixed(2)
        }
      ];

      let customerId: number | null = null;
      const userId = cookies.get('user_id')?.value;
      if (userId) {
        const parsedId = parseInt(userId, 10);
        if (!isNaN(parsedId) && parsedId > 0) customerId = parsedId;
      } else {
        try {
          const searchResponse = await fetch(
            `${env.WC_STORE_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(billing.email)}`,
            { headers: { 'Authorization': `Basic ${wcAuth}` } }
          );
          if (searchResponse.ok) {
            const customers = await searchResponse.json();
            if (Array.isArray(customers) && customers.length > 0) customerId = customers[0].id;
          }
        } catch (e) {}
      }

      const metaData: Array<{ key: string; value: string }> = [
        { key: '_payment_pending', value: 'yes' }
      ];
      if (Number(pointsSpent) > 0) {
        metaData.push({ key: '_eb_points_spent', value: String(pointsSpent) });
      }
      if (Number(pointsEarned) > 0) {
        metaData.push({ key: '_eb_points_earned', value: String(pointsEarned) });
      }
      if (Array.isArray(appliedOffers) && appliedOffers.length > 0) {
        metaData.push({ key: '_eb_applied_offers', value: appliedOffers.join(' | ') });
      }

      // 借用订单内第一个真实商品的 product_id 作为圣诞免费礼盒的合法商品引用，满足 WooCommerce REST API 必填校验
      const firstValidItem = line_items.find(
        (it) => !it.isXmasMysteryGift && Number(it.product_id) > 0
      );
      const fallbackGiftProductId = firstValidItem ? Number(firstValidItem.product_id) : 57994;

      const orderPayload: any = {
        status: 'pending',
        currency: currency.toUpperCase(),
        payment_method: 'paypal',
        payment_method_title: 'PayPal',
        set_paid: false,
        billing: normalizedBilling,
        shipping: normalizedShipping,
        line_items: line_items.map(item => {
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.price);

          // 圣诞刮刮乐免费实物礼物：使用合法 product_id 满足 WC 接口校验，但覆写礼盒名称与 $0.00 价格
          if (item.isXmasMysteryGift || Number(item.product_id) === 0) {
            return {
              product_id: fallbackGiftProductId,
              name: item.name || 'Christmas Mystery Gift',
              quantity: qty,
              subtotal: '0.00',
              total: '0.00',
              meta_data: [
                { key: '_eb_xmas_mystery_gift', value: 'yes' },
                { key: '_eb_gift_title', value: item.name || 'Christmas Mystery Gift' }
              ]
            };
          }

          const lineItem: any = {
            product_id: Number(item.product_id),
            variation_id: item.variation_id ? Number(item.variation_id) : undefined,
            quantity: qty,
          };
          if (!isNaN(unitPrice) && unitPrice >= 0) {
            const lineSum = (unitPrice * qty).toFixed(2);
            lineItem.subtotal = lineSum;
            lineItem.total = lineSum;
          }
          return lineItem;
        }),
        shipping_lines: shippingLines,
        coupon_lines: Array.isArray(coupon_lines) ? coupon_lines : [],
        meta_data: metaData
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
        const errText = await wcOrderRes.text();
        console.error('❌ WooCommerce 创建订单失败:', wcOrderRes.status, errText);
        return new Response(
          JSON.stringify({ error: 'Failed to create WooCommerce order', details: errText }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      wcOrder = await wcOrderRes.json();

      // 补齐非优惠券特权折扣（VIP 会员折扣 / $200大礼包 / 积分抵扣 / 圣诞阶梯满减）
      const wcCouponDiscount = parseFloat(wcOrder.discount_total || '0') || 0;
      const numericDiscountTotal = Number(discountTotal) || 0;
      const remainingPrivilegeDiscount = Math.max(0, parseFloat((numericDiscountTotal - wcCouponDiscount).toFixed(2)));

      if (remainingPrivilegeDiscount > 0) {
        const feeTitle = (Array.isArray(appliedOffers) ? appliedOffers.filter(o => !o.startsWith('Coupon Code:')).join(' + ') : '') || 'VIP & Rewards Discount';
        const updateFeeRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${wcOrder.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${wcAuth}`,
          },
          body: JSON.stringify({
            fee_lines: [
              {
                name: feeTitle,
                total: (-remainingPrivilegeDiscount).toFixed(2),
                tax_status: 'none'
              }
            ]
          }),
        });
        if (updateFeeRes.ok) {
          wcOrder = await updateFeeRes.json();
        }
      }
    }

    const orderTotal = Math.max(0.01, parseFloat(wcOrder.total)).toFixed(2);
    const orderCurrency = (wcOrder.currency || currency).toUpperCase();
    const orderShipping = wcOrder.shipping || {};
    const finalShippingIso = normalizeCountryCode(orderShipping.country || billing?.country || 'US');

    // 3. 获取 PayPal Access Token
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

    // 4. 创建新的 PayPal 收款单并绑定原 WooCommerce 订单号
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
              name: { full_name: `${orderShipping.first_name || ''} ${orderShipping.last_name || ''}`.trim() || 'Customer' },
              address: {
                address_line_1: orderShipping.address_1 || '',
                address_line_2: orderShipping.address_2 || undefined,
                admin_area_2: orderShipping.city || '',
                admin_area_1: orderShipping.state || '',
                postal_code: orderShipping.postcode || '',
                country_code: finalShippingIso,
              },
            },
          },
        ],
        application_context: {
          brand_name: 'E.B.Belle',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${SITE_URL}/checkout/confirmation?order_id=${wcOrder.id}&order_key=${wcOrder.order_key}`,
          cancel_url: `${SITE_URL}/checkout/confirmation?order_id=${wcOrder.id}&order_key=${wcOrder.order_key}&payment=paypal&status=cancelled`,
        },
      }),
    });

    if (!paypalOrderRes.ok) {
      const ppErr = await paypalOrderRes.json();
      console.error('❌ PayPal Order Create Error:', ppErr);
      throw new Error('PayPal API error: ' + JSON.stringify(ppErr));
    }

    const paypalOrder = await paypalOrderRes.json();

    // 5. 更新最新 PayPal Order ID 回原 WooCommerce 订单
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