import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
  const env = {
    WC_STORE_URL: import.meta.env.WC_STORE_URL ? '✓ 已设置' : '✗ 未设置',
    WC_CONSUMER_KEY: import.meta.env.WC_CONSUMER_KEY ? `✓ 已设置 (${import.meta.env.WC_CONSUMER_KEY?.substring(0, 5)}...)` : '✗ 未设置',
    WC_CONSUMER_SECRET: import.meta.env.WC_CONSUMER_SECRET ? `✓ 已设置 (${import.meta.env.WC_CONSUMER_SECRET?.substring(0, 5)}...)` : '✗ 未设置',
    NODE_ENV: import.meta.env.MODE,
    runtime: 'Cloudflare Pages'
  };

  return new Response(JSON.stringify(env, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
