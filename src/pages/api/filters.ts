import type { APIRoute } from 'astro';
import { wcRequest } from '../../lib/woocommerce';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';

  // 使用 Cloudflare Cache API 作为边缘缓存（不占用 WordPress 服务器任何 CPU/带宽）
  const cache = (caches as any)?.default;
  const cacheKey = new Request(`${url.origin}/api/filters`, { method: 'GET' });

  if (cache && !forceRefresh) {
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  try {
    // 1. 分页拉取全量 WooCommerce 商品分类（避免超过 100 个分类时被截断）
    let allCategories: any[] = [];
    let page = 1;
    while (page <= 5) {
      const { data: batch } = await wcRequest('products/categories', {
        per_page: 100,
        page,
        hide_empty: false
      });
      if (!Array.isArray(batch) || batch.length === 0) break;
      allCategories.push(...batch);
      if (batch.length < 100) break;
      page++;
    }

    const allJewelrySlugs = [
      'chain-type', 'key-chain', 'body-chains', 'jewelry-set', 'necklace',
      'two-tones-jewelry', 'diy-jewelry-accessories', 'hair-clip',
      'waterproof-coastal-series', 'heart-collection', 'evil-eye'
    ];

    const newArrivalsSlugs = ['new-arrivals'];

    const allJewelryCategories = allCategories
      .filter((cat: any) => allJewelrySlugs.includes(cat.slug))
      .map((cat: any) => ({
        id: cat.id,
        name: cat.name.toUpperCase(),
        slug: cat.slug,
        parent: cat.parent,
        count: cat.count
      }));

    const newArrivalsCategories = allCategories
      .filter((cat: any) => newArrivalsSlugs.includes(cat.slug))
      .map((cat: any) => ({
        id: cat.id,
        name: cat.name.toUpperCase(),
        slug: cat.slug,
        parent: cat.parent,
        count: cat.count
      }));

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
      const { data: attributes } = await wcRequest('products/attributes');

      const colorAttr = attributes.find((attr: any) =>
        attr.slug?.toLowerCase().includes('color') ||
        attr.slug?.toLowerCase().includes('colour') ||
        attr.name?.toLowerCase().includes('color') ||
        attr.name?.toLowerCase().includes('colour')
      );

      const materialAttr = attributes.find((attr: any) =>
        attr.slug?.toLowerCase().includes('material') ||
        attr.name?.toLowerCase().includes('material')
      );

      if (colorAttr) {
        const { data: colorTerms } = await wcRequest(`products/attributes/${colorAttr.id}/terms`, { per_page: 100 });
        colorAttributeInfo = {
          id: colorAttr.id,
          slug: colorAttr.slug,
          terms: colorTerms
        };
      }

      if (materialAttr) {
        const { data: materialTerms } = await wcRequest(`products/attributes/${materialAttr.id}/terms`, { per_page: 100 });
        materialAttributeInfo = {
          id: materialAttr.id,
          slug: materialAttr.slug,
          terms: materialTerms
        };
      }
    } catch (attrError) {
      console.error('获取产品属性失败:', attrError);
    }

    const colors = [
      { id: 474, slug: 'gold', name: 'Gold', hex: '#FFD700', attributeSlug: colorAttributeInfo?.slug },
      { id: 23, slug: 'silver', name: 'Silver', hex: '#C0C0C0', attributeSlug: colorAttributeInfo?.slug }
    ];

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

    const response = new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // 浏览器缓存 5 分钟，Cloudflare 边缘缓存 30 分钟
        'Cache-Control': 'public, max-age=300, s-maxage=1800'
      }
    });

    // 写入/覆盖 Cloudflare 边缘缓存
    if (cache) {
      await cache.put(cacheKey, response.clone());
    }

    return response;
  } catch (error: any) {
    console.error('获取筛选数据失败:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch filters',
      message: error?.message || String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};