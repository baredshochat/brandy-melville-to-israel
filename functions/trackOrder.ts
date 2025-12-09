import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Public endpoint for tracking orders by order number
 * No authentication required - accessible to all users
 * Returns limited, safe order information for tracking purposes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request
    const { order_number } = await req.json();
    
    // Validate input
    if (!order_number || typeof order_number !== 'string') {
      return Response.json({
        success: false,
        error: 'מספר הזמנה לא תקין'
      }, { status: 400 });
    }

    // Normalize order number
    const normalizedOrderNumber = order_number.trim().toUpperCase();

    // Search for order using service role (bypasses user authentication)
    const orders = await base44.asServiceRole.entities.Order.filter({
      order_number: normalizedOrderNumber
    });

    // Check if order exists
    if (!orders || orders.length === 0) {
      return Response.json({
        success: false,
        error: 'מספר ההזמנה לא נמצא במערכת'
      }, { status: 404 });
    }

    const order = orders[0];

    // Validate order has required data
    if (!order.items || order.items.length === 0) {
      return Response.json({
        success: false,
        error: 'ההזמנה נמצאה אך היא ריקה - אנא פני לתמיכה'
      }, { status: 400 });
    }

    // Return only safe, tracking-relevant information
    // DO NOT expose sensitive data like internal_notes, actual_cost_price, etc.
    const safeOrderData = {
      order_number: order.order_number,
      site: order.site,
      status: order.status,
      payment_status: order.payment_status,
      created_date: order.created_date,
      items: order.items.map(item => ({
        product_name: item.product_name,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        item_image_url: item.item_image_url
      })),
      total_price_ils: order.total_price_ils,
      customer_name: order.customer_name // Safe to show their own name
    };

    return Response.json({
      success: true,
      order: safeOrderData
    }, { status: 200 });

  } catch (error) {
    console.error('Error tracking order:', error);
    return Response.json({
      success: false,
      error: 'שגיאה בחיפוש ההזמנה. נסי שוב בעוד כמה רגעים'
    }, { status: 500 });
  }
});