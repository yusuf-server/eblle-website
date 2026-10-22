import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

/**
 * 清除缓存 API
 * 访问: /api/clear-cache?key=YOUR_SECRET_KEY&type=homepage&locale=all
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const providedKey = url.searchParams.get('key');
  const cacheType = url.searchParams.get('type') || 'homepage'; // homepage, product, all
  const locale = url.searchParams.get('locale') || 'all'; // en, fr, de, es, all

  // 安全密钥（从环境变量读取）
  const SECRET_KEY = import.meta.env.CACHE_CLEAR_SECRET || 'your-secret-key-change-me';

  // 验证密钥
  if (providedKey !== SECRET_KEY) {
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: '无效的密钥'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const kvCache = env?.TRANSLATION_CACHE || locals?.TRANSLATION_CACHE;

  if (!kvCache) {
    return new Response(JSON.stringify({
      error: 'KV not available',
      message: 'KV 缓存不可用'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const deletedKeys: string[] = [];

    // 要清除的语言列表
    const locales = locale === 'all' ? ['en', 'fr', 'de', 'es'] : [locale];

    // 清除首页缓存
    if (cacheType === 'homepage' || cacheType === 'all') {
      for (const loc of locales) {
        // 清除所有版本（v1-v10）
        for (let version = 1; version <= 10; version++) {
          const key = `homepage:${loc}:${today}:v${version}`;
          try {
            await kvCache.delete(key);
            deletedKeys.push(key);
          } catch (e) {
            console.warn(`删除 ${key} 失败:`, e);
          }
        }
      }
    }

    // 清除产品缓存（可选，如果需要的话）
    if (cacheType === 'product' || cacheType === 'all') {
      // 产品缓存通常是按 ID 存储的，这里可以清除通用的翻译缓存
      // 如果需要清除特定产品，可以添加 productId 参数
      console.log('产品缓存清除功能待实现');
    }

    return new Response(JSON.stringify({
      success: true,
      message: '缓存清除成功',
      deletedKeys,
      count: deletedKeys.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[clear-cache] 清除缓存失败:', error);
    return new Response(JSON.stringify({
      error: 'Clear cache failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
