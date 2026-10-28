import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { orderId, customerId } = await request.json();

    if (!orderId || !customerId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Order ID and Customer ID are required',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // WooCommerce API 配置
    const WC_URL = import.meta.env.WC_STORE_URL || import.meta.env.WC_URL;
    const WC_KEY = import.meta.env.WC_CONSUMER_KEY;
    const WC_SECRET = import.meta.env.WC_CONSUMER_SECRET;

    if (!WC_URL || !WC_KEY || !WC_SECRET) {
      throw new Error('WooCommerce API credentials not configured');
    }

    // 更新订单的 customer_id
    const updateUrl = `${WC_URL}/wp-json/wc/v3/orders/${orderId}`;
    const auth = btoa(`${WC_KEY}:${WC_SECRET}`);

    console.log(`Updating order ${orderId} with customer_id ${customerId}`);

    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer_id: parseInt(customerId)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WooCommerce API error:', response.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to update order',
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatedOrder = await response.json();

    console.log(`Order ${orderId} updated successfully. Customer ID: ${updatedOrder.customer_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order updated successfully',
        order: {
          id: updatedOrder.id,
          customer_id: updatedOrder.customer_id,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Update order customer error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
