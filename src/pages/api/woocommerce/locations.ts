/**
 * 代理并精简 WooCommerce 全球国家与标准州/省列表（带边缘强缓存）
 */
import type { APIRoute } from 'astro';
import { getEnv, validateEnv } from '../../../lib/env';

export const prerender = false;

let memoryLocationsCache: { data: Record<string, Array<{ code: string; name: string }>>; expiresAt: number } | null = null;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const now = Date.now();
    if (memoryLocationsCache && now < memoryLocationsCache.expiresAt) {
      return new Response(JSON.stringify({ success: true, statesByCountry: memoryLocationsCache.data }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      });
    }

    const env = getEnv(locals);
    const validation = validateEnv(env, false);
    if (!validation.valid) {
      return new Response(JSON.stringify({ success: false, statesByCountry: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const wcAuth = btoa(`${env.WC_CONSUMER_KEY}:${env.WC_CONSUMER_SECRET}`);
    const res = await fetch(`${env.WC_STORE_URL}/wp-json/wc/v3/data/countries`, {
      headers: {
        Authorization: `Basic ${wcAuth}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ success: false, statesByCountry: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const countries = await res.json();
    const statesByCountry: Record<string, Array<{ code: string; name: string }>> = {};

    if (Array.isArray(countries)) {
      for (const c of countries) {
        const code = String(c?.code || '').toUpperCase().trim();
        const states = Array.isArray(c?.states) ? c.states : [];
        if (code && states.length > 0) {
          statesByCountry[code] = states.map((s: any) => ({
            code: String(s.code || '').trim(),
            name: String(s.name || s.code || '').trim(),
          }));
        }
      }
    }

    // 内存缓存 24 小时
    memoryLocationsCache = {
      data: statesByCountry,
      expiresAt: now + 24 * 60 * 60 * 1000,
    };

    return new Response(JSON.stringify({ success: true, statesByCountry }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, statesByCountry: {} }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};