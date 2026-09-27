import type { APIRoute } from 'astro';
import { getProduct, getProductVariations } from '../../lib/woocommerce';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
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

    console.log('获取产品详情, ID:', productId);

    // 使用 woocommerce.ts 的 getProduct 函数
    const product = await getProduct(parseInt(productId));

    if (!product) {
      console.error('产品未找到:', productId);
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
      const variationsData = await getProductVariations(product.id);

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
    }

    return new Response(JSON.stringify(product), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('获取产品详情失败:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch product details',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
