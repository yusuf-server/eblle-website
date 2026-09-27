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

    const consumerKey = "ck_6bc2dd3dfd88dd3c8f6c3d48e3f78b8ef0131fb7";
    const consumerSecret = "cs_2ea17d3b89e2b732c78feb38e9dd7cc8698ebcad";
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    // 获取所有变体
    const apiUrl = `https://ebbellejewelry.com/wp-json/wc/v3/products/${productId}/variations?per_page=100`;
    console.log('请求WooCommerce API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
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
