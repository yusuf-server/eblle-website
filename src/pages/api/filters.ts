import type { APIRoute } from 'astro';
import { wcRequest } from '../../lib/woocommerce';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  try {
    console.log('正在获取筛选数据...');

    // 传入 context.locals，兼容 Cloudflare Pages SSR 运行时读取环境变量
    const { data: allCategories } = await wcRequest('products/categories', {
      per_page: 100,
      hide_empty: true
    }, context.locals);

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
      const { data: attributes } = await wcRequest('products/attributes', {}, context.locals);

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
        const { data: colorTerms } = await wcRequest(`products/attributes/${colorAttr.id}/terms`, { per_page: 100 }, context.locals);
        colorAttributeInfo = {
          id: colorAttr.id,
          slug: colorAttr.slug,
          terms: colorTerms
        };
      }

      if (materialAttr) {
        const { data: materialTerms } = await wcRequest(`products/attributes/${materialAttr.id}/terms`, { per_page: 100 }, context.locals);
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