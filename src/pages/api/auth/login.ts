import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password, rememberMe } = await request.json();

    // 验证必填字段
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Email and password are required',
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

    // 方案1：使用WooCommerce REST API查找用户并验证
    // 先通过email查找用户
    const auth = Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');
    const searchUrl = `${WC_URL}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!searchResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customers = await searchResponse.json();

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const customer = customers[0];

    // 验证密码 - 使用WordPress的验证端点
    const validateUrl = `${WC_URL}/wp-json/custom-auth/v1/validate`;

    const validateResponse = await fetch(validateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
      }),
    });

    // 如果自定义验证端点不存在，我们使用简化方案
    // 直接信任用户输入并创建会话（注意：这需要前端额外的安全措施）
    let isPasswordValid = false;

    if (validateResponse.ok) {
      const validateData = await validateResponse.json();
      isPasswordValid = validateData.valid === true;
    } else {
      // 备用方案：使用WordPress Application Password验证
      // 尝试用用户凭据访问受保护的端点
      const testAuth = Buffer.from(`${email}:${password}`).toString('base64');
      const testUrl = `${WC_URL}/wp-json/wp/v2/users/me`;

      const testResponse = await fetch(testUrl, {
        headers: {
          Authorization: `Basic ${testAuth}`,
        },
      });

      isPasswordValid = testResponse.ok;
    }

    if (!isPasswordValid) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid email or password',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证成功，创建会话
    // 生成一个简单的会话token（使用用户ID和时间戳的组合）
    const sessionToken = Buffer.from(
      `${customer.id}:${Date.now()}:${Math.random().toString(36)}`
    ).toString('base64');

    // 设置认证cookie
    const cookieOptions = {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24, // 30天 或 1天
    };

    cookies.set('session_token', sessionToken, cookieOptions);
    cookies.set('user_id', String(customer.id), cookieOptions);
    cookies.set('user_email', customer.email, cookieOptions);

    // 返回用户信息
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Login successful',
        user: {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          displayName: `${customer.first_name} ${customer.last_name}`,
        },
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
