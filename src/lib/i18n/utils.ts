/**
 * i18n 工具函数
 * 提供语言检测、路径生成等功能
 */

// 支持的语言列表
export const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

// 语言名称映射
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español'
};

// 语言标志 Emoji
export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  en: '🇺🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸'
};

/**
 * 从 URL 路径中提取语言代码
 * /fr/shop -> 'fr'
 * /shop -> 'en'
 */
export function getLocaleFromPath(pathname: string): SupportedLocale {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return DEFAULT_LOCALE;
  }

  const firstSegment = segments[0];

  if (SUPPORTED_LOCALES.includes(firstSegment as SupportedLocale)) {
    return firstSegment as SupportedLocale;
  }

  return DEFAULT_LOCALE;
}

/**
 * 移除路径中的语言前缀
 * /fr/shop -> /shop
 * /shop -> /shop
 */
export function removeLocalePrefix(pathname: string): string {
  const locale = getLocaleFromPath(pathname);

  if (locale === DEFAULT_LOCALE) {
    return pathname;
  }

  return pathname.replace(new RegExp(`^/${locale}`), '') || '/';
}

/**
 * 添加语言前缀到路径
 * (/shop, 'fr') -> /fr/shop
 * (/shop, 'en') -> /shop
 */
export function addLocalePrefix(pathname: string, locale: SupportedLocale): string {
  if (locale === DEFAULT_LOCALE) {
    return pathname;
  }

  // 确保路径以 / 开头
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;

  return `/${locale}${cleanPath}`;
}

/**
 * 生成替代语言的路径
 * 用于语言切换器
 */
export function getAlternateLocaleUrls(pathname: string): Record<SupportedLocale, string> {
  const basePath = removeLocalePrefix(pathname);

  return SUPPORTED_LOCALES.reduce((acc, locale) => {
    acc[locale] = addLocalePrefix(basePath, locale);
    return acc;
  }, {} as Record<SupportedLocale, string>);
}

/**
 * 验证语言代码是否有效
 */
export function isValidLocale(locale: string): locale is SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
}

/**
 * 从 Astro.url 获取当前语言
 */
export function getCurrentLocale(url: URL): SupportedLocale {
  return getLocaleFromPath(url.pathname);
}

/**
 * 生成 hreflang 链接标签数据
 */
export function generateHreflangLinks(currentPath: string, baseUrl: string): Array<{
  rel: string;
  hreflang: string;
  href: string;
}> {
  const alternateUrls = getAlternateLocaleUrls(currentPath);

  return [
    // x-default 指向英文版本
    {
      rel: 'alternate',
      hreflang: 'x-default',
      href: `${baseUrl}${alternateUrls.en}`
    },
    // 各语言版本
    ...SUPPORTED_LOCALES.map(locale => ({
      rel: 'alternate',
      hreflang: locale,
      href: `${baseUrl}${alternateUrls[locale]}`
    }))
  ];
}
