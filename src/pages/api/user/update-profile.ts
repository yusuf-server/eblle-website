import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { firstName, lastName, displayName, email } = await request.json();

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

    // 验证必填字段
    if (!firstName || !lastName || !email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'First name, last name, and email are required',
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

    // 更新用户信息
    const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const customerUrl = `${WC_URL}/wp-json/wc/v3/customers/${userId}`;

    const updateData: any = {
      first_name: firstName,
      last_name: lastName,
      email: email,
    };

    // 注意：不要尝试更新username或displayName，WooCommerce API不允许

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
          message: errorData.message || 'Failed to update profile',
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userData = await response.json();

    // 更新cookie中的邮箱
    cookies.set('user_email', email, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
