import type { APIRoute } from 'astro';

/**
 * 诊断 API：检查 Cloudflare 绑定状态
 */
export const GET: APIRoute = async ({ locals }) => {
  const bindings = {
    AI: !!locals.AI,
    TRANSLATION_CACHE: !!locals.TRANSLATION_CACHE,
    SESSION: !!locals.SESSION,
    AI_type: locals.AI ? typeof locals.AI : 'undefined',
    AI_keys: locals.AI ? Object.keys(locals.AI).slice(0, 5) : [],
    TRANSLATION_CACHE_type: locals.TRANSLATION_CACHE ? typeof locals.TRANSLATION_CACHE : 'undefined',
  };

  console.log('[Check Bindings] 绑定状态:', bindings);

  return new Response(JSON.stringify({
    success: true,
    bindings,
    message: bindings.AI
      ? '✅ AI 绑定正常'
      : '❌ AI 绑定缺失 - 请在 Cloudflare Dashboard 配置'
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const prerender = false;
