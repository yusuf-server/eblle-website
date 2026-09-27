import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { user_id, new_password } = await request.json();

    // 验证必填字段
    if (!user_id || !new_password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'User ID and new password are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证新密码长度
    if (new_password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'New password must be at least 8 characters',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查用户是否登录
    const sessionUserId = cookies.get('user_id')?.value;

    if (!sessionUserId || String(sessionUserId) !== String(user_id)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Not authenticated',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // WooCommerce API 配置
    const WC_URL = import.meta.env.WC_STORE_URL || import.meta.env.WC_URL;

    if (!WC_URL) {
      console.error('WooCommerce URL not configured');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Server configuration error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 调用WordPress插件的change-password端点
    const changeUrl = `${WC_URL}/wp-json/custom-auth/v1/change-password`;

    const response = await fetch(changeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user_id,
        new_password: new_password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: data.message || 'Failed to update password',
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: data.message || 'Password updated successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Change password error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
