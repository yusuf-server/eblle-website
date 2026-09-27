import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, token, new_password } = await request.json();

    // 验证必填字段
    if (!email || !token || !new_password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'All fields are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证密码长度
    if (new_password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Password must be at least 8 characters',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // WooCommerce API 配置
    const WC_URL = import.meta.env.WC_URL;

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

    // 调用WordPress插件的reset-password端点
    const resetUrl = `${WC_URL}/wp-json/custom-auth/v1/reset-password`;

    const response = await fetch(resetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, token, new_password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: data.message || 'Failed to reset password',
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: data.message || 'Password reset successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
