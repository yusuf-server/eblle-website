/**
 * Cloudflare KV 缓存适配器
 * 用于翻译结果的持久化缓存
 */

/**
 * 从 Astro context 获取 KV 缓存实例
 */
export function getCacheFromContext(context: any): any {
  // 尝试获取 Cloudflare KV
  const kv = context?.locals?.translationCache || context?.locals?.runtime?.env?.TRANSLATION_CACHE;

  if (kv) {
    return kv;
  }

  // 如果没有 KV，返回 null（translator.ts 会处理）
  console.warn('未找到 TRANSLATION_CACHE KV 绑定');
  return null;
}

