import type { APIRoute } from 'astro';
import { getProducts, getFirstProductVariation } from '../../lib/woocommerce';
import { processProductPrice } from '../../lib/productCache';
import { translateProducts } from '../../lib/i18n/product-translator';
import type { SupportedLocale } from '../../lib/i18n/utils';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const locale = (url.searchParams.get('locale') || 'en') as SupportedLocale;

    // 获取产品基本信息
    const products = await getProducts({
      per_page: 10,
      category: 942,
      orderby: 'date',
      order: 'desc'
    });

    // 找出变体产品并获取第一个变体
    const variableProducts = products.filter(
      p => p.type === 'variable' && p.variations && p.variations.length > 0
    );

    if (variableProducts.length > 0) {
      // 并行获取第一个变体
      const variationPromises = variableProducts.map(async (product) => {
        const variation = await getFirstProductVariation(product.id);
        return { productId: product.id, variation };
      });

      const variationResults = await Promise.all(variationPromises);
      const variationsMap = new Map(
        variationResults.map(r => [r.productId, r.variation])
      );

      // 合并价格信息
      const productsWithPrices = products.map(product => {
        if (product.type === 'variable' && variationsMap.has(product.id)) {
          const variation = variationsMap.get(product.id);
          if (variation) {
            const priceData = processProductPrice(product, variation);
            return { ...product, ...priceData };
          }
        }
        return product;
      });

      // 如果需要翻译
      if (locale !== 'en') {
        const translatedProducts = await translateProducts(productsWithPrices, locale, locals);
        return new Response(JSON.stringify(translatedProducts), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(productsWithPrices), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 没有变体产品，直接返回
    if (locale !== 'en') {
      const translatedProducts = await translateProducts(products, locale, locals);
      return new Response(JSON.stringify(translatedProducts), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(products), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Flash Sale API 错误:', error);
    return new Response(JSON.stringify({ error: 'Failed to load products' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
