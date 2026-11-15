import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
  const userId = cookies.get('user_id')?.value;
  if (!userId) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
  }

  const wpUrl = import.meta.env.WC_STORE_URL || import.meta.env.WOOCOMMERCE_URL || 'https://api.ebbellejewelry.com';
  const ck = import.meta.env.WC_CONSUMER_KEY || import.meta.env.WOOCOMMERCE_KEY || '';
  const cs = import.meta.env.WC_CONSUMER_SECRET || import.meta.env.WOOCOMMERCE_SECRET || '';

  try {
    const res = await fetch(`${wpUrl}/wp-json/ebbelle/v1/vip-summary?user_id=${userId}&consumer_key=${ck}&consumer_secret=${cs}`, {
      headers: { 'Content-Type': 'application/json' },
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