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

    // 诊断：检查绑定状态
    const bindingCheck = {
      'locals.AI': !!locals.AI,
      'locals.TRANSLATION_CACHE': !!locals.TRANSLATION_CACHE,
      'locals.runtime.env.AI': !!(locals as any).runtime?.env?.AI,
      'locals_keys': Object.keys(locals),
      'runtime_env_keys': (locals as any).runtime?.env ? Object.keys((locals as any).runtime.env) : []
    };

    console.log(`[API] 批量翻译 ${products.length} 个产品到 ${targetLang}`);
    console.log(`[API] 绑定诊断:`, JSON.stringify(bindingCheck, null, 2));

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
    return new Response(JSON.stringify({ error: 'Batch translation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const prerender = false;
