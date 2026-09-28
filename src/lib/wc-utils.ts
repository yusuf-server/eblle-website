/**
 * WooCommerce API 工具函数
 * 使用 URL 参数认证，兼容 Cloudflare Pages
 */

export async function wcFetch(endpoint: string, options: RequestInit & { params?: Record<string, any> } = {}) {
  const WC_STORE_URL = import.meta.env.WC_STORE_URL;
  const WC_CONSUMER_KEY = import.meta.env.WC_CONSUMER_KEY;
  const WC_CONSUMER_SECRET = import.meta.env.WC_CONSUMER_SECRET;

  const url = new URL(`${WC_STORE_URL}/wp-json/wc/v3/${endpoint}`);

  // 添加认证参数
  url.searchParams.append('consumer_key', WC_CONSUMER_KEY);
  url.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);

  // 添加其他查询参数
  if (options.params) {
    Object.keys(options.params).forEach(key => {
      if (options.params[key] !== undefined && options.params[key] !== null) {
        url.searchParams.append(key, options.params[key].toString());
      }
    });
  }

  const { params, ...fetchOptions } = options;

  const response = await fetch(url.toString(), {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      ...fetchOptions.headers
    }
  });

  return response;
}
