/**
 * 翻译服务模块
 * 架构：KV 缓存命中秒开 -> 未命中调用 Workers AI 自动回填 -> 异常平滑降级原文
 */
import { env } from 'cloudflare:workers';
import type { SupportedLocale } from './utils';

// @cf/meta/m2m100-1.2b 规范两位语言代码
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
  allowLiveInference?: boolean;
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
 * 主翻译函数
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

  console.log(`[Translator] 翻译请求: "${text.substring(0, 50)}..." → ${targetLang}`);

  const cache = config.cache || env?.TRANSLATION_CACHE;
  const cacheKey = generateCacheKey(text, targetLang, config.cachePrefix);

  console.log(`[Translator] 缓存键: ${cacheKey.substring(0, 60)}...`);

  // 1. 优先查 KV 缓存（毫秒级命中）
  if (cache) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log(`[Translator] ✓ 缓存命中，返回: "${cached.substring(0, 50)}..."`);
        return cached;
      }
    } catch (error) {
      console.warn('[Translator] KV 读取失败:', error);
    }
  }

  // 2. 缓存未命中，调用 Cloudflare Workers AI 进行翻译
  const ai = env?.AI || context?.AI;
  if (!ai) {
    console.log('[Translator] AI 不可用，返回原文');
    return text;
  }

  try {
    const targetLangCode = LANG_MAP[targetLang] || targetLang;
    console.log(`[Translator] 调用 AI 翻译: en → ${targetLangCode}`);

    const response = await ai.run('@cf/meta/m2m100-1.2b', {
      text,
      source_lang: 'en',
      target_lang: targetLangCode
    });

    const translated = response?.translated_text;

    // 翻译成功，异步写入 KV，有效期 90 天
    if (translated && translated !== text) {
      console.log(`[Translator] ✓ 翻译成功: "${translated.substring(0, 50)}..."`);
      if (cache) {
        await cache.put(cacheKey, translated, { expirationTtl: 90 * 24 * 60 * 60 });
        console.log(`✓ [KV 自动写入]: ${cacheKey.substring(0, 45)}...`);
      }
      return translated;
    }
  } catch (error: any) {
    // 失败只记录日志，直接返回原文，绝不调用被封锁的 Google 接口或强行等待
    console.error('[Translator] AI 推理失败:', error?.message || error);
  }

  return text;
}

/**
 * 批量受控并发翻译
 */
export async function translateBatch(
  texts: string[],
  targetLang: SupportedLocale,
  config: TranslateConfig = {},
  context?: any,
  concurrency = 4
): Promise<string[]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const results: string[] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += concurrency) {
    const chunk = texts.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (text, index) => {
        const actualIndex = i + index;
        results[actualIndex] = await translate(text, targetLang, config, context);
      })
    );
  }

  return results;
}