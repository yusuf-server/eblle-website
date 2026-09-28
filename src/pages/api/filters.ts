import type { APIRoute } from 'astro';

export const prerender = false;

// WooCommerce API 辅助函数
async function wcRequest(endpoint: string, params: Record<string, any> = {}) {
  const WC_STORE_URL = (import.meta.env.WC_STORE_URL || '').replace(/\/$/, '');
  const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
  const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

  if (!WC_STORE_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    throw new Error('缺少 WooCommerce 必要的环境变量配置 (WC_STORE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET)');
  }

  const url = new URL(`${WC_STORE_URL}/wp-json/wc/v3/${endpoint}`);

  // 添加业务查询参数（不暴露任何密钥）
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined && params[key] !== null) {
      url.searchParams.append(key, params[key].toString());
    }
  });

  // 跨环境 Base64 编码
const authString = `${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`;
const base64Auth = typeof Buffer !== 'undefined'
  ? Buffer.from(authString).toString('base64')
  : btoa(authString);

// 保持最纯粹的请求头，不要加 Cache-Control, Pragma, Origin, Referer, Accept-Language 等任何多余项
const headers: Record<string, string> = {
  'Authorization': `Basic ${base64Auth}`,
  'Accept': 'application/json',
  'User-Agent': 'curl/7.88.1' // 直接伪装成 curl 的 User-Agent
};

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[Filters WooCommerce Error] Status: ${response.status} ${response.statusText}`);
    console.error(`[Filters WooCommerce Error Body]: ${errorBody.slice(0, 300)}`);
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
    const allJewelryCategories = allCategories.filter((cat: any) =>
      allJewelrySlugs.includes(cat.slug)
    ).map((cat: any) => ({
      id: cat.id,
      name: cat.name.toUpperCase(),
      slug: cat.slug,
      parent: cat.parent,
      count: cat.count
    }));

    // 筛选"NEW ARRIVALS"分类
    const newArrivalsCategories = allCategories.filter((cat: any) =>
      newArrivalsSlugs.includes(cat.slug)
    ).map((cat: any) => ({
      id: cat.id,
      name: cat.name.toUpperCase(),
      slug: cat.slug,
      parent: cat.parent,
      count: cat.count
    }));

    // 获取子分类
    const getAllChildCategories = (parentId: number) => {
      return allCategories
        .filter((cat: any) => cat.parent === parentId)
        .map((cat: any) => ({
          id: cat.id,
          name: cat.name.toUpperCase(),
          slug: cat.slug,
          parent: cat.parent,
          count: cat.count
        }));
    };

    // 为每个分类添加子分类
    const allJewelryWithChildren = allJewelryCategories.map((cat: any) => ({
      ...cat,
      children: getAllChildCategories(cat.id)
    }));

    const newArrivalsWithChildren = newArrivalsCategories.map((cat: any) => ({
      ...cat,
      children: getAllChildCategories(cat.id)
    }));

    // 颜色和材质筛选属性查询
    let colorAttributeInfo = null;
    let materialAttributeInfo = null;

    try {
      // 统一使用 wcRequest 代替未定义的 api 变量
      const attributes = await wcRequest('products/attributes');
      console.log('===== 产品属性列表 =====');
      console.log('总共', attributes.length, '个属性');

      // 查找颜色属性
      const colorAttr = attributes.find((attr: any) =>
        attr.slug?.toLowerCase().includes('color') ||
        attr.slug?.toLowerCase().includes('colour') ||
        attr.name?.toLowerCase().includes('color') ||
        attr.name?.toLowerCase().includes('colour')
      );

      // 查找材质属性
      const materialAttr = attributes.find((attr: any) =>
        attr.slug?.toLowerCase().includes('material') ||
        attr.name?.toLowerCase().includes('material')
      );

      if (colorAttr) {
        const colorTerms = await wcRequest(`products/attributes/${colorAttr.id}/terms`, { per_page: 100 });
        colorAttributeInfo = {
          id: colorAttr.id,
          slug: colorAttr.slug,
          terms: colorTerms
        };
      }

      if (materialAttr) {
        const materialTerms = await wcRequest(`products/attributes/${materialAttr.id}/terms`, { per_page: 100 });
        materialAttributeInfo = {
          id: materialAttr.id,
          slug: materialAttr.slug,
          terms: materialTerms
        };
      }
    } catch (attrError) {
      console.error('获取产品属性失败:', attrError);
    }

    // 固定的颜色列表
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
        'Cache-Control': 'public, max-age=1800'
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