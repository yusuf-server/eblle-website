import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { type, address } = await request.json();

    // 检查用户是否登录
    const userId = cookies.get('user_id')?.value;

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Not authenticated',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证地址类型
    if (type !== 'billing' && type !== 'shipping') {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid address type',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // WooCommerce API 配置
    const WC_URL = import.meta.env.WC_STORE_URL || import.meta.env.WC_URL;
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
      console.error('WooCommerce credentials not configured');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Server configuration error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 更新地址
    const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const customerUrl = `${WC_URL}/wp-json/wc/v3/customers/${userId}`;

    const updateData: any = {};
    updateData[type] = {
      first_name: address.firstName || '',
      last_name: address.lastName || '',
      company: address.company || '',
      address_1: address.address1 || '',
      address_2: address.address2 || '',
      city: address.city || '',
      state: address.state || '',
      postcode: address.postcode || '',
      country: address.country || '',
      email: address.email || '',
      phone: address.phone || '',
    };

    const response = await fetch(customerUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({
          success: false,
          message: errorData.message || 'Failed to update address',
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userData = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Address updated successfully',
        address: userData[type],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update address error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
