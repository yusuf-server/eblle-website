/**
 * 环境变量适配层
 * 兼容 Astro v6 + @astrojs/cloudflare (cloudflare:workers) 与本地开发 (import.meta.env)
 */
import { env as cfEnv } from 'cloudflare:workers';

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

  // Airwallex
  AIRWALLEX_ENV?: string;
  PUBLIC_AIRWALLEX_ENV?: string;
  AIRWALLEX_CLIENT_ID?: string;
  AIRWALLEX_API_KEY?: string;
  AIRWALLEX_WEBHOOK_SECRET?: string;
}

/**
 * 统一读取环境变量（同时兼容 Cloudflare Workers 运行时与本地 .env）
 */
export function getEnv(_context?: any): Env {
  const runtime: Record<string, any> = (cfEnv && typeof cfEnv === 'object') ? cfEnv : {};
  const meta: Record<string, any> = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

  const pick = (key: string, fallback = ''): string => {
    const val = runtime[key] ?? meta[key] ?? fallback;
    return typeof val === 'string' ? val : String(val ?? fallback);
  };

  return {
    WC_STORE_URL: pick('WC_STORE_URL'),
    WC_CONSUMER_KEY: pick('WC_CONSUMER_KEY'),
    WC_CONSUMER_SECRET: pick('WC_CONSUMER_SECRET'),
    PAYPAL_CLIENT_ID: pick('PAYPAL_CLIENT_ID'),
    PAYPAL_CLIENT_SECRET: pick('PAYPAL_CLIENT_SECRET'),
    PUBLIC_PAYPAL_CLIENT_ID: pick('PUBLIC_PAYPAL_CLIENT_ID'),
    PAYPAL_MODE: pick('PAYPAL_MODE', 'sandbox'),
    PAYPAL_WEBHOOK_ID: pick('PAYPAL_WEBHOOK_ID'),
    AIRWALLEX_ENV: pick('AIRWALLEX_ENV', 'demo'),
    PUBLIC_AIRWALLEX_ENV: pick('PUBLIC_AIRWALLEX_ENV', 'demo'),
    AIRWALLEX_CLIENT_ID: pick('AIRWALLEX_CLIENT_ID'),
    AIRWALLEX_API_KEY: pick('AIRWALLEX_API_KEY'),
    AIRWALLEX_WEBHOOK_SECRET: pick('AIRWALLEX_WEBHOOK_SECRET'),
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

export function validateAirwallexEnv(env: Env): { valid: boolean; missing: string[] } {
  const required: (keyof Env)[] = [
    'WC_STORE_URL',
    'WC_CONSUMER_KEY',
    'WC_CONSUMER_SECRET',
    'AIRWALLEX_CLIENT_ID',
    'AIRWALLEX_API_KEY',
  ];

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

  url.searchParams.append('consumer_key', env.WC_CONSUMER_KEY);
  url.searchParams.append('consumer_secret', env.WC_CONSUMER_SECRET);

  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
}