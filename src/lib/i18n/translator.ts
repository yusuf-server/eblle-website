/**
 * 翻译服务模块 - 完整导出版
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

  const cache = config.cache || env?.TRANSLATION_CACHE;
  const cacheKey = generateCacheKey(text, targetLang, config.cachePrefix);

  // 1. 尝试从 KV 读取
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

  // 2. 如果不许实时推理（普通页面渲染链路），未命中直接返回原文避免阻塞
  if (!config.allowLiveInference) {
    return text;
  }

  // 3. 预热/显式推理
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
        await cache.put(cacheKey, translated, { expirationTtl: 90 * 24 * 60 * 60 });
        console.log(`✓ [写入 KV]: ${cacheKey.substring(0, 45)}...`);
      }
      return translated;
    }
  } catch (error: any) {
    console.error('[Translator] AI 推理失败:', error?.message || error);
  }

  return text;
}

/**
 * 批量翻译函数 - 补齐导出
 * 采用受控并发（默认 4 个并发），避免阻塞边缘算力
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