/**
 * 清除指定产品的 KV 缓存
 * 在购买、库存变更时调用
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

interface RequestBody {
  productIds: number[];
  locales?: string[];
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = getEnv(locals);
    const validation = validateEnv(env, false);

    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { productIds, locales = ['en', 'fr', 'de', 'es'] } = await request.json() as RequestBody;

    if (!productIds || productIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing productIds' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const kvCache = env?.TRANSLATION_CACHE || locals?.TRANSLATION_CACHE;

    if (!kvCache) {
      console.warn('⚠️ KV 缓存不可用，跳过清除');
      return new Response(
        JSON.stringify({ success: true, message: 'KV not available, skipped' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const deletedKeys: string[] = [];

    // 清除所有语言的产品详情缓存
    for (const productId of productIds) {
      for (const locale of locales) {
        const cacheKey = `product:${locale}:${productId}`;
        try {
          await kvCache.delete(cacheKey);
          deletedKeys.push(cacheKey);
          console.log(`🗑️ 清除产品缓存: ${cacheKey}`);
        } catch (err) {
          console.error(`❌ 清除缓存失败 ${cacheKey}:`, err);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        deletedKeys: deletedKeys,
        count: deletedKeys.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Clear product cache error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
