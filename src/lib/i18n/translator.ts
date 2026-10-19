/**
 * 翻译服务模块 - 方案 B 极速只读版
 */
import { env } from 'cloudflare:workers';
import type { SupportedLocale } from './utils';

const LANG_MAP: Record<SupportedLocale, string> = {
  en: 'en',
  fr: 'fr',
  de: 'de',
  es: 'es'
};

export interface TranslateConfig {
  engine?: 'cloudflare-ai' | 'google';
  cache?: any;
  cachePrefix?: string;
  targetLanguage?: SupportedLocale;
  allowLiveInference?: boolean; // 默认 false，只有后台预热脚本才设为 true
}

function generateCacheKey(text: string, targetLang: SupportedLocale, prefix?: string): string {
  const hash = simpleHash(text);
  return prefix ? `${prefix}:${targetLang}:${hash}` : `trans:${targetLang}:${hash}`;
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * 极速主翻译函数
 */
export async function translate(
  text: string,
  targetLang: SupportedLocale,
  config: TranslateConfig = {},
  context?: any
): Promise<string> {
  if (!text || targetLang === 'en') {
    return text;
  }

  const cache = config.cache || env?.TRANSLATION_CACHE;
  const cacheKey = generateCacheKey(text, targetLang, config.cachePrefix);

  // 1. 尝试从 KV 毫秒级读取
  if (cache) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      console.warn('[Translator] KV 读取失败:', error);
    }
  }

  // 2. 如果不是预热任务（allowLiveInference !== true），未命中缓存立刻返回原文，绝不阻塞 SSR 首屏渲染
  if (!config.allowLiveInference) {
    return text;
  }

  // 3. 仅在后台预热任务中才执行 AI 推理
  const ai = env?.AI || context?.AI;
  if (!ai) {
    return text;
  }

  try {
    const targetLangCode = LANG_MAP[targetLang] || targetLang;
    const response = await ai.run('@cf/meta/m2m100-1.2b', {
      text,
      source_lang: 'en',
      target_lang: targetLangCode
    });

    const translated = response?.translated_text;
    if (translated && translated !== text) {
      if (cache) {
        // 缓存有效期待定为 90 天
        await cache.put(cacheKey, translated, { expirationTtl: 90 * 24 * 60 * 60 });
        console.log(`✓ [预热写入 KV]: ${cacheKey.substring(0, 45)}...`);
      }
      return translated;
    }
  } catch (error: any) {
    console.error('[Translator] 预热 AI 推理异常:', error?.message || error);
  }

  return text;
}