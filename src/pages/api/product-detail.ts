import type { APIRoute } from 'astro';
import { getProduct, getProductVariations } from '../../lib/woocommerce';

export const prerender = false;

/**
 * 带超时的 Promise 包装器
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
}

export const GET: APIRoute = async ({ request, url }) => {
  const startTime = Date.now();

  try {
    console.log('完整请求URL:', request.url);
    const productId = url.searchParams.get('id');

    console.log('收到请求，产品ID:', productId);

    if (!productId) {
      console.error('缺少产品ID');
      return new Response(JSON.stringify({ error: 'Product ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证产品ID格式
    const productIdNum = parseInt(productId);
    if (isNaN(productIdNum) || productIdNum <= 0) {
      console.error('无效的产品ID:', productId);
      return new Response(JSON.stringify({ error: 'Invalid product ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('获取产品详情, ID:', productId);

    // 添加 3 秒超时控制
    const product = await withTimeout(
      getProduct(productIdNum),
      3000
    );

    if (!product) {
      const elapsed = Date.now() - startTime;
      console.error(`[${elapsed}ms] 产品未找到: ${productId}`);
      return new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('产品详情获取成功:', product.name, '类型:', product.type);
    console.log('产品属性 (attributes):', JSON.stringify(product.attributes, null, 2));
    console.log('变体 IDs (variations):', product.variations);

    // 如果是变体产品，获取变体详情
    if (product.type === 'variable' && product.variations && product.variations.length > 0) {
      console.log('变体产品，获取变体详情...');

      try {
        // 变体获取也添加 3 秒超时
        const variationsData = await withTimeout(
          getProductVariations(product.id),
          3000
        );

        if (variationsData && variationsData.length > 0) {
          // 将变体数据添加到产品对象中
          (product as any).variationsData = variationsData;
          console.log(`获取到 ${variationsData.length} 个变体`);
          console.log('第一个变体示例:', JSON.stringify(variationsData[0], null, 2));

          // 确保 attributes 有正确的格式和选项
          // 从变体数据中提取所有唯一的属性值
          if (product.attributes && product.attributes.length > 0) {
            product.attributes.forEach((attr: any) => {
              // 如果属性标记为 variation，从变体中提取所有可能的选项
              if (attr.variation) {
                const uniqueOptions = new Set<string>();

                variationsData.forEach((variation: any) => {
                  if (variation.attributes && Array.isArray(variation.attributes)) {
                    const matchingAttr = variation.attributes.find((va: any) =>
                      va.name === attr.name || va.slug === attr.slug
                    );
                    if (matchingAttr && matchingAttr.option) {
                      uniqueOptions.add(matchingAttr.option);
                    }
                  }
                });

                // 将提取的选项设置到主产品属性中
                if (uniqueOptions.size > 0) {
                  attr.options = Array.from(uniqueOptions);
                  console.log(`属性 ${attr.name} 的选项:`, attr.options);
                }
              }
            });
          }
        }
      } catch (variationError: any) {
        // 变体获取失败不影响主产品返回
        console.warn(`获取变体失败（产品 ${productId}）:`, variationError.message);
        // 继续返回基础产品信息
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[${elapsed}ms] 产品详情返回成功: ${product.name}`);

    return new Response(JSON.stringify(product), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    const elapsed = Date.now() - startTime;

    if (error.message === 'Request timeout') {
      console.error(`[${elapsed}ms] 产品详情请求超时 (产品 ${url.searchParams.get('id')})`);
      return new Response(JSON.stringify({
        error: 'Request timeout',
        message: 'Product request took too long (>3s)'
      }), {
        status: 504,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error(`[${elapsed}ms] 获取产品详情失败:`, error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch product details',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
