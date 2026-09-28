/**
 * ACF 数据缓存管理
 *
 * 减少重复的 WordPress API 调用
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ACFCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private ttl: number = 5 * 60 * 1000; // 5 分钟缓存

  /**
   * 获取缓存的数据
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 设置缓存数据
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 清除缓存
   */
  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 获取缓存统计
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// 单例实例
export const acfCache = new ACFCache();

/**
 * 带缓存的 ACF 获取函数
 */
export async function getCachedACF<T>(
  pageId: number,
  fieldName?: string
): Promise<T | null> {
  const cacheKey = fieldName ? `acf_${pageId}_${fieldName}` : `acf_${pageId}`;

  // 尝试从缓存获取
  const cached = acfCache.get<T>(cacheKey);
  if (cached) {
    console.log(`✓ ACF 缓存命中: ${cacheKey}`);
    return cached;
  }

  console.log(`⚠ ACF 缓存未命中: ${cacheKey}，正在获取...`);

  try {
    // 从 WordPress 获取
    const WP_URL = import.meta.env.WC_STORE_URL || 'https://ebbellejewelry.com';
    const url = new URL(`${WP_URL}/wp-json/wp/v2/pages/${pageId}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'curl/7.88.1'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ACF: ${response.status}`);
    }

    const data = await response.json();
    const acfData = data.acf;

    // 缓存结果
    if (acfData) {
      const result = fieldName ? acfData[fieldName] : acfData;
      acfCache.set(cacheKey, result);
      return result as T;
    }

    return null;
  } catch (error) {
    console.error(`获取 ACF 数据失败 (${cacheKey}):`, error);
    return null;
  }
}

/**
 * 批量预加载 ACF 数据（在页面加载时调用）
 */
export async function preloadACF(pageIds: number[]): Promise<void> {
  console.log(`预加载 ${pageIds.length} 个页面的 ACF 数据...`);

  const promises = pageIds.map(id => getCachedACF(id));
  await Promise.all(promises);

  console.log('✓ ACF 数据预加载完成');
}
