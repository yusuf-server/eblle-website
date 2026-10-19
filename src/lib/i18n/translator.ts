/**
 * 翻译服务模块 - 优化版
 * 优先使用 Cloudflare Workers AI (@cf/meta/m2m100-1.2b)
 * 降级到 Google Translate API
 */

import { env } from 'cloudflare:workers';
import type { SupportedLocale } from './utils';

// 语言代码映射：@cf/meta/m2m100-1.2b 模型必须使用 ISO 639-1 两位代码
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

async function translateWithCloudflareAI(
  text: string,
  targetLang: SupportedLocale,
  ai: any
): Promise<string> {
  try {
    const sourceLang = 'en';
    const targetLangCode = LANG_MAP[targetLang] || targetLang;

    const response = await ai.run('@cf/meta/m2m100-1.2b', {
      text,
      source_lang: sourceLang,
      target_lang: targetLangCode
    });

    if (response?.translated_text) {
      return response.translated_text;
    }

    console.warn('[Translator] Cloudflare AI 返回格式异常，降级到 Google');
    return text;
  } catch (error: any) {
    console.error('[Translator] Cloudflare AI 失败:', error?.message || error);
    return text;
  }
}

async function translateWithGoogle(
  text: string,
  targetLang: SupportedLocale
): Promise<string> {
  const attemptTranslation = async (retryCount = 0): Promise<string> => {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status === 429) {
        if (retryCount === 0) {
          console.warn(`[Translator] 遇到 429 频率限制，等待 1000ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptTranslation(1);
        } else {
          console.error(`[Translator] 重试后仍遇到 429，返回原文`);
          return text;
        }
      }

      if (!response.ok) {
        throw new Error(`Google API responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translatedText = data[0].map((item: any) => item[0]).join('');
        return translatedText || text;
      }

      return text;
    } catch (error: any) {
      if (retryCount === 0) {
        console.warn(`[Translator] 翻译失败，重试一次:`, error?.message || error);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return attemptTranslation(1);
      }
      console.error(`[Translator] Google 翻译失败 [${targetLang}]:`, error?.message || error);
      return text;
    }
  };

  return attemptTranslation();
}

export async function translate(
  text: string,
  targetLang: SupportedLocale,
  config: TranslateConfig,
  context?: any
): Promise<string> {
  if (!text || targetLang === 'en') {
    return text;
  }

  // 优先从 cloudflare:workers 获取 AI 实例
  const ai = env?.AI || context?.AI;
  const cache = config.cache || env?.TRANSLATION_CACHE;
  const cacheKey = generateCacheKey(text, targetLang, config.cachePrefix);

  if (cache) {
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        console.log(`✓ KV 缓存命中: ${cacheKey.substring(0, 50)}...`);
        return cached;
      }
    } catch (error) {
      console.warn('[Translator] KV 缓存读取失败:', error);
    }
  }

  let translated = text;

  if (ai) {
    console.log(`→ 使用 Cloudflare Workers AI 翻译: ${text.substring(0, 50)}...`);
    translated = await translateWithCloudflareAI(text, targetLang, ai);

    if (translated === text) {
      console.log(`→ 降级到 Google Translate`);
      translated = await translateWithGoogle(text, targetLang);
    }
  } else {
    console.log(`→ 未检测到 AI 实例，使用 Google Translate: ${text.substring(0, 50)}...`);
    translated = await translateWithGoogle(text, targetLang);
  }

  if (cache && translated && translated !== text) {
    try {
      await cache.put(cacheKey, translated, { expirationTtl: 30 * 24 * 60 * 60 });
      console.log(`✓ KV 缓存写入: ${cacheKey.substring(0, 50)}...`);
    } catch (error) {
      console.warn('[Translator] KV 缓存写入失败:', error);
    }
  }

  return translated;
}

export async function translateBatch(
  texts: string[],
  targetLang: SupportedLocale,
  config: TranslateConfig,
  context?: any
): Promise<string[]> {
  const results = await Promise.all(
    texts.map(text => translate(text, targetLang, config, context))
  );
  return results;
}