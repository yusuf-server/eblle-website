import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';

export const prerender = false;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const env = getEnv(locals);
    const body = await request.json();
    const wpUrl = (
      env.WC_STORE_URL ||
      import.meta.env.WC_STORE_URL ||
      import.meta.env.WOOCOMMERCE_URL ||
      'https://api.ebbellejewelry.com'
    ).replace(/\/$/, '');
    const ck = env.WC_CONSUMER_KEY || import.meta.env.WC_CONSUMER_KEY || import.meta.env.WOOCOMMERCE_KEY || '';
    const cs = env.WC_CONSUMER_SECRET || import.meta.env.WC_CONSUMER_SECRET || import.meta.env.WOOCOMMERCE_SECRET || '';

    // 优先读取登录 Cookie
    const loggedUserId = cookies.get('user_id')?.value;

    const payload = {
      email: body.email || '',
      user_id: loggedUserId ? parseInt(loggedUserId, 10) : null,
      subtotal: parseFloat(body.subtotal) || 0,
      country: (body.country || 'US').toUpperCase(),
      selected_offer: body.selected_offer || '',
      promo_mode: body.promo_mode || '',
      use_points: Boolean(body.use_points),
      manual_coupon: body.manual_coupon || '',
    };

    const items = Array.isArray(body.items) ? body.items : [];

    // 并行请求原 VIP 试算接口（10s 超时熔断）与独立圣诞满赠试算接口（6s 独立超时）
    const vipPromise = fetchWithTimeout(
      `${wpUrl}/wp-json/ebbelle/v1/checkout/calculate?consumer_key=${ck}&consumer_secret=${cs}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      10000
    );

    const xmasPromise =
      items.length > 0
        ? fetchWithTimeout(
            `${wpUrl}/wp-json/ebbelle/v1/christmas/calculate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items }),
            },
            6000
          ).catch(() => null)
        : Promise.resolve(null);

    const [vipRes, xmasRes] = await Promise.all([vipPromise, xmasPromise]);
    const vipData = await vipRes.json();

    let xmasData: any = null;
    if (xmasRes && xmasRes.ok) {
      try {
        xmasData = await xmasRes.json();
      } catch (e) {
        xmasData = null;
      }
    }

    if (vipData && typeof vipData === 'object') {
      vipData.xmas_data = xmasData;
    }

    return new Response(JSON.stringify(vipData), {
      status: vipRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    const isTimeout = error?.name === 'AbortError';
    return new Response(
      JSON.stringify({
        success: false,
        message: isTimeout ? 'Calculation request timed out' : error.message,
      }),
      { status: isTimeout ? 504 : 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};