import type { APIRoute } from 'astro';
import { getProductVariations } from '../../../lib/woocommerce';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    console.log('===== 变体API被调用 =====');
    console.log('params:', params);

    const productId = params.id;
    console.log('解析的产品ID:', productId);

    if (!productId) {
      console.error('缺少产品ID参数');
      return new Response(JSON.stringify({ error: 'Product ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('获取产品变体，产品ID:', productId);

    // 使用woocommerce库的方法获取变体
    const variations = await getProductVariations(parseInt(productId), 100);
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
