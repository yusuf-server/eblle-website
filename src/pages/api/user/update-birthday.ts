import type { APIRoute } from 'astro';
import { getEnv } from '../../../lib/env';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  try {
    const env = getEnv(locals);

    // 1. 从登录 Cookie 中读取当前用户 ID
    const userIdStr = cookies.get('user_id')?.value;
    const userId = userIdStr ? parseInt(userIdStr, 10) : 0;

    if (!userId || isNaN(userId)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Please log in first.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. 读取前端传入的 birthday
    const body = await request.json().catch(() => ({}));
    const birthday = typeof body.birthday === 'string' ? body.birthday.trim() : '';

    if (!birthday) {
      return new Response(
        JSON.stringify({ success: false, message: 'Birthday date is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. 仅通过 URL 查询参数传递 consumer_key 进行鉴权（绝不带 Authorization: Basic 头，避免触发 WP 核心账号密码校验）
    const wpUrl = new URL(`${env.WC_STORE_URL}/wp-json/ebbelle/v1/update-birthday`);
    wpUrl.searchParams.set('consumer_key', env.WC_CONSUMER_KEY);

    const wpRes = await fetch(wpUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        birthday: birthday
      })
    });

    const wpData = await wpRes.json().catch(() => ({}));

    if (!wpRes.ok || wpData.code) {
      return new Response(
        JSON.stringify({
          success: false,
          message: wpData.message || 'Failed to save birthday.'
        }),
        { status: wpRes.status || 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        birthday: wpData.birthday || birthday,
        message: wpData.message || 'Birthday saved successfully!'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ update-birthday API error:', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};