/**
 * 环境变量适配层
 * 兼容本地开发 (import.meta.env) 和部署环境
 */

export interface Env {
  // WooCommerce
  WC_STORE_URL: string;
  WC_CONSUMER_KEY: string;
  WC_CONSUMER_SECRET: string;

  // PayPal
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PUBLIC_PAYPAL_CLIENT_ID: string;
  PAYPAL_MODE: string;
  PAYPAL_WEBHOOK_ID?: string;
}

/**
 * 从 Astro APIContext 获取环境变量
 */
export function getEnv(context?: any): Env {
  // 部署环境 (Cloudflare Pages / Vercel 等)
  if (context?.locals?.runtime?.env) {
    return context.locals.runtime.env as Env;
  }

  // 本地开发环境 (使用 import.meta.env)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return {
      WC_STORE_URL: import.meta.env.WC_STORE_URL || '',
      WC_CONSUMER_KEY: import.meta.env.WC_CONSUMER_KEY || '',
      WC_CONSUMER_SECRET: import.meta.env.WC_CONSUMER_SECRET || '',
      PAYPAL_CLIENT_ID: import.meta.env.PAYPAL_CLIENT_ID || '',
      PAYPAL_CLIENT_SECRET: import.meta.env.PAYPAL_CLIENT_SECRET || '',
      PUBLIC_PAYPAL_CLIENT_ID: import.meta.env.PUBLIC_PAYPAL_CLIENT_ID || '',
      PAYPAL_MODE: import.meta.env.PAYPAL_MODE || 'sandbox',
      PAYPAL_WEBHOOK_ID: import.meta.env.PAYPAL_WEBHOOK_ID || '',
    };
  }

  // 兜底：所有环境变量都为空字符串
  console.error('❌ 无法读取环境变量！请检查配置。');
  return {
    WC_STORE_URL: '',
    WC_CONSUMER_KEY: '',
    WC_CONSUMER_SECRET: '',
    PAYPAL_CLIENT_ID: '',
    PAYPAL_CLIENT_SECRET: '',
    PUBLIC_PAYPAL_CLIENT_ID: '',
    PAYPAL_MODE: 'sandbox',
    PAYPAL_WEBHOOK_ID: '',
  };
}

/**
 * 验证必需的环境变量是否存在
 */
export function validateEnv(env: Env, includePayPal = false): { valid: boolean; missing: string[] } {
  const required: (keyof Env)[] = [
    'WC_STORE_URL',
    'WC_CONSUMER_KEY',
    'WC_CONSUMER_SECRET',
  ];

  if (includePayPal) {
    required.push('PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET');
  }

  const missing = required.filter((key) => !env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Build WooCommerce API URL with authentication
 */
export function buildWooCommerceApiUrl(env: Env, endpoint: string, additionalParams?: Record<string, string>): string {
  const url = new URL(`${env.WC_STORE_URL}/wp-json/wc/v3${endpoint}`);

  // Add authentication as URL parameters
  url.searchParams.append('consumer_key', env.WC_CONSUMER_KEY);
  url.searchParams.append('consumer_secret', env.WC_CONSUMER_SECRET);

  // Add additional parameters
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
}
