import type { APIRoute } from 'astro';

export const prerender = false;

// WooCommerce API 辅助函数
async function wcRequest(endpoint: string, params: Record<string, any> = {}) {
  const WC_STORE_URL = import.meta.env.WC_STORE_URL;
  const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
  const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

  const url = new URL(`${WC_STORE_URL}/wp-json/wc/v3/${endpoint}`);

  // 判断是否为 HTTPS
  const isHttps = url.protocol === 'https:';

  if (isHttps) {
    // HTTPS: 使用 URL 参数（Cloudflare 兼容）
    url.searchParams.append('consumer_key', WC_CONSUMER_KEY);
    url.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
  }

  // 添加查询参数
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key].toString());
    }
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9'
  };

  // HTTP: 使用 Basic Auth
  if (!isHttps) {
    const auth = btoa(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`);
    headers['Authorization'] = `Basic ${auth}`;
  }

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    throw new Error(`WooCommerce API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export const GET: APIRoute = async () => {
  try {
    console.log('正在获取筛选数据...');

    // 获取所有产品分类
    const allCategories = await wcRequest('products/categories', {
      per_page: 100,
      hide_empty: true
    });

    // 根据要求组织分类数据
    const allJewelrySlugs = [
      'chain-type', 'key-chain', 'body-chains', 'jewelry-set', 'necklace',
      'two-tones-jewelry', 'diy-jewelry-accessories', 'hair-clip',
      'waterproof-coastal-series', 'heart-collection', 'evil-eye'
    ];

    const newArrivalsSlugs = ['new-arrivals'];

    // 筛选"ALL JEWELRY"分类
    const allJewelryCategories = allCategories.filter(cat =>
      allJewelrySlugs.includes(cat.slug)
    ).map(cat => ({
      id: cat.id,
      name: cat.name.toUpperCase(), // 转为大写
      slug: cat.slug,
      parent: cat.parent,
      count: cat.count
    }));

    // 筛选"NEW ARRIVALS"分类
    const newArrivalsCategories = allCategories.filter(cat =>
      newArrivalsSlugs.includes(cat.slug)
    ).map(cat => ({
      id: cat.id,
      name: cat.name.toUpperCase(), // 转为大写
      slug: cat.slug,
      parent: cat.parent,
      count: cat.count
    }));

    // 获取子分类
    const getAllChildCategories = (parentId: number) => {
      return allCategories
        .filter(cat => cat.parent === parentId)
        .map(cat => ({
          id: cat.id,
          name: cat.name.toUpperCase(), // 转为大写
          slug: cat.slug,
          parent: cat.parent,
          count: cat.count
        }));
    };

    // 为每个分类添加子分类
    const allJewelryWithChildren = allJewelryCategories.map(cat => ({
      ...cat,
      children: getAllChildCategories(cat.id)
    }));

    const newArrivalsWithChildren = newArrivalsCategories.map(cat => ({
      ...cat,
      children: getAllChildCategories(cat.id)
    }));

    // 颜色和材质筛选（这些通常是属性）
    // 查询产品属性，确定如何存储
    let colorAttributeInfo = null;
    let materialAttributeInfo = null;

    try {
      // 获取产品属性列表
      const attributesResponse = await api.get('products/attributes');
      console.log('===== 产品属性列表 =====');
      console.log('总共', attributesResponse.data.length, '个属性');
      attributesResponse.data.forEach(attr => {
        console.log(`- ID: ${attr.id}, Name: ${attr.name}, Slug: ${attr.slug}`);
      });

      // 查找颜色属性
      const colorAttr = attributesResponse.data.find(attr =>
        attr.slug.toLowerCase().includes('color') ||
        attr.slug.toLowerCase().includes('colour') ||
        attr.name.toLowerCase().includes('color') ||
        attr.name.toLowerCase().includes('colour')
      );

      // 查找材质属性
      const materialAttr = attributesResponse.data.find(attr =>
        attr.slug.toLowerCase().includes('material') ||
        attr.name.toLowerCase().includes('material')
      );

      if (colorAttr) {
        console.log('===== 找到颜色属性 =====');
        console.log('ID:', colorAttr.id);
        console.log('Name:', colorAttr.name);
        console.log('Slug:', colorAttr.slug);

        // 获取颜色的所有术语
        const colorTermsResponse = await api.get(`products/attributes/${colorAttr.id}/terms`, { per_page: 100 });
        console.log('颜色的所有术语:');
        colorTermsResponse.data.forEach(term => {
          console.log(`  - ID: ${term.id}, Name: ${term.name}, Slug: ${term.slug}`);
        });

        colorAttributeInfo = {
          id: colorAttr.id,
          slug: colorAttr.slug,
          terms: colorTermsResponse.data
        };
      } else {
        console.log('未找到颜色属性');
      }

      if (materialAttr) {
        console.log('===== 找到材质属性 =====');
        console.log('ID:', materialAttr.id);
        console.log('Name:', materialAttr.name);
        console.log('Slug:', materialAttr.slug);

        // 获取材质的所有术语
        const materialTermsResponse = await api.get(`products/attributes/${materialAttr.id}/terms`, { per_page: 100 });
        console.log('材质的所有术语:');
        materialTermsResponse.data.forEach(term => {
          console.log(`  - ID: ${term.id}, Name: ${term.name}, Slug: ${term.slug}`);
        });

        materialAttributeInfo = {
          id: materialAttr.id,
          slug: materialAttr.slug,
          terms: materialTermsResponse.data
        };
      } else {
        console.log('未找到材质属性');
      }
    } catch (attrError) {
      console.error('获取产品属性失败:', attrError);
    }

    // 固定的颜色列表（只有gold和silver）
    // 根据WooCommerce后台，silver的ID是23，gold的ID是474
    const colors = [
      {
        id: 474,
        slug: 'gold',
        name: 'Gold',
        hex: '#FFD700',
        attributeSlug: colorAttributeInfo?.slug
      },
      {
        id: 23,
        slug: 'silver',
        name: 'Silver',
        hex: '#C0C0C0',
        attributeSlug: colorAttributeInfo?.slug
      }
    ];

    // 固定的材质列表
    // 根据之前查询的结果，使用实际的术语ID
    const materials = [
      { id: 97, slug: '316l-stainless-steel', name: '316L STAINLESS STEEL', attributeSlug: materialAttributeInfo?.slug },
      { id: 866, slug: 'stainless-steel', name: 'STAINLESS STEEL', attributeSlug: materialAttributeInfo?.slug },
      { id: 100, slug: 'zircon', name: 'ZIRCON', attributeSlug: materialAttributeInfo?.slug },
      { id: 671, slug: 'rope', name: 'ROPE', attributeSlug: materialAttributeInfo?.slug },
      { id: 109, slug: 'natural-stone', name: 'NATURAL STONE', attributeSlug: materialAttributeInfo?.slug },
      { id: 105, slug: 'acrylic', name: 'ACRYLIC', attributeSlug: materialAttributeInfo?.slug },
      { id: 110, slug: 'nylon', name: 'NYLON', attributeSlug: materialAttributeInfo?.slug },
      { id: 106, slug: 'gemstone', name: 'GEMSTONE', attributeSlug: materialAttributeInfo?.slug },
      { id: 101, slug: 'shell', name: 'SHELL', attributeSlug: materialAttributeInfo?.slug },
      { id: 637, slug: 'imitaion-pearl', name: 'IMITATION PEARL', attributeSlug: materialAttributeInfo?.slug },
      { id: 98, slug: 'pearl', name: 'PEARL', attributeSlug: materialAttributeInfo?.slug }
    ];

    const result = {
      allJewelry: allJewelryWithChildren,
      newArrivals: newArrivalsWithChildren,
      colors,
      materials
    };

    console.log('筛选数据获取成功');

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800' // 缓存30分钟
      }
    });
  } catch (error) {
    console.error('获取筛选数据失败:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch filters' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
