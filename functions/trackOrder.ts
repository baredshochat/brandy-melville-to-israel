import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_number } = await req.json();

    if (!order_number) {
      return Response.json({
        success: false,
        error: 'מספר הזמנה חסר'
      });
    }

    // Search for the order using service role (no auth required)
    const orders = await base44.asServiceRole.entities.Order.filter({
      order_number: order_number.trim()
    });

    if (!orders || orders.length === 0) {
      return Response.json({
        success: false,
        error: 'מספר ההזמנה לא נמצא במערכת'
      });
    }

    const order = orders[0];

    return Response.json({
      success: true,
      order: order
    });

  } catch (error) {
    console.error('Track order error:', error);
    return Response.json({
      success: false,
      error: 'שגיאה בחיפוש ההזמנה'
    }, { status: 500 });
  }
});