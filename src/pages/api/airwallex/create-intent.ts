/**
 * 创建或复用 Pending WooCommerce 订单，并生成 Airwallex PaymentIntent
 */
import type { APIRoute } from 'astro';
import { getEnv, validateAirwallexEnv } from '../../../lib/env';
import {
  getAirwallexAccessToken,
  getAirwallexBaseUrl,
  generateRequestId,
  normalizeCountryCode,
} from '../../../lib/airwallex';

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

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const env = getEnv(locals);
    const validation = validateAirwallexEnv(env);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error', details: `Missing: ${validation.missing.join(', ')}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const SITE_URL = (import.meta.env.PUBLIC_SITE_URL || 'https://ebbellejewelry.com').replace(/\/$/, '');
    const body = (await request.json()) as RequestBody;
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
      currency = 'USD',
    } = body;

    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);

   // 1. 检查是否可复用已有的 Pending 订单（防止切换支付方式或更新账单地址时重复建单）
    let wcOrder: any = null;
    if (Number(existingOrderId) > 0) {
      try {
        const checkRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${Number(existingOrderId)}`, {
          headers: { Authorization: `Basic ${wcAuth}` },
        });
        if (checkRes.ok) {
          const candidate = await checkRes.json();
          const keyMatches = !existingOrderKey || candidate.order_key === existingOrderKey;
          if (candidate.status === 'pending' && keyMatches) {
            wcOrder = candidate;
            const updatePayload: any = {};
            if (candidate.payment_method !== 'airwallex_card') {
              updatePayload.payment_method = 'airwallex_card';
              updatePayload.payment_method_title = 'Credit / Debit Card (Airwallex)';
            }
            if (billing?.first_name || billing?.address_1) {
              updatePayload.billing = {
                ...candidate.billing,
                ...billing,
                country: normalizeCountryCode(billing.country || candidate.billing?.country || 'US'),
              };
            }
            if (Object.keys(updatePayload).length > 0) {
              const switchRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${wcOrder.id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Basic ${wcAuth}`,
                },
                body: JSON.stringify(updatePayload),
              });
              if (switchRes.ok) {
                wcOrder = await switchRes.json();
              }
            }
          }
        }
      } catch (e) {
        console.warn('检查已有 pending 订单失败，将创建新订单:', e);
      }
    }

    // 2. 若无有效 Pending 订单，则新建 WooCommerce 订单（完全对齐 PayPal 建单逻辑）
    if (!wcOrder) {
      if (!billing?.email || !billing?.first_name || !billing?.last_name) {
        return new Response(JSON.stringify({ error: 'Missing required billing information' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (!line_items || line_items.length === 0) {
        return new Response(JSON.stringify({ error: 'Cart is empty' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
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
          total: safeShippingCost.toFixed(2),
        },
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
            { headers: { Authorization: `Basic ${wcAuth}` } }
          );
          if (searchResponse.ok) {
            const customers = await searchResponse.json();
            if (Array.isArray(customers) && customers.length > 0) customerId = customers[0].id;
          }
        } catch (e) {}
      }

      const metaData: Array<{ key: string; value: string }> = [
        { key: '_payment_pending', value: 'yes' },
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

      const firstValidItem = line_items.find(
        (it) => !it.isXmasMysteryGift && Number(it.product_id) > 0
      );
      const fallbackGiftProductId = firstValidItem ? Number(firstValidItem.product_id) : 57994;

      const orderPayload: any = {
        status: 'pending',
        currency: currency.toUpperCase(),
        payment_method: 'airwallex_card',
        payment_method_title: 'Credit / Debit Card (Airwallex)',
        set_paid: false,
        billing: normalizedBilling,
        shipping: normalizedShipping,
        line_items: line_items.map((item) => {
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.price);

          if (item.isXmasMysteryGift || Number(item.product_id) === 0) {
            return {
              product_id: fallbackGiftProductId,
              name: item.name || 'Christmas Mystery Gift',
              quantity: qty,
              subtotal: '0.00',
              total: '0.00',
              meta_data: [
                { key: '_eb_xmas_mystery_gift', value: 'yes' },
                { key: '_eb_gift_title', value: item.name || 'Christmas Mystery Gift' },
              ],
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
        meta_data: metaData,
      };

      if (customerId) orderPayload.customer_id = customerId;

      const wcOrderRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${wcAuth}`,
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

      // 补齐非优惠券特权折扣
      const wcCouponDiscount = parseFloat(wcOrder.discount_total || '0') || 0;
      const numericDiscountTotal = Number(discountTotal) || 0;
      const remainingPrivilegeDiscount = Math.max(0, parseFloat((numericDiscountTotal - wcCouponDiscount).toFixed(2)));

      if (remainingPrivilegeDiscount > 0) {
        const feeTitle =
          (Array.isArray(appliedOffers) ? appliedOffers.filter((o) => !o.startsWith('Coupon Code:')).join(' + ') : '') ||
          'VIP & Rewards Discount';
        const updateFeeRes = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${wcOrder.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${wcAuth}`,
          },
          body: JSON.stringify({
            fee_lines: [
              {
                name: feeTitle,
                total: (-remainingPrivilegeDiscount).toFixed(2),
                tax_status: 'none',
              },
            ],
          }),
        });
        if (updateFeeRes.ok) {
          wcOrder = await updateFeeRes.json();
        }
      }
    }

    const orderTotal = Math.max(0.01, parseFloat(wcOrder.total));
    const orderCurrency = (wcOrder.currency || currency).toUpperCase();
    const orderBilling = wcOrder.billing || billing || {};
    const orderShipping = wcOrder.shipping || shipping || {};
    const finalShippingIso = normalizeCountryCode(orderShipping.country || orderBilling.country || 'US');

    // 3. 获取 Airwallex Access Token 并创建 PaymentIntent（传入实物风控所需的完整客户/商品/收货地址信息）
    const token = await getAirwallexAccessToken(env);
    const awxBaseUrl = getAirwallexBaseUrl(env);

    const awxProducts = (wcOrder.line_items || []).map((item: any) => ({
      code: String(item.product_id || item.id || 'ITEM'),
      name: String(item.name || 'Jewelry Piece').slice(0, 120),
      desc: String(item.name || 'E.B.Belle Jewelry').slice(0, 200),
      quantity: Number(item.quantity) || 1,
      sku: String(item.sku || item.product_id || 'SKU'),
      type: 'physical',
      unit_price: parseFloat(item.price || '0') || 0,
    }));

    const returnUrl = `${SITE_URL}/checkout/confirmation?order_id=${wcOrder.id}&order_key=${wcOrder.order_key}&payment=airwallex`;

    const intentPayload: any = {
      request_id: generateRequestId(),
      amount: Number(orderTotal.toFixed(2)),
      currency: orderCurrency,
      merchant_order_id: String(wcOrder.id),
      descriptor: 'EBBELLE JEWELRY',
      return_url: returnUrl,
      metadata: {
        wc_order_id: String(wcOrder.id),
        wc_order_key: String(wcOrder.order_key || ''),
      },
      customer: {
        email: orderBilling.email || '',
        first_name: orderBilling.first_name || 'Customer',
        last_name: orderBilling.last_name || '',
        phone_number: orderBilling.phone || '',
        merchant_customer_id: wcOrder.customer_id ? String(wcOrder.customer_id) : (orderBilling.email || undefined),
      },
      order: {
        type: 'physical_goods',
        products: awxProducts,
        shipping: {
          first_name: orderShipping.first_name || orderBilling.first_name || 'Customer',
          last_name: orderShipping.last_name || orderBilling.last_name || '',
          email: orderBilling.email || '',
          phone_number: orderBilling.phone || '',
          shipping_method: shippingMethod === 'express' ? 'Express' : 'Standard',
          address: {
            country_code: finalShippingIso,
            state: orderShipping.state || orderBilling.state || 'N/A',
            city: orderShipping.city || orderBilling.city || 'N/A',
            street: [orderShipping.address_1 || orderBilling.address_1, orderShipping.address_2 || orderBilling.address_2]
              .filter(Boolean)
              .join(', ') || 'N/A',
            postcode: orderShipping.postcode || orderBilling.postcode || '00000',
          },
        },
      },
    };

    const intentRes = await fetch(`${awxBaseUrl}/api/v1/pa/payment_intents/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(intentPayload),
    });

    const intentData = await intentRes.json();

    if (!intentRes.ok || !intentData?.id || !intentData?.client_secret) {
      console.error('❌ Airwallex Create PaymentIntent 失败:', intentRes.status, intentData);
      return new Response(
        JSON.stringify({
          error: 'Airwallex PaymentIntent creation failed',
          details: intentData?.message || JSON.stringify(intentData),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. 将 Airwallex PaymentIntent ID 记录到 WooCommerce 订单元数据
    await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/orders/${wcOrder.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${wcAuth}`,
      },
      body: JSON.stringify({
        meta_data: [
          { key: '_airwallex_intent_id', value: intentData.id },
        ],
      }),
    });

    return new Response(
      JSON.stringify({
        success: true,
        intentId: intentData.id,
        clientSecret: intentData.client_secret,
        orderId: wcOrder.id,
        orderKey: wcOrder.order_key,
        amount: orderTotal.toFixed(2),
        currency: orderCurrency,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Airwallex 创建订单异常:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};