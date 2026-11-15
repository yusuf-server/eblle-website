import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const wpUrl = import.meta.env.WC_STORE_URL || import.meta.env.WOOCOMMERCE_URL || 'https://api.ebbellejewelry.com';
    const ck = import.meta.env.WC_CONSUMER_KEY || import.meta.env.WOOCOMMERCE_KEY || '';
    const cs = import.meta.env.WC_CONSUMER_SECRET || import.meta.env.WOOCOMMERCE_SECRET || '';

    // 优先读取登录 Cookie
    const loggedUserId = cookies.get('user_id')?.value;

    const payload = {
      email: body.email || '',
      user_id: loggedUserId ? parseInt(loggedUserId, 10) : null,
      subtotal: parseFloat(body.subtotal) || 0,
      country: (body.country || 'US').toUpperCase(),
      selected_offer: body.selected_offer || '',
      use_points: Boolean(body.use_points), // 积分勾选开关透传
      manual_coupon: body.manual_coupon || '',
    };

    const res = await fetch(`${wpUrl}/wp-json/ebbelle/v1/checkout/calculate?consumer_key=${ck}&consumer_secret=${cs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500 });
  }
};