import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('id');

    if (!productId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Product ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const WC_STORE_URL = import.meta.env.WC_STORE_URL;
    const WC_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    if (!WC_STORE_URL || !WC_KEY || !WC_SECRET) {
      throw new Error('WooCommerce API credentials not configured');
    }

    const auth = btoa(`${WC_KEY}:${WC_SECRET}`);

    // 获取产品基本信息
    const productUrl = `${WC_STORE_URL}/wp-json/wc/v3/products/${productId}`;
    const productResponse = await fetch(productUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    });

    if (!productResponse.ok) {
      throw new Error(`Failed to fetch product: ${productResponse.status}`);
    }

    const product = await productResponse.json();

    const result: any = {
      success: true,
      productId: product.id,
      productName: product.name,
      productType: product.type,
      parentWeight: product.weight || 'N/A',
      variations: []
    };

    // 如果是变体产品，获取所有变体的重量
    if (product.type === 'variable') {
      const variationsUrl = `${WC_STORE_URL}/wp-json/wc/v3/products/${productId}/variations?per_page=100`;
      const variationsResponse = await fetch(variationsUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (variationsResponse.ok) {
        const variations = await variationsResponse.json();
        result.variationCount = variations.length;
        result.variations = variations.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          attributes: v.attributes.map((attr: any) => `${attr.name}: ${attr.option}`).join(', '),
          weight: v.weight || 'N/A',
          price: v.price
        }));
      }
    }

    // 统计重量信息
    const weights: string[] = [];
    if (product.weight) weights.push(product.weight);
    result.variations.forEach((v: any) => {
      if (v.weight && v.weight !== 'N/A') weights.push(v.weight);
    });

    result.summary = {
      totalWeightsFound: weights.length,
      uniqueWeights: [...new Set(weights)],
      allHaveWeight: product.type === 'simple'
        ? !!product.weight
        : result.variations.every((v: any) => v.weight && v.weight !== 'N/A')
    };

    return new Response(
      JSON.stringify(result, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test product weight error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
