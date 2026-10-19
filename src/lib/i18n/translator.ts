/**
 * 翻译服务模块 - 优化版
 * 优先使用 Cloudflare Workers AI (@cf/meta/m2m100-1.2b)
 * 降级到 Google Translate API
 */

import type { SupportedLocale } from './utils';

// 语言代码映射：@cf/meta/m2m100-1.2b 模型必须使用 ISO 639-1 两位代码
const LANG_MAP: Record<SupportedLocale, string> = {
  en: 'en',
  fr: 'fr',
  de: 'de',
  es: 'es'
};

// 翻译配置
export interface TranslateConfig {
  engine?: 'cloudflare-ai' | 'google';
  cache?: any; // KVNamespace
  cachePrefix?: string;
  targetLanguage?: SupportedLocale;
}

/**
 * 生成缓存键
 */
function generateCacheKey(text: string, targetLang: SupportedLocale, prefix?: string): string {
  const hash = simpleHash(text);
  return prefix ? `${prefix}:${targetLang}:${hash}` : `trans:${targetLang}:${hash}`;
}

/**
 * 简单哈希函数
 */
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
 * Cloudflare Workers AI 翻译（使用 m2m100-1.2b 模型）
 */
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
    return text; // 返回原文，由调用方降级
  }
}

/**
 * Google Translate API 翻译（降级方案）
 */
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

      // 处理 429 Too Many Requests
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

/**
 * 主翻译函数 - 优先使用 Cloudflare AI，降级到 Google
 */
export async function translate(
  text: string,
  targetLang: SupportedLocale,
  config: TranslateConfig,
  context?: any
): Promise<string> {
  // 如果是英语或空文本，直接返回
  if (!text || targetLang === 'en') {
    return text;
  }

  // 严格解析不同层级下的 Cloudflare AI 绑定实例
  const ai =
    context?.AI ||
    context?.locals?.runtime?.env?.AI ||
    context?.locals?.AI ||
    context?.env?.AI;

  // 生成缓存键
  const cacheKey = generateCacheKey(text, targetLang, config.cachePrefix);

  // 尝试从 KV 缓存读取
  if (config.cache) {
    try {
      const cached = await config.cache.get(cacheKey);
      if (cached) {
        console.log(`✓ KV 缓存命中: ${cacheKey.substring(0, 50)}...`);
        return cached;
      }
    } catch (error) {
      console.warn('[Translator] KV 缓存读取失败:', error);
    }
  }

  let translated = text;

  // 优先尝试 Cloudflare Workers AI
  if (ai) {
    console.log(`→ 使用 Cloudflare Workers AI 翻译: ${text.substring(0, 50)}...`);
    translated = await translateWithCloudflareAI(text, targetLang, ai);

    // 如果 AI 翻译失败（返回原文），降级到 Google
    if (translated === text) {
      console.log(`→ 降级到 Google Translate`);
      translated = await translateWithGoogle(text, targetLang);
    }
  } else {
    // 打印调试信息，便于在 Cloudflare 实时日志中排查上下文结构
    console.warn(
      `[Translator] 未找到 AI Binding，请检查上下文传参。当前 runtime keys:`,
      Object.keys(context?.locals?.runtime?.env || {})
    );
    console.log(`→ 使用 Google Translate 翻译: ${text.substring(0, 50)}...`);
    translated = await translateWithGoogle(text, targetLang);
  }

  // 写入 KV 缓存
  if (config.cache && translated && translated !== text) {
    try {
      // KV 缓存 30 天
      await config.cache.put(cacheKey, translated, { expirationTtl: 30 * 24 * 60 * 60 });
      console.log(`✓ KV 缓存写入: ${cacheKey.substring(0, 50)}...`);
    } catch (error) {
      console.warn('[Translator] KV 缓存写入失败:', error);
    }
  }

  return translated;
}

/**
 * 批量翻译 - 用于翻译多个文本
 */
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