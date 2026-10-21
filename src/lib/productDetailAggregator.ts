/**
 * 产品详情页数据聚合器 - 优化版
 * 使用 Cloudflare KV 缓存完整的翻译后产品数据
 */

import type { SupportedLocale } from './i18n/utils';
import { translateProduct, translateVariation } from './i18n/product-translator';
import { env } from 'cloudflare:workers';

export interface ProductDetailData {
  product: any;
  variations: any[];
  relatedProducts: any[];
}

/**
 * 生成产品详情页缓存键
 */
function getProductCacheKey(productId: number, locale: SupportedLocale): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `product-detail:${productId}:${locale}:${date}:v1`;
}

/**
 * 获取优化的产品详情页数据（带 KV 缓存）
 */
export async function getOptimizedProductDetail(
  productId: number,
  product: any,
  variations: any[],
  relatedProducts: any[],
  locale: SupportedLocale,
  locals: any
): Promise<ProductDetailData> {
  // 英语直接返回原始数据
  if (locale === 'en') {
    return { product, variations, relatedProducts };
  }

  const cacheKey = getProductCacheKey(productId, locale);
  const kvCache = env?.TRANSLATION_CACHE || locals?.TRANSLATION_CACHE;

  console.log(`[ProductDetail] KV 状态: ${kvCache ? '✓ 可用' : '✗ 不可用'}`);

  // 1. 尝试从 KV 缓存读取
  if (kvCache) {
    try {
      const cachedData = await kvCache.get(cacheKey, 'json');
      if (cachedData) {
        console.log(`✓ 产品详情 KV 缓存命中 [${locale}] [ID: ${productId}] - 毫秒级返回`);
        return cachedData as ProductDetailData;
      }
    } catch (error) {
      console.warn('[ProductDetail] KV 缓存读取失败:', error);
    }
  }

  console.log(`→ 产品详情 KV 缓存未命中 [${locale}] [ID: ${productId}] - 开始翻译...`);

  // 2. 翻译数据
  const startTime = Date.now();

  const [translatedProduct, translatedVariations, translatedRelatedProducts] = await Promise.all([
    translateProduct(product, locale, locals),
    Promise.all(variations.map(v => translateVariation(v, locale, locals))),
    Promise.all(relatedProducts.map(p => translateProduct(p, locale, locals)))
  ]);

  const data: ProductDetailData = {
    product: translatedProduct,
    variations: translatedVariations,
    relatedProducts: translatedRelatedProducts
  };

  console.log(`✓ 产品翻译完成，耗时: ${Date.now() - startTime}ms`);

  // 3. 写入 KV 缓存
  if (kvCache) {
    try {
      await kvCache.put(cacheKey, JSON.stringify(data), { expirationTtl: 24 * 60 * 60 }); // 24小时
      console.log(`✓ 产品详情 [${locale}] [ID: ${productId}] 缓存写入成功 [TTL: 24h]`);
    } catch (error) {
      console.warn('[ProductDetail] KV 缓存写入失败:', error);
    }
  }

  return data;
}
