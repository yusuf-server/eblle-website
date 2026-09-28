/**
 * 智能搜索 API
 *
 * 功能：
 * 1. 搜索商品（名称、描述、SKU）
 * 2. 搜索相关分类
 * 3. 防抖优化
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '8');

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({
          products: [],
          categories: [],
          total: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const WC_STORE_URL = import.meta.env.WC_STORE_URL;
    const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    // 1. 搜索商品
    const productsUrl = new URL(`${WC_STORE_URL}/wp-json/wc/v3/products`);
    productsUrl.searchParams.append('consumer_key', WC_CONSUMER_KEY);
    productsUrl.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
    productsUrl.searchParams.append('search', query);
    productsUrl.searchParams.append('per_page', limit.toString());
    productsUrl.searchParams.append('status', 'publish');
    productsUrl.searchParams.append('stock_status', 'instock');

    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    const productsResponse = await fetch(productsUrl.toString(), { headers });

    let products = [];
    let totalProducts = 0;

    if (productsResponse.ok) {
      products = await productsResponse.json();
      totalProducts = parseInt(productsResponse.headers.get('x-wp-total') || '0');
    }

    // 2. 搜索相关分类（根据搜索词匹配分类名称）
    const categoriesUrl = new URL(`${WC_STORE_URL}/wp-json/wc/v3/products/categories`);
    categoriesUrl.searchParams.append('consumer_key', WC_CONSUMER_KEY);
    categoriesUrl.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
    categoriesUrl.searchParams.append('search', query);
    categoriesUrl.searchParams.append('per_page', '5');
    categoriesUrl.searchParams.append('hide_empty', 'true');

    const categoriesResponse = await fetch(categoriesUrl.toString(), { headers });

    let categories = [];

    if (categoriesResponse.ok) {
      categories = await categoriesResponse.json();
    }

    // 3. 格式化商品数据
    const formattedProducts = products.map((product: any) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      regular_price: product.regular_price,
      sale_price: product.sale_price,
      on_sale: product.on_sale,
      image: product.images?.[0]?.src || '',
      permalink: product.permalink,
    }));

    // 4. 格式化分类数据
    const formattedCategories = categories.map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      count: cat.count,
    }));

    return new Response(
      JSON.stringify({
        products: formattedProducts,
        categories: formattedCategories,
        total: totalProducts,
        query: query
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Search API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Search failed',
        message: error.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
