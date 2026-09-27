import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { firstName, lastName, email, password } = await request.json();

    // 验证必填字段
    if (!firstName || !lastName || !email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'All fields are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证密码长度
    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Password must be at least 8 characters',
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

    // 创建用户
    const createUserUrl = `${WC_URL}/wp-json/wc/v3/customers`;
    const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

    const response = await fetch(createUserUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        email: email,
        first_name: firstName,
        last_name: lastName,
        username: email, // 使用email作为username
        password: password,
        billing: {
          first_name: firstName,
          last_name: lastName,
          email: email,
        },
        shipping: {
          first_name: firstName,
          last_name: lastName,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WooCommerce registration error:', data);

      // 处理常见错误
      let errorMessage = 'Registration failed';
      if (data.code === 'registration-error-email-exists') {
        errorMessage = 'This email is already registered';
      } else if (data.message) {
        errorMessage = data.message;
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 注册成功，返回用户信息（不包含密码）
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration successful',
        user: {
          id: data.id,
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
