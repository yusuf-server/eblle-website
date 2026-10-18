/**
 * 产品数据翻译服务 - 优化版
 * 使用 Cloudflare Workers AI + KV 缓存
 */

import type { SupportedLocale } from './utils';
import { translate, translateBatch } from './translator';
import { getCacheFromContext } from './cache';

/**
 * 去除 HTML 标签
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * 翻译产品对象
 */
export async function translateProduct(
  product: any,
  targetLang: SupportedLocale,
  context: any
): Promise<any> {
  if (targetLang === 'en' || !product) {
    return product;
  }

  const cache = getCacheFromContext(context);
  const config = {
    engine: 'cloudflare-ai' as const,
    cache,
    cachePrefix: 'product'
  };

  try {
    // 收集所有需要翻译的文本
    const textsToTranslate: string[] = [];
    const textKeys: string[] = [];

    // 产品名称
    if (product.name) {
      textKeys.push('name');
      textsToTranslate.push(product.name);
    }

    // 产品描述
    if (product.description) {
      textKeys.push('description');
      textsToTranslate.push(stripHtml(product.description));
    }

    // 简短描述
    if (product.short_description) {
      textKeys.push('short_description');
      textsToTranslate.push(stripHtml(product.short_description));
    }

    // 批量翻译所有文本
    if (textsToTranslate.length > 0) {
      const translatedTexts = await translateBatch(
        textsToTranslate,
        targetLang,
        config,
        context
      );

      // 将翻译结果映射回产品对象
      textKeys.forEach((key, index) => {
        if (translatedTexts[index]) {
          product[key] = translatedTexts[index];
        }
      });
    }

    // 翻译分类名称
    if (product.categories && product.categories.length > 0) {
      const categoryNames = product.categories.map((cat: any) => cat.name);
      const translatedCategories = await translateBatch(
        categoryNames,
        targetLang,
        config,
        context
      );

      product.categories.forEach((cat: any, index: number) => {
        if (translatedCategories[index]) {
          cat.name = translatedCategories[index];
        }
      });
    }

    // 翻译标签名称
    if (product.tags && product.tags.length > 0) {
      const tagNames = product.tags.map((tag: any) => tag.name);
      const translatedTags = await translateBatch(
        tagNames,
        targetLang,
        config,
        context
      );

      product.tags.forEach((tag: any, index: number) => {
        if (translatedTags[index]) {
          tag.name = translatedTags[index];
        }
      });
    }

    // 翻译属性名称和选项
    if (product.attributes && product.attributes.length > 0) {
      for (const attr of product.attributes) {
        // 翻译属性名称
        if (attr.name) {
          attr.name = await translate(attr.name, targetLang, config, context);
        }

        // 翻译属性选项
        if (attr.options && attr.options.length > 0) {
          const translatedOptions = await translateBatch(
            attr.options,
            targetLang,
            config,
            context
          );
          attr.options = translatedOptions.filter(Boolean);
        }
      }
    }

    return product;
  } catch (error) {
    console.error('[translateProduct] 翻译失败:', error);
    return product; // 返回原产品
  }
}

/**
 * 翻译产品变体
 */
export async function translateVariation(
  variation: any,
  targetLang: SupportedLocale,
  context: any
): Promise<any> {
  if (targetLang === 'en' || !variation) {
    return variation;
  }

  const cache = getCacheFromContext(context);
  const config = {
    engine: 'cloudflare-ai' as const,
    cache,
    cachePrefix: 'variation'
  };

  try {
    // 翻译变体描述
    if (variation.description) {
      variation.description = await translate(
        stripHtml(variation.description),
        targetLang,
        config,
        context
      );
    }

    // 翻译属性值
    if (variation.attributes && variation.attributes.length > 0) {
      for (const attr of variation.attributes) {
        if (attr.option) {
          attr.option = await translate(attr.option, targetLang, config, context);
        }
      }
    }

    return variation;
  } catch (error) {
    console.error('[translateVariation] 翻译失败:', error);
    return variation;
  }
}

/**
 * 批量翻译产品数组
 */
export async function translateProducts(
  products: any[],
  targetLang: SupportedLocale,
  context: any
): Promise<any[]> {
  if (targetLang === 'en' || !products || products.length === 0) {
    return products;
  }

  console.log(`[translateProducts] 开始翻译 ${products.length} 个产品到 [${targetLang}]`);

  try {
    // 并行翻译所有产品
    const translatedProducts = await Promise.all(
      products.map(product => translateProduct(product, targetLang, context))
    );

    console.log(`[translateProducts] 完成翻译 ${translatedProducts.length} 个产品`);
    return translatedProducts;
  } catch (error) {
    console.error('[translateProducts] 批量翻译失败:', error);
    return products;
  }
}
