// 使用原生 fetch 替代 WooCommerce REST API 包，兼容 Node.js 与 Cloudflare Workers

// 产品接口定义
export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  images: Array<{
    id: number;
    date_created: string;
    date_modified: string;
    src: string;
    name: string;
    alt: string;
  }>;
  attributes: Array<any>;
  variations: Array<number>;
  stock_status: string;
  stock_quantity: number | null;
  rating_count: number;
  average_rating: string;
}

// 分类接口定义
export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: {
    id: number;
    src: string;
    name: string;
    alt: string;
  } | null;
  count: number;
}

// 辅助函数：跨环境安全提取环境变量（兼容 Cloudflare Pages runtime 与 本地 Vite）
export function getEnv(key: string, locals?: any): string {
  if (locals?.runtime?.env?.[key]) {
    return locals.runtime.env[key];
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  return '';
}

// WooCommerce API 核心请求函数
export async function wcRequest(endpoint: string, params: Record<string, any> = {}, locals?: any) {
  const WC_STORE_URL = (getEnv('WC_STORE_URL', locals) || '').replace(/\/$/, '');
  const WC_CONSUMER_KEY = getEnv('WC_CONSUMER_KEY', locals);
  const WC_CONSUMER_SECRET = getEnv('WC_CONSUMER_SECRET', locals);

  if (!WC_STORE_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    throw new Error(`缺少 WooCommerce 必要的环境变量配置 (STORE_URL: ${!!WC_STORE_URL}, KEY: ${!!WC_CONSUMER_KEY}, SECRET: ${!!WC_CONSUMER_SECRET})`);
  }

  const url = new URL(`${WC_STORE_URL}/wp-json/wc/v3/${endpoint}`);

  // 添加业务查询参数
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

  const headers: Record<string, string> = {
    'Authorization': `Basic ${base64Auth}`,
    'Accept': 'application/json',
    'User-Agent': 'curl/7.88.1'
  };

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[WooCommerce Error] Status: ${response.status} ${response.statusText}`);
    console.error(`[WooCommerce Error Body]: ${errorBody.slice(0, 300)}`);
    throw new Error(`WooCommerce API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const total = parseInt(response.headers.get('x-wp-total') || '0', 10);
  const totalPages = parseInt(response.headers.get('x-wp-totalpages') || '1', 10);

  return { data, total, totalPages };
}

// 获取所有产品
export async function getProducts(params?: {
  per_page?: number;
  page?: number;
  category?: number;
  featured?: boolean;
  on_sale?: boolean;
  orderby?: string;
  order?: 'asc' | 'desc';
}, locals?: any): Promise<WooCommerceProduct[]> {
  try {
    const { data } = await wcRequest('products', params, locals);
    return data;
  } catch (error) {
    console.error("获取产品失败:", error);
    return [];
  }
}

// 获取产品（带总数信息）
export async function getProductsWithTotal(params?: {
  per_page?: number;
  page?: number;
  category?: number | string;
  featured?: boolean;
  on_sale?: boolean;
  orderby?: string;
  order?: 'asc' | 'desc';
  search?: string;
  attribute?: string;
  attribute_term?: string;
}, locals?: any): Promise<{ products: WooCommerceProduct[]; total: number; totalPages: number }> {
  try {
    const { data, total, totalPages } = await wcRequest('products', params, locals);
    return {
      products: data,
      total,
      totalPages
    };
  } catch (error) {
    console.error("获取产品失败:", error);
    return { products: [], total: 0, totalPages: 1 };
  }
}

// 根据ID获取单个产品
export async function getProduct(id: number, locals?: any): Promise<WooCommerceProduct | null> {
  try {
    const { data } = await wcRequest(`products/${id}`, {}, locals);
    return data;
  } catch (error) {
    console.error(`获取产品 ${id} 失败:`, error);
    return null;
  }
}

// 根据slug获取产品
export async function getProductBySlug(slug: string, locals?: any): Promise<WooCommerceProduct | null> {
  try {
    console.log(`获取产品详情: ${slug}`);
    const { data } = await wcRequest("products", { slug }, locals);

    if (!data || data.length === 0) {
      console.log(`✗ 未找到产品: ${slug}`);
      return null;
    }

    const product = data[0];

    // 如果是变体产品，获取所有变体来确定价格范围
    if (product.type === 'variable' && product.variations && product.variations.length > 0) {
      try {
        console.log(`产品 ${product.name} 是变体产品，获取变体价格...`);
        const variations = await getProductVariations(product.id, 2, locals);

        if (variations && variations.length > 0) {
          const prices = variations.map(v => parseFloat(v.price)).filter(p => !isNaN(p) && p > 0);
          const regularPrices = variations.map(v => parseFloat(v.regular_price)).filter(p => !isNaN(p) && p > 0);

          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            product.price = minPrice.toFixed(2);
            console.log(`✓ 设置最低售价: $${product.price}`);
          }

          if (regularPrices.length > 0) {
            const minRegularPrice = Math.min(...regularPrices);
            product.regular_price = minRegularPrice.toFixed(2);
            console.log(`✓ 设置最低原价: $${product.regular_price}`);
          }

          if (product.regular_price && product.price && parseFloat(product.regular_price) > parseFloat(product.price)) {
            product.on_sale = true;
          }
        }
      } catch (varError) {
        console.error(`获取变体价格失败:`, varError);
      }
    }

    console.log(`✓ 成功获取产品: ${product.name}, 售价: $${product.price}, 原价: $${product.regular_price || 'N/A'}, 促销: ${product.on_sale}`);
    return product;
  } catch (error) {
    console.error(`获取产品 ${slug} 失败:`, error);
    return null;
  }
}

// 获取所有分类
export async function getCategories(params?: {
  per_page?: number;
  page?: number;
  parent?: number;
}, locals?: any): Promise<WooCommerceCategory[]> {
  try {
    const { data } = await wcRequest("products/categories", params, locals);
    return data;
  } catch (error) {
    console.error("获取分类失败:", error);
    return [];
  }
}

// 根据ID获取单个分类
export async function getCategory(id: number, locals?: any): Promise<WooCommerceCategory | null> {
  try {
    const { data } = await wcRequest(`products/categories/${id}`, {}, locals);
    return data;
  } catch (error) {
    console.error(`获取分类 ${id} 失败:`, error);
    return null;
  }
}

// 获取产品变体（带重试）
export async function getProductVariations(productId: number, retries = 2, locals?: any): Promise<any[]> {
  for (let i = 0; i <= retries; i++) {
    try {
      const { data } = await wcRequest(`products/${productId}/variations`, {}, locals);
      return data;
    } catch (error) {
      if (i === retries) {
        console.error(`获取产品 ${productId} 的变体失败 (已重试${retries}次):`, error);
        return [];
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return [];
}

// 根据slug获取分类
export async function getCategoryBySlug(slug: string, locals?: any): Promise<WooCommerceCategory | null> {
  try {
    const { data } = await wcRequest("products/categories", { slug }, locals);
    return data[0] || null;
  } catch (error) {
    console.error(`获取分类 ${slug} 失败:`, error);
    return null;
  }
}

// 搜索产品
export async function searchProducts(search: string, locals?: any): Promise<WooCommerceProduct[]> {
  try {
    const { data } = await wcRequest("products", { search }, locals);
    return data;
  } catch (error) {
    console.error("搜索产品失败:", error);
    return [];
  }
}