import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { translate } from '../../lib/i18n/translator';
import type { SupportedLocale } from '../../lib/i18n/utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // 兼容入参：可能传的是 { products: [...] } 或直接传了数组 [...]
    const rawProducts = Array.isArray(body) ? body : (body.products || []);
    // 兼容两种字段名：targetLang（客户端）和 locale
    const locale = (body.targetLang || body.locale || 'en') as SupportedLocale;

    console.log('[API translate-products] 接收到的语言参数:', { targetLang: body.targetLang, locale: body.locale, 最终使用: locale });

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 深拷贝一份产品列表，避免直接突变源数据
    const translatedProducts = JSON.parse(JSON.stringify(rawProducts));
    const CONCURRENCY = 4;

    // 分批并发处理翻译与写入 KV
    for (let i = 0; i < translatedProducts.length; i += CONCURRENCY) {
      const chunk = translatedProducts.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (prod: any) => {
          if (prod && prod.name) {
            try {
              const translatedName = await translate(
                prod.name,
                locale,
                {
                  cache: env.TRANSLATION_CACHE,
                  cachePrefix: 'product',
                  allowLiveInference: true // 允许预热与实时翻译写入 KV
                }
              );
              prod.name = translatedName;
            } catch (err) {
              console.warn(`[Translate Error] 商品 ${prod.id || prod.name} 翻译失败:`, err);
            }
          }
        })
      );
    }

    // 核心：直接返回产品数组，供 shop.astro 中的 products.map 调用
    return new Response(JSON.stringify(translatedProducts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[API /api/translate-products Error]:', error);
    // 出错时返回空数组，避免前端再次抛出 products.map is not a function
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};