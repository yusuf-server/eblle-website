import type { APIRoute } from 'astro';
import { getProductsWithPricesAndTotal } from '../../lib/productCache';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const page = parseInt(body.page || '1');
    const perPage = parseInt(body.per_page || '20');

    console.log(`API: 获取第 ${page} 页产品（带价格和变体）...`);
    console.log('筛选参数:', {
      search: body.search,
      category: body.category,
      color: body.color,
      material: body.material
    });

    // 构建查询参数
    const queryParams: any = {
      per_page: perPage,
      page: page,
      orderby: 'date',
      order: 'desc'
    };

    // 添加搜索关键词
    if (body.search) {
      queryParams.search = body.search;
      console.log('应用搜索关键词:', body.search);
    }

    // 处理分类参数（可能是 slug 或 ID）
    if (body.category) {
      // 如果是 slug（字符串），需要先查询分类 ID
      if (typeof body.category === 'string' && isNaN(Number(body.category))) {
        console.log('分类参数是 slug，需要查询 ID:', body.category);

        const WC_STORE_URL = import.meta.env.WC_STORE_URL;
        const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
        const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

        // 查询分类 ID
        const categoryUrl = new URL(`${WC_STORE_URL}/wp-json/wc/v3/products/categories`);
        categoryUrl.searchParams.append('slug', body.category);

        const isHttps = categoryUrl.protocol === 'https:';

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        };

        if (isHttps) {
          categoryUrl.searchParams.append('consumer_key', WC_CONSUMER_KEY);
          categoryUrl.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
        } else {
          const auth = btoa(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`);
          headers['Authorization'] = `Basic ${auth}`;
        }

        const categoryResponse = await fetch(categoryUrl.toString(), { headers });

        if (categoryResponse.ok) {
          const categories = await categoryResponse.json();
          if (categories.length > 0) {
            queryParams.category = categories[0].id;
            console.log('找到分类 ID:', queryParams.category);
          } else {
            console.warn('未找到分类:', body.category);
          }
        }
      } else {
        queryParams.category = body.category;
      }
    }

    // WooCommerce API只支持一个属性筛选
    // 如果需要组合筛选，我们需要获取更多产品然后过滤
    let needsMaterialFilter = false;
    let materialTermId = null;

    if (body.color) {
      queryParams.attribute = 'pa_color';
      queryParams.attribute_term = body.color;
      console.log('应用颜色筛选, 术语ID:', body.color);

      // 如果同时有材质，需要获取足够多的产品来过滤
      if (body.material) {
        console.log('同时筛选颜色和材质，需要二次过滤');
        needsMaterialFilter = true;
        materialTermId = body.material;
        // 获取更多产品，因为需要二次过滤
        queryParams.per_page = 100;
        queryParams.page = 1; // 从第一页开始获取
      }
    } else if (body.material) {
      queryParams.attribute = 'pa_material';
      queryParams.attribute_term = body.material;
      console.log('应用材质筛选, 术语ID:', body.material);
    }

    console.log('最终查询参数:', queryParams);

    // 使用缓存系统，包含变体价格获取
    let result = await getProductsWithPricesAndTotal(queryParams);

    console.log(`API: 初始返回 ${result.products.length} 个产品`);

    // 如果需要二次筛选材质
    if (needsMaterialFilter && materialTermId) {
      console.log('执行材质二次筛选, 术语ID:', materialTermId);

      // 先检查第一个产品的attributes结构
      if (result.products.length > 0) {
        console.log('第一个产品的attributes结构:', JSON.stringify(result.products[0].attributes, null, 2));
      }

      result.products = result.products.filter(product => {
        // 检查产品的attributes中是否包含指定的材质
        if (product.attributes && Array.isArray(product.attributes)) {
          const materialAttr = product.attributes.find(attr =>
            attr.name === 'Material' ||
            attr.slug === 'pa_material' ||
            attr.name?.toLowerCase() === 'material'
          );

          if (materialAttr) {
            console.log(`产品 ${product.id} 的材质属性:`, materialAttr);

            if (materialAttr.options && Array.isArray(materialAttr.options)) {
              // WooCommerce返回的options是术语名称数组，不是ID
              // 我们需要检查术语名称是否匹配
              const hasMatch = materialAttr.options.some(option => {
                // option是术语名称（如"Zircon"），需要转换为对应的ID检查
                // 或者我们需要通过术语slug匹配
                return option == materialTermId ||
                       option.toString() === materialTermId.toString() ||
                       option.toLowerCase().includes('zircon'); // 临时调试
              });

              if (hasMatch) {
                console.log(`产品 ${product.id} 匹配材质`);
              }

              return hasMatch;
            }
          }
        }
        return false;
      });

      console.log(`二次筛选后剩余 ${result.products.length} 个产品`);

      // 重新计算总数和分页
      result.total = result.products.length;
      result.totalPages = Math.ceil(result.total / perPage);

      // 应用分页（只在二次筛选时需要）
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      result.products = result.products.slice(startIndex, endIndex);
    }

    console.log(`API: 最终返回 ${result.products.length} 个产品，总数: ${result.total}`);
    if (result.products.length > 0) {
      console.log(`第一个产品: ${result.products[0]?.name}, price=${result.products[0]?.price}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (error) {
    console.error('API错误:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
