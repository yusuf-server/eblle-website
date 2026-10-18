// 浏览器端 WooCommerce 客户端（绕过服务器端防火墙）
export async function fetchProductsFromBrowser() {
  const WC_STORE_URL = 'https://ebbellejewelry.com';
  const WC_CONSUMER_KEY = 'ck_988162007413ff90086a8056ebdcda38cce8d934';
  const WC_CONSUMER_SECRET = 'cs_d28105ed26a92ff86c4cc28d10074a7831fdc7d5';

  const url = new URL(`${WC_STORE_URL}/wp-json/wc/v3/products`);
  url.searchParams.append('consumer_key', WC_CONSUMER_KEY);
  url.searchParams.append('consumer_secret', WC_CONSUMER_SECRET);
  url.searchParams.append('per_page', '20');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const products = await response.json();
    return {
      success: true,
      products,
      total: parseInt(response.headers.get('x-wp-total') || '0')
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
