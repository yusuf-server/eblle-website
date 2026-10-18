import type { APIRoute } from 'astro';

/**
 * 诊断 API：检查 Cloudflare 绑定状态
 */
export const GET: APIRoute = async ({ locals }) => {
  // 检查所有可能的绑定位置
  const bindings = {
    // 标准 Astro locals
    'locals.AI': !!locals.AI,
    'locals.TRANSLATION_CACHE': !!locals.TRANSLATION_CACHE,
    'locals.SESSION': !!locals.SESSION,

    // Cloudflare runtime (备用位置)
    'locals.runtime.env.AI': !!(locals as any).runtime?.env?.AI,
    'locals.runtime.env.TRANSLATION_CACHE': !!(locals as any).runtime?.env?.TRANSLATION_CACHE,

    // 完整的 locals 对象键
    'locals_keys': Object.keys(locals),

    // 如果有 runtime，显示 runtime.env 的键
    'runtime_env_keys': (locals as any).runtime?.env ? Object.keys((locals as any).runtime.env) : [],
  };

  console.log('[Check Bindings] 完整诊断:', JSON.stringify(bindings, null, 2));

  const hasAI = bindings['locals.AI'] || bindings['locals.runtime.env.AI'];
  const hasCache = bindings['locals.TRANSLATION_CACHE'] || bindings['locals.runtime.env.TRANSLATION_CACHE'];

  return new Response(JSON.stringify({
    success: true,
    bindings,
    message: hasAI
      ? '✅ AI 绑定正常'
      : '❌ AI 绑定缺失 - 请检查配置并重新部署',
    suggestion: !hasAI && bindings['runtime_env_keys'].length > 0
      ? '💡 发现 runtime.env，可能需要调整代码访问路径'
      : null
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const prerender = false;
