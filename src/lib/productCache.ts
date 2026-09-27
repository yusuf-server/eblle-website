// 产品缓存系统
import { getProducts, getProductsWithTotal, getProductVariations } from './woocommerce';

// 内存缓存
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 获取缓存
function getCache(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

// 设置缓存
function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// 批量获取产品变体（并行但带延迟，避免触发限流）
async function batchGetVariations(productIds: number[]): Promise<Map<number, any[]>> {
  const results = new Map<number, any[]>();

  // 分批处理，每批3个，避免过多并发请求
  const batchSize = 3;
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    const batchPromises = batch.map(async (id) => {
      const cacheKey = `variations-${id}`;
      const cached = getCache(cacheKey);
      if (cached) {
        return { id, variations: cached };
      }

      try {
        const variations = await getProductVariations(id, 2);
        setCache(cacheKey, variations);
        return { id, variations };
      } catch (error) {
        console.error(`获取产品 ${id} 变体失败:`, error);
        return { id, variations: [] };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ id, variations }) => {
      results.set(id, variations);
    });

    // 批次之间延迟500ms，避免触发限流
    if (i + batchSize < productIds.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

// 处理产品价格（支持变体）
export function processProductPrice(product: any, variation?: any) {
  const source = variation || product;
  return {
    price: source.price || product.price,
    regular_price: source.regular_price || product.regular_price,
    sale_price: source.sale_price || product.sale_price,
    on_sale: source.on_sale || product.on_sale,
  };
}

// 获取带价格的产品（自动处理变体）
export async function getProductsWithPrices(params: {
  per_page?: number;
  page?: number;
  category?: number;
  orderby?: string;
  order?: string;
}) {
  const cacheKey = `products-${JSON.stringify(params)}`;
  const cached = getCache(cacheKey);
  if (cached) {
    console.log('使用缓存的产品数据');
    return cached;
  }

  console.log('从API获取产品数据...');
  const products = await getProducts(params);

  // 找出所有变体产品
  const variableProductIds = products
    .filter(p => p.type === 'variable' && p.variations && p.variations.length > 0)
    .map(p => p.id);

  if (variableProductIds.length === 0) {
    // 没有变体产品，直接返回
    setCache(cacheKey, products);
    return products;
  }

  console.log(`需要获取 ${variableProductIds.length} 个产品的变体...`);
  const variationsMap = await batchGetVariations(variableProductIds);

  // 合并变体价格到产品
  const productsWithPrices = products.map(product => {
    if (product.type === 'variable' && variationsMap.has(product.id)) {
      const variations = variationsMap.get(product.id) || [];
      if (variations.length > 0) {
        const firstVariation = variations[0];
        const priceData = processProductPrice(product, firstVariation);
        return {
          ...product,
          ...priceData,
          _hasVariations: true,
          _variationCount: variations.length,
        };
      }
    }
    return product;
  });

  setCache(cacheKey, productsWithPrices);
  console.log(`成功处理 ${productsWithPrices.length} 个产品`);
  return productsWithPrices;
}

// 获取带价格的产品（带总数信息）
export async function getProductsWithPricesAndTotal(params: {
  per_page?: number;
  page?: number;
  category?: number | string;  // 支持分类 ID 或 slug
  orderby?: string;
  order?: string;
  search?: string;  // 添加搜索支持
  attribute?: string;
  attribute_term?: string;
}) {
  const cacheKey = `products-total-${JSON.stringify(params)}`;
  console.log('缓存key:', cacheKey);

  const cached = getCache(cacheKey);
  if (cached) {
    console.log('使用缓存的产品数据（带总数）');
    console.log('缓存的第一个产品ID:', cached.products[0]?.id);
    return cached;
  }

  console.log('从API获取产品数据（带总数）...');
  const { products, total, totalPages } = await getProductsWithTotal(params);
  console.log('WooCommerce返回的第一个产品ID:', products[0]?.id);

  // 找出所有变体产品
  const variableProductIds = products
    .filter(p => p.type === 'variable' && p.variations && p.variations.length > 0)
    .map(p => p.id);

  let productsWithPrices = products;

  if (variableProductIds.length > 0) {
    console.log(`需要获取 ${variableProductIds.length} 个产品的变体...`);
    const variationsMap = await batchGetVariations(variableProductIds);

    // 合并变体价格到产品
    productsWithPrices = products.map(product => {
      if (product.type === 'variable' && variationsMap.has(product.id)) {
        const variations = variationsMap.get(product.id) || [];
        if (variations.length > 0) {
          const firstVariation = variations[0];
          const priceData = processProductPrice(product, firstVariation);
          return {
            ...product,
            ...priceData,
            _hasVariations: true,
            _variationCount: variations.length,
          };
        }
      }
      return product;
    });
  }

  const result = {
    products: productsWithPrices,
    total,
    totalPages
  };

  setCache(cacheKey, result);
  console.log(`成功处理 ${productsWithPrices.length} 个产品，总数: ${total}，总页数: ${totalPages}`);
  return result;
}

// 清除缓存（可用于调试或强制刷新）
export function clearCache(pattern?: string) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}
