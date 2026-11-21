import type { APIRoute } from 'astro';
import { getProductsWithPricesAndTotal } from '../../lib/productCache';

export const prerender = false;

// 材质与颜色 Term ID ↔ 名称关键词映射（与 filters.ts 完全同步）
const MATERIAL_TERM_MAP: Record<string, string[]> = {
  '97': ['316l stainless steel', '316l'],
  '866': ['stainless steel'],
  '100': ['zircon', 'cubic zirconia', 'cz'],
  '671': ['rope'],
  '109': ['natural stone', 'stone'],
  '105': ['acrylic'],
  '110': ['nylon'],
  '106': ['gemstone'],
  '101': ['shell'],
  '637': ['imitation pearl', 'imitaion pearl'],
  '98': ['pearl']
};

const COLOR_TERM_MAP: Record<string, string[]> = {
  '474': ['gold', '18k gold', 'yellow gold'],
  '23': ['silver', 'steel', 'white gold']
};

function matchesAttributeTerms(product: any, attrKeys: string[], termIds: string[], termMap: Record<string, string[]>): boolean {
  if (!termIds || termIds.length === 0) return true;
  if (!product.attributes || !Array.isArray(product.attributes)) return false;

  const targetAttr = product.attributes.find((attr: any) => {
    const slug = (attr.slug || '').toLowerCase();
    const name = (attr.name || '').toLowerCase();
    return attrKeys.some(k => slug === k || name === k || slug.includes(k) || name.includes(k));
  });

  if (!targetAttr || !Array.isArray(targetAttr.options)) return false;

  const productOptionsLower = targetAttr.options.map((o: any) => String(o).toLowerCase().trim());

  // 同维度多选（如同时勾了 Gold 和 Silver，或同时勾了 Zircon 和 Pearl）取并集 OR
  return termIds.some((tid) => {
    const cleanTid = String(tid).trim().toLowerCase();
    const keywords = termMap[cleanTid] || [cleanTid.replace(/-/g, ' ')];
    return productOptionsLower.some((opt) =>
      keywords.some((kw) => {
        // 避免 "stainless steel" 误匹配 "316l stainless steel"（除非搜索的就是 stainless steel）
        if (cleanTid === '866') {
          return opt === 'stainless steel' || (opt.includes('stainless steel') && !opt.includes('316l'));
        }
        return opt === kw || opt.includes(kw);
      })
    );
  });
}

async function resolveCategoryIds(rawCategoryParam: string): Promise<string> {
  const parts = String(rawCategoryParam)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return '';

  const numericIds: string[] = [];
  const slugsToResolve: string[] = [];

  parts.forEach((part) => {
    if (/^\d+$/.test(part)) {
      numericIds.push(part);
    } else {
      slugsToResolve.push(part.toLowerCase());
    }
  });

  if (slugsToResolve.length > 0) {
    const WC_STORE_URL = (import.meta.env.WC_STORE_URL || '').replace(/\/$/, '');
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY || '';
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET || '';

    if (WC_STORE_URL && WC_CONSUMER_KEY && WC_CONSUMER_SECRET) {
      const authString = `${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`;
      const base64Auth = typeof Buffer !== 'undefined'
        ? Buffer.from(authString).toString('base64')
        : btoa(authString);

      const headers: Record<string, string> = {
        'Authorization': `Basic ${base64Auth}`,
        'Accept': 'application/json',
        'User-Agent': 'curl/7.88.1'
      };

      const resolved = await Promise.all(
        slugsToResolve.map(async (slug) => {
          try {
            const url = new URL(`${WC_STORE_URL}/wp-json/wc/v3/products/categories`);
            url.searchParams.append('slug', slug);
            const res = await fetch(url.toString(), { method: 'GET', headers });
            if (res.ok) {
              const cats = await res.json();
              if (Array.isArray(cats) && cats.length > 0 && cats[0].id) {
                return String(cats[0].id);
              }
            }
          } catch (e) {}
          return null;
        })
      );

      resolved.forEach((id) => {
        if (id) numericIds.push(id);
      });
    }
  }

  return Array.from(new Set(numericIds)).join(',');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const page = Math.max(1, parseInt(body.page || '1', 10));
    const perPage = Math.max(1, parseInt(body.per_page || '20', 10));
    const forceRefresh = request.headers.get('X-Force-Refresh') === 'true';

    const queryParams: any = {
      per_page: perPage,
      page: page,
      orderby: 'date',
      order: 'desc'
    };

    if (body.search) {
      queryParams.search = String(body.search).trim();
    }

    // 1. 解析并支持多个分类 ID 逗号组合查询
    if (body.category) {
      const resolvedCatIds = await resolveCategoryIds(String(body.category));
      if (resolvedCatIds) {
        queryParams.category = resolvedCatIds;
      } else {
        // 指定了不存在的分类时直接返回空结果，防止回退成全站所有产品
        return new Response(JSON.stringify({ products: [], total: 0, totalPages: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
      }
    }

    const colorIds = body.color
      ? String(body.color).split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const materialIds = body.material
      ? String(body.material).split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const hasColor = colorIds.length > 0;
    const hasMaterial = materialIds.length > 0;
    const needsSecondaryFilter = (hasColor && hasMaterial) || colorIds.length > 1 || materialIds.length > 1;

    if (hasColor && !needsSecondaryFilter) {
      queryParams.attribute = 'pa_color';
      queryParams.attribute_term = colorIds[0];
    } else if (hasMaterial && !needsSecondaryFilter) {
      queryParams.attribute = 'pa_material';
      queryParams.attribute_term = materialIds[0];
    } else if (needsSecondaryFilter) {
      // 多维度交集或同维度多选：先利用主属性缩小候选集，再在内存中做严格交集与分页
      if (hasColor) {
        queryParams.attribute = 'pa_color';
        queryParams.attribute_term = colorIds.join(',');
      } else if (hasMaterial) {
        queryParams.attribute = 'pa_material';
        queryParams.attribute_term = materialIds.join(',');
      }
      queryParams.per_page = 100;
      queryParams.page = 1;
    }

    let result = await getProductsWithPricesAndTotal(queryParams, forceRefresh);

    // 若需要二次跨维度 AND 交集过滤（分类 AND 颜色 AND 材质）
    if (needsSecondaryFilter && Array.isArray(result.products)) {
      let filtered = result.products;

      if (hasColor) {
        filtered = filtered.filter((p: any) =>
          matchesAttributeTerms(p, ['pa_color', 'color', 'colour'], colorIds, COLOR_TERM_MAP)
        );
      }

      if (hasMaterial) {
        filtered = filtered.filter((p: any) =>
          matchesAttributeTerms(p, ['pa_material', 'material'], materialIds, MATERIAL_TERM_MAP)
        );
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / perPage);
      const startIndex = (page - 1) * perPage;

      result = {
        products: filtered.slice(startIndex, startIndex + perPage),
        total,
        totalPages
      };
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
      headers: { 'Content-Type': 'application/json' }
    });
  }
};