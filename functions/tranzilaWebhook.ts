import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse the webhook data from Tranzila
    const formData = await req.formData();
    const data = Object.fromEntries(formData.entries());

    console.log('Tranzila webhook received:', data);

    const { 
      Response: tranzilaResponse, 
      order_id, 
      ConfirmationCode,
      index,
      sum
    } = data;

    if (!order_id) {
      return Response.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Find the order by order number
    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: order_id });
    
    if (!orders || orders.length === 0) {
      console.error('Order not found:', order_id);
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Check Tranzila response code (000 = success)
    if (tranzilaResponse === '000') {
      // Payment successful
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_status: 'completed',
        status: 'ordered',
        internal_notes: `Payment completed. Confirmation: ${ConfirmationCode || index}. Amount: ${sum} ILS. Date: ${new Date().toISOString()}`
      });

      console.log('Payment successful for order:', order_id);
    } else {
      // Payment failed
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_status: 'failed',
        internal_notes: `Payment failed. Response code: ${tranzilaResponse}. Date: ${new Date().toISOString()}`
      });

      console.log('Payment failed for order:', order_id, 'Response:', tranzilaResponse);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Tranzila webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});