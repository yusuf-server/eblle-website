import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, token } = await request.json();

    // 验证必填字段
    if (!email || !token) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Email and token are required',
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
          valid: false,
          message: 'Server configuration error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 调用WordPress插件的verify-reset-token端点
    const verifyUrl = `${WC_URL}/wp-json/custom-auth/v1/verify-reset-token`;

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, token }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: data.message || 'Invalid or expired reset link',
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        message: data.message || 'Token is valid',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verify reset token error:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
