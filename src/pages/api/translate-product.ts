import type { APIRoute } from 'astro';
import { translateProduct } from '../../lib/i18n/product-translator';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { product, targetLang } = await request.json();

    if (!product || !targetLang) {
      return new Response(JSON.stringify({ error: 'Missing product or targetLang' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 翻译产品
    const translatedProduct = await translateProduct(product, targetLang, locals);

    return new Response(JSON.stringify(translatedProduct), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Translation API error:', error);
    return new Response(JSON.stringify({ error: 'Translation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const prerender = false;
