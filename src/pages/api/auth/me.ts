import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionToken = cookies.get('session_token')?.value;
    const userId = cookies.get('user_id')?.value;
    const userEmail = cookies.get('user_email')?.value;

    if (!sessionToken || !userId || !userEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          authenticated: false,
          message: 'Not authenticated',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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

    // 获取用户信息
    const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const customerUrl = `${WC_URL}/wp-json/wc/v3/customers/${userId}`;

    const response = await fetch(customerUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      // Session可能已过期或用户已删除，清除cookies
      cookies.delete('session_token', { path: '/' });
      cookies.delete('user_id', { path: '/' });
      cookies.delete('user_email', { path: '/' });

      return new Response(
        JSON.stringify({
          success: false,
          authenticated: false,
          message: 'Session expired',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userData = await response.json();

    // 验证邮箱是否匹配（额外的安全检查）
    if (userData.email !== userEmail) {
      cookies.delete('session_token', { path: '/' });
      cookies.delete('user_id', { path: '/' });
      cookies.delete('user_email', { path: '/' });

      return new Response(
        JSON.stringify({
          success: false,
          authenticated: false,
          message: 'Session invalid',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        authenticated: true,
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          displayName: `${userData.first_name} ${userData.last_name}`,
          avatar: userData.avatar_url,
          billing: userData.billing,
          shipping: userData.shipping,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        authenticated: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
