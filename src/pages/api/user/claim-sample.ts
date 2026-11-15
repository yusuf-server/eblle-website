import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies }) => {
  const userId = cookies.get('user_id')?.value;
  if (!userId) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json();
  const wpUrl = import.meta.env.WC_STORE_URL || import.meta.env.WOOCOMMERCE_URL || 'https://api.ebbellejewelry.com';
  const ck = import.meta.env.WC_CONSUMER_KEY || import.meta.env.WOOCOMMERCE_KEY || '';
  const cs = import.meta.env.WC_CONSUMER_SECRET || import.meta.env.WOOCOMMERCE_SECRET || '';

  try {
    const res = await fetch(`${wpUrl}/wp-json/ebbelle/v1/claim-sample?consumer_key=${ck}&consumer_secret=${cs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        sample_note: body.sample_note || '',
      }),
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