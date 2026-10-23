/**
 * 首页数据聚合器 - 优化版
 * 整合 WordPress/ACF、Instagram、Flash Sale 产品数据
 * 使用 Cloudflare KV 缓存完整页面数据包
 */

import type { SupportedLocale } from './i18n/utils';
import { getHomepageData, parseACFImage, parseACFLink } from './wordpress';
import { translate, translateBatch } from './i18n/translator';
import { env } from 'cloudflare:workers';

// 首页数据类型
export interface HomepageData {
  heroData: any;
  instagramPosts: any[];
}

/**
 * 生成首页缓存键
 */
function getHomepageCacheKey(locale: SupportedLocale): string {
  // 使用更长的缓存时间，添加日期作为版本
  const version = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `homepage:${locale}:${version}:v4`; // 改为 v4，强制刷新
}

/**
 * 获取并翻译 ACF Hero 数据
 */
async function translateHeroData(heroData: any, locale: SupportedLocale, context: any, kvCache: any) {
  if (locale === 'en' || !heroData) {
    return heroData;
  }

  const config = {
    engine: 'cloudflare-ai' as const,
    cache: kvCache,
    cachePrefix: 'acf'
  };

  try {
    // 翻译桌面端 Hero Slides
    if (heroData.hero_slides && Array.isArray(heroData.hero_slides)) {
      for (const slide of heroData.hero_slides) {
        if (slide.title) {
          slide.title = await translate(slide.title, locale, config, context);
        }
        if (slide.description) {
          slide.description = await translate(slide.description, locale, config, context);
        }
        if (slide.button_text) {
          slide.button_text = await translate(slide.button_text, locale, config, context);
        }
      }
    }

    // 翻译移动端 Hero Slides
    if (heroData.mobile_hero_slides && Array.isArray(heroData.mobile_hero_slides)) {
      for (const slide of heroData.mobile_hero_slides) {
        if (slide.subtitle) {
          slide.subtitle = await translate(slide.subtitle, locale, config, context);
        }
        if (slide.title) {
          slide.title = await translate(slide.title, locale, config, context);
        }
        if (slide.description) {
          slide.description = await translate(slide.description, locale, config, context);
        }
        if (slide.button_text) {
          slide.button_text = await translate(slide.button_text, locale, config, context);
        }
      }
    }

    // 翻译 Mid Cards
    if (heroData.mid1_label) {
      heroData.mid1_label = await translate(heroData.mid1_label, locale, config, context);
    }
    if (heroData.mid1_title) {
      heroData.mid1_title = await translate(heroData.mid1_title, locale, config, context);
    }
    if (heroData.mid2_label) {
      heroData.mid2_label = await translate(heroData.mid2_label, locale, config, context);
    }
    if (heroData.mid2_title) {
      heroData.mid2_title = await translate(heroData.mid2_title, locale, config, context);
    }

    // 翻译 Mobile Sub Cards
    if (heroData.mobile_sub1_tag) {
      heroData.mobile_sub1_tag = await translate(heroData.mobile_sub1_tag, locale, config, context);
    }
    if (heroData.mobile_sub1_title) {
      heroData.mobile_sub1_title = await translate(heroData.mobile_sub1_title, locale, config, context);
    }
    if (heroData.mobile_sub2_tag) {
      heroData.mobile_sub2_tag = await translate(heroData.mobile_sub2_tag, locale, config, context);
    }
    if (heroData.mobile_sub2_title) {
      heroData.mobile_sub2_title = await translate(heroData.mobile_sub2_title, locale, config, context);
    }

    // 翻译 Campaign Cards
    if (heroData.campaign_cards && Array.isArray(heroData.campaign_cards)) {
      for (const card of heroData.campaign_cards) {
        if (card.title) {
          card.title = await translate(card.title, locale, config, context);
        }
        if (card.description) {
          card.description = await translate(card.description, locale, config, context);
        }
        // 翻译 Campaign 卡片中的产品标题
        if (card.products && Array.isArray(card.products)) {
          for (const product of card.products) {
            // 产品数据使用 post_title 字段
            if (product.post_title) {
              product.translated_title = await translate(product.post_title, locale, config, context);
            } else if (product.title) {
              product.translated_title = await translate(product.title, locale, config, context);
            }
          }
        }
      }
    }

    // 翻译其他单个字段
    if (heroData.main_title) {
      heroData.main_title = await translate(heroData.main_title, locale, config, context);
    }
    if (heroData.main_description) {
      heroData.main_description = await translate(heroData.main_description, locale, config, context);
    }
    if (heroData.button_text) {
      heroData.button_text = await translate(heroData.button_text, locale, config, context);
    }

    // 翻译 FAQ Section
    if (heroData.faq_section_title) {
      heroData.faq_section_title = await translate(heroData.faq_section_title, locale, config, context);
    }
    if (heroData.mobile_faq_title) {
      heroData.mobile_faq_title = await translate(heroData.mobile_faq_title, locale, config, context);
    }
    if (heroData.faq_items && Array.isArray(heroData.faq_items)) {
      for (const faq of heroData.faq_items) {
        if (faq.question) {
          faq.question = await translate(faq.question, locale, config, context);
        }
        if (faq.answer) {
          faq.answer = await translate(faq.answer, locale, config, context);
        }
      }
    }

  } catch (error) {
    console.error('[HomepageAggregator] ACF 翻译失败:', error);
  }

  return heroData;
}

/**
 * 翻译产品数据
 */
async function translateProducts(products: any[], locale: SupportedLocale, context: any, kvCache: any) {
  if (locale === 'en' || !products || products.length === 0) {
    return products;
  }

  const config = {
    engine: 'cloudflare-ai' as const,
    cache: kvCache,
    cachePrefix: 'product'
  };

  try {
    for (const product of products) {
      if (product.name) {
        product.name = await translate(product.name, locale, config, context);
      }
      if (product.short_description) {
        product.short_description = await translate(product.short_description, locale, config, context);
      }
    }
  } catch (error) {
    console.error('[HomepageAggregator] 产品翻译失败:', error);
  }

  return products;
}

/**
 * 获取 Instagram 数据
 */
async function getInstagramPosts(): Promise<any[]> {
  const INSTAGRAM_ACCESS_TOKEN = 'IGAAHKoYxeZA3JBZAGI5eVltcy1zSzRPWEJfVXJMWnZAMU25DWkI5eEh0clViQjF0THJ6a20wSWdaM1hQRlp0ZAFVvSE9ScC1KT3VFUzU4T3ZAXbzZAGOFlYbkZAweFA4Ul90MVlBU3Jza3NZATjhDdldIOWYyUXVn';
  const INSTAGRAM_API_URL = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&access_token=${INSTAGRAM_ACCESS_TOKEN}&limit=4`;

  try {
    const response = await fetch(INSTAGRAM_API_URL);
    const data = await response.json();

    if (data.data) {
      return data.data.map((post: any) => ({
        id: post.id,
        caption: post.caption || '',
        media_type: post.media_type,
        media_url: post.media_url,
        thumbnail_url: post.thumbnail_url || post.media_url,
        permalink: post.permalink,
        is_video: post.media_type === 'VIDEO'
      }));
    }
  } catch (error) {
    console.error('[HomepageAggregator] Instagram 数据获取失败:', error);
  }

  return [];
}

/**
 * 获取优化后的首页数据
 *
 * @param locale 当前语言
 * @param locals Astro.locals（包含 TRANSLATION_CACHE 和 AI binding）
 * @returns 完整的首页数据
 */
export async function getOptimizedHomepageData(
  locale: SupportedLocale,
  locals: any
): Promise<HomepageData> {
  const cacheKey = getHomepageCacheKey(locale);
  // 从 cloudflare:workers 模块获取 KV（推荐方式）
  const kvCache = env?.TRANSLATION_CACHE || locals?.TRANSLATION_CACHE;

  // 调试：检查 KV 是否可用
  console.log(`[Homepage] KV 状态: ${kvCache ? '✓ 可用' : '✗ 不可用'}`);
  if (!kvCache) {
    console.warn('[Homepage] ⚠️  TRANSLATION_CACHE 未绑定 - 请检查 Cloudflare Pages 设置');
  }

  // 1. 尝试从 KV 缓存读取完整页面数据包
  if (kvCache) {
    try {
      const cachedData = await kvCache.get(cacheKey, 'json');
      if (cachedData) {
        console.log(`✓ 首页 KV 缓存命中 [${locale}] - 毫秒级返回`);
        return cachedData as HomepageData;
      }
    } catch (error) {
      console.warn('[HomepageAggregator] KV 缓存读取失败:', error);
    }
  }

  console.log(`→ 首页 KV 缓存未命中 [${locale}] - 开始聚合数据...`);

  // 2. 并行获取所有原始数据（移除 Flash Sale，改为客户端加载）
  const [rawHeroData, instagramPosts] = await Promise.all([
    getHomepageData(),
    getInstagramPosts()
  ]);

  // 3. 如果是英语，直接返回原始数据
  if (locale === 'en') {
    const data: HomepageData = {
      heroData: rawHeroData,
      instagramPosts
    };

    // 写入英语缓存
    if (kvCache) {
      try {
        await kvCache.put(cacheKey, JSON.stringify(data), { expirationTtl: 24 * 60 * 60 }); // 24小时
        console.log(`✓ 首页英语数据缓存写入 [TTL: 24h]`);
      } catch (error) {
        console.warn('[HomepageAggregator] KV 缓存写入失败:', error);
      }
    }

    return data;
  }

  // 4. 非英语：翻译所有数据
  console.log(`→ 开始翻译首页数据到 [${locale}]...`);

  const context = {
    AI: locals.AI // Cloudflare Workers AI binding
  };

  const translatedHeroData = await translateHeroData(rawHeroData, locale, context, kvCache);

  const data: HomepageData = {
    heroData: translatedHeroData,
    instagramPosts
  };

  // 5. 写入完整数据包到 KV 缓存
  if (kvCache) {
    try {
      await kvCache.put(cacheKey, JSON.stringify(data), { expirationTtl: 24 * 60 * 60 }); // 24小时
      console.log(`✓ 首页 [${locale}] 完整数据包缓存写入成功 [TTL: 24h]`);
    } catch (error) {
      console.warn('[HomepageAggregator] KV 缓存写入失败:', error);
    }
  }

  console.log(`✓ 首页 [${locale}] 数据聚合完成`);

  return data;
}
