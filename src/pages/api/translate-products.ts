import type { APIRoute } from 'astro';
import { translateProducts } from '../../lib/i18n/product-translator';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { products, targetLang } = await request.json();

    if (!products || !Array.isArray(products) || !targetLang) {
      return new Response(JSON.stringify({ error: 'Missing products array or targetLang' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API] 批量翻译 ${products.length} 个产品到 ${targetLang}`);
    console.log(`[API] AI 绑定可用: ${!!locals.AI}`);

    const startTime = Date.now();

    // 批量翻译产品
    const translatedProducts = await translateProducts(products, targetLang, locals);

    const elapsed = Date.now() - startTime;
    console.log(`[API] 批量翻译完成，耗时: ${elapsed}ms`);

    return new Response(JSON.stringify(translatedProducts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Batch translation API error:', error);
    return new Response(JSON.stringify({
      error: 'Batch translation failed',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const prerender = false;
