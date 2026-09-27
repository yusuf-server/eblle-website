import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { login, key } = await request.json();

    // 验证必填字段
    if (!login || !key) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Login and key are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // WooCommerce API 配置
    const WC_URL = import.meta.env.WC_STORE_URL || import.meta.env.WC_URL;

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

    // 调用WordPress插件的verify-reset-key端点
    const verifyUrl = `${WC_URL}/wp-json/custom-auth/v1/verify-reset-key`;

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ login, key }),
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
        message: data.message || 'Key is valid',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Verify reset key error:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
