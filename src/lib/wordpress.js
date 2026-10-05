/**
 * WordPress REST API 工具函数
 * 用于从 WordPress 后端获取动态内容
 */

const WP_API_BASE = import.meta.env.WC_STORE_URL || import.meta.env.WC_URL;

// 简单的内存缓存
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取首页数据（从 WordPress 页面 + ACF 字段）
 * @returns {Promise<Object|null>} ACF 字段数据或 null
 */
export async function getHomepageData() {
  const cacheKey = 'homepage_data';
  const now = Date.now();

  // 检查缓存
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL) {
      console.log('✓ 使用缓存的首页数据');
      return cached.data;
    }
  }

  try {
    console.log('→ 从 WordPress API 获取首页数据...');
    const startTime = Date.now();

    // 获取 slug 为 'home' 的页面
    const response = await fetch(`${WP_API_BASE}/wp-json/wp/v2/pages?slug=home-settings&_embed=1`, {
      headers: {
        'Accept': 'application/json',
      },
      // 添加超时控制
      signal: AbortSignal.timeout(8000), // 8秒超时
    });

    if (!response.ok) {
      console.error(`WordPress API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const pages = await response.json();
    const elapsed = Date.now() - startTime;
    console.log(`✓ WordPress API 响应时间: ${elapsed}ms`);

    if (pages && pages.length > 0) {
      const page = pages[0];

      // 优先使用 acf_processed（经过处理的图片字段），否则使用 acf
      const data = page.acf_processed || page.acf || null;

      // 缓存结果
      cache.set(cacheKey, {
        data,
        timestamp: now,
      });

      return data;
    }

    console.warn('Home page not found in WordPress');
    return null;
  } catch (error) {
    if (error.name === 'TimeoutError') {
      console.error('WordPress API timeout after 8s');
    } else {
      console.error('Error fetching homepage data from WordPress:', error);
    }
    return null;
  }
}

/**
 * 获取特定页面的 ACF 数据
 * @param {string} slug - 页面 slug
 * @returns {Promise<Object|null>}
 */
export async function getPageData(slug) {
  try {
    const response = await fetch(`${WP_API_BASE}/wp-json/wp/v2/pages?slug=${slug}&_embed=1`);

    if (!response.ok) {
      return null;
    }

    const pages = await response.json();

    if (pages && pages.length > 0) {
      return pages[0].acf || null;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching page data for ${slug}:`, error);
    return null;
  }
}

/**
 * 解析 ACF Link 字段
 * @param {Object} link - ACF Link 字段对象
 * @returns {Object} 包含 url, title, target 的对象
 */
export function parseACFLink(link) {
  if (!link) {
    return { url: '#', title: '', target: '' };
  }

  return {
    url: link.url || '#',
    title: link.title || '',
    target: link.target || '',
  };
}

/**
 * 解析 ACF Image 字段
 * @param {Object|number|string} image - ACF Image 字段对象、ID 或 URL
 * @returns {Object} 包含 url, alt, width, height 的对象
 */
export function parseACFImage(image) {
  if (!image) {
    return {
      url: '',
      alt: '',
      width: 0,
      height: 0,
    };
  }

  // 如果是数字（Image ID），需要通过 WordPress Media API 获取
  // 但为了性能，我们暂时返回空，需要在 WordPress 端修复
  if (typeof image === 'number') {
    console.warn(`ACF Image field returned ID (${image}) instead of array. Please check ACF field settings.`);
    return {
      url: '',
      alt: '',
      width: 0,
      height: 0,
    };
  }

  // 如果是字符串（URL）
  if (typeof image === 'string') {
    return {
      url: image,
      alt: '',
      width: 0,
      height: 0,
    };
  }

  // 如果是对象（正确的 Image Array 格式）
  return {
    url: image.url || '',
    alt: image.alt || image.title || '',
    width: image.width || 0,
    height: image.height || 0,
  };
}
