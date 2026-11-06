import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email: rawEmail, password, rememberMe } = await request.json();

    // 验证必填字段
    if (!rawEmail || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Email and password are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 清理邮箱格式（去空格、转小写）
    const email = rawEmail.trim().toLowerCase();

    // WordPress / WooCommerce 地址
    const WC_URL = import.meta.env.WC_STORE_URL || import.meta.env.WC_URL;
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    if (!WC_URL) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Server configuration error',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 步骤 1：直接调用插件的验证端点进行校验
    const validateUrl = `${WC_URL}/wp-json/custom-auth/v1/validate`;
    console.log('🔐 Validating credentials for:', email);

    const validateResponse = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!validateResponse.ok) {
      console.log('❌ Validate failed with status:', validateResponse.status);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validateData = await validateResponse.json();

    if (!validateData.valid) {
      console.log('❌ Credentials are not valid');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Password validated successfully');

    // 步骤 2：提取验证接口返回的用户信息
    let user = validateData.user || {
      id: validateData.user_id,
      email: email,
      firstName: '',
      lastName: '',
      displayName: email.split('@')[0],
    };

    // 步骤 3：可选补充：尝试从 WooCommerce 检索客户详情（若有则覆盖更完整的姓名）
    if (WC_CONSUMER_KEY && WC_CONSUMER_SECRET) {
      try {
        const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
        const searchUrl = `${WC_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`;
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Basic ${auth}` },
        });

        if (searchRes.ok) {
          const customers = await searchRes.json();
          if (customers && customers.length > 0) {
            const customer = customers[0];
            user = {
              id: customer.id,
              email: customer.email,
              firstName: customer.first_name || user.firstName,
              lastName: customer.last_name || user.lastName,
              displayName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || user.displayName,
            };
          }
        }
      } catch (e) {
        console.warn('⚠️ Could not fetch extra customer details from WC API, using basic user info.');
      }
    }

    // 步骤 4：生成会话与写入 Cookie
    const sessionToken = Buffer.from(
      `${user.id}:${Date.now()}:${Math.random().toString(36)}`
    ).toString('base64');

    const cookieOptions = {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
    };

    cookies.set('session_token', sessionToken, cookieOptions);
    cookies.set('user_id', String(user.id), cookieOptions);
    cookies.set('user_email', user.email, cookieOptions);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Login successful',
        user: user,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};