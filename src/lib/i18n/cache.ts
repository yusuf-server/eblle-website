/**
 * Cloudflare KV 缓存适配器
 * 用于翻译结果的持久化缓存
 */
import { env } from 'cloudflare:workers';

/**
 * 获取 KV 缓存实例
 */
export function getCacheFromContext(context?: any): any {
  // 1. 优先从官方推荐的 cloudflare:workers 模块获取
  if (env?.TRANSLATION_CACHE) {
    return env.TRANSLATION_CACHE;
  }

  // 2. 备用：从 context 的其他非 runtime 属性提取
  const directKv = context?.TRANSLATION_CACHE || context?.locals?.TRANSLATION_CACHE;
  if (directKv) {
    return directKv;
  }

  console.warn('未找到 TRANSLATION_CACHE KV 绑定');
  return null;
}