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

    const WC_STORE_URL = import.meta.env.WC_STORE_URL;
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    // 获取所有变体
    const apiUrl = new URL(`${WC_STORE_URL}/wp-json/wc/v3/products/${productId}/variations`);
    apiUrl.searchParams.append('consumer_key', WC_CONSUMER_KEY);
    apiUrl.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
    apiUrl.searchParams.append('per_page', '100');

    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    console.log('请求WooCommerce API:', apiUrl.toString());

    const response = await fetch(apiUrl.toString(), { headers });

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
