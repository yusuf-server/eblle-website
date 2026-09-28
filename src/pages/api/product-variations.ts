import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('===== 变体API被调用 (POST) =====');

    let body;
    try {
      const text = await request.text();
      console.log('请求体原始文本:', text);
      body = JSON.parse(text);
    } catch (e) {
      console.error('JSON解析失败:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const productId = body.productId;
    console.log('解析的产品ID:', productId);

    if (!productId) {
      console.error('缺少产品ID参数');
      return new Response(JSON.stringify({ error: 'Product ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('获取产品变体，产品ID:', productId);

    const WC_STORE_URL = (import.meta.env.WC_STORE_URL || '').replace(/\/$/, '');
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    // 获取所有变体
    const apiUrl = new URL(`${WC_STORE_URL}/wp-json/wc/v3/products/${productId}/variations`);
    apiUrl.searchParams.append('per_page', '100');

    // 跨环境 Base64 编码
    const authString = `${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`;
    const base64Auth = typeof Buffer !== 'undefined'
      ? Buffer.from(authString).toString('base64')
      : btoa(authString);

    // 保持最纯粹的请求头
    const headers: Record<string, string> = {
      'Authorization': `Basic ${base64Auth}`,
      'Accept': 'application/json',
      'User-Agent': 'curl/7.88.1'
    };

    console.log('请求WooCommerce API:', apiUrl.toString());

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers
    });

    console.log('WooCommerce响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WooCommerce API错误:', errorText);
      throw new Error(`WooCommerce API error: ${response.status}`);
    }

    const variations = await response.json();
    console.log(`获取到 ${variations.length} 个变体`);

    return new Response(JSON.stringify(variations), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('获取变体失败:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch variations',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
