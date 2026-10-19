import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    isDevelopment: import.meta.env.MODE === 'development',
    WC_STORE_URL: import.meta.env.WC_STORE_URL ? '✓ 已设置' : '✗ 未设置'
  }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
