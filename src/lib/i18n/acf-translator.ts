/**
 * ACF 字段翻译工具
 * 用于翻译 WordPress ACF 自定义字段数据
 */

import type { SupportedLocale } from './utils';
import { translate } from './translator';

export interface TranslateACFConfig {
  cache?: any;
  cachePrefix?: string;
  context?: any;
}

/**
 * 翻译简单文本字段
 */
export async function translateTextField(
  text: string | undefined | null,
  targetLang: SupportedLocale,
  config: TranslateACFConfig = {}
): Promise<string> {
  if (!text || targetLang === 'en') {
    return text || '';
  }

  try {
    return await translate(
      text,
      targetLang,
      {
        cache: config.cache,
        cachePrefix: config.cachePrefix || 'acf',
        allowLiveInference: true
      },
      config.context
    );
  } catch (error) {
    console.warn('[ACF Translator] Failed to translate text:', error);
    return text;
  }
}

/**
 * 翻译对象中的指定字段
 */
export async function translateObjectFields(
  obj: any,
  fields: string[],
  targetLang: SupportedLocale,
  config: TranslateACFConfig = {}
): Promise<any> {
  if (!obj || targetLang === 'en') {
    return obj;
  }

  const translated = { ...obj };

  for (const field of fields) {
    if (translated[field] && typeof translated[field] === 'string') {
      translated[field] = await translateTextField(
        translated[field],
        targetLang,
        config
      );
    }
  }

  return translated;
}

/**
 * 批量翻译对象数组
 */
export async function translateObjectArray(
  arr: any[],
  fields: string[],
  targetLang: SupportedLocale,
  config: TranslateACFConfig = {}
): Promise<any[]> {
  if (!arr || arr.length === 0 || targetLang === 'en') {
    return arr;
  }

  return Promise.all(
    arr.map(item => translateObjectFields(item, fields, targetLang, config))
  );
}

/**
 * 翻译 Hero Card 数据
 */
export async function translateHeroCard(
  card: any,
  targetLang: SupportedLocale,
  config: TranslateACFConfig = {}
): Promise<any> {
  return translateObjectFields(
    card,
    ['label', 'title', 'subtitle', 'description', 'buttonText'],
    targetLang,
    config
  );
}

/**
 * 翻译 FAQ 项目
 */
export async function translateFAQItem(
  faq: any,
  targetLang: SupportedLocale,
  config: TranslateACFConfig = {}
): Promise<any> {
  return translateObjectFields(
    faq,
    ['question', 'answer'],
    targetLang,
    config
  );
}

/**
 * 翻译 Campaign Card 数据
 */
export async function translateCampaignCard(
  card: any,
  targetLang: SupportedLocale,
  config: TranslateACFConfig = {}
): Promise<any> {
  return translateObjectFields(
    card,
    ['poster_title', 'poster_subtitle', 'button_text'],
    targetLang,
    config
  );
}

/**
 * 翻译 Trust Badge 数据
 */
export async function translateTrustBadge(
  badge: any,
  targetLang: SupportedLocale,
  config: TranslateACFConfig = {}
): Promise<any> {
  return translateObjectFields(
    badge,
    ['title', 'description', 'text'],
    targetLang,
    config
  );
}
