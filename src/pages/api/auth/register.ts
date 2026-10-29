import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { firstName, lastName, email, password } = await request.json();

    if (!firstName || !lastName || !email || !password) {
      return new Response(
        JSON.stringify({ success: false, message: 'All fields are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, message: 'Password must be at least 8 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const WC_URL = import.meta.env.WC_STORE_URL || import.meta.env.WC_URL;
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    if (!WC_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
      return new Response(
        JSON.stringify({ success: false, message: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const createUserUrl = `${WC_URL}/wp-json/wc/v3/customers`;
    const auth = btoa(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`);

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
        username: email,
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
      let errorMessage = 'Registration failed';
      if (data.code === 'registration-error-email-exists') {
        errorMessage = 'This email is already registered';
      } else if (data.message) {
        errorMessage = data.message;
      }

      return new Response(
        JSON.stringify({ success: false, message: errorMessage }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 🔴 关键修复：注册成功后，直接种下登录 Cookie（实现无感登录）
    const sessionToken = btoa(`${data.id}:${Date.now()}:${Math.random().toString(36)}`);
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30天
    };

    cookies.set('session_token', sessionToken, cookieOptions);
    cookies.set('user_id', String(data.id), cookieOptions);
    cookies.set('user_email', data.email, cookieOptions);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration successful',
        user: {
          id: data.id,
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
          displayName: `${data.first_name} ${data.last_name}`.trim(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'An unexpected error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};