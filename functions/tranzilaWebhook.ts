import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse the webhook data from Tranzila (can be form data or query params)
    let data = {};
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      data = Object.fromEntries(formData.entries());
    } else {
      // Try URL params
      const url = new URL(req.url);
      data = Object.fromEntries(url.searchParams.entries());
    }

    console.log('Tranzila webhook received:', data);

    // Tranzila uses 'myid' for order reference
    const orderNumber = data.myid || data.order_id;
    const tranzilaResponse = data.Response;
    const confirmationCode = data.ConfirmationCode || data.index;
    const sum = data.sum;

    if (!orderNumber) {
      console.error('Missing order identifier in webhook data:', data);
      return Response.json({ error: 'Missing order identifier' }, { status: 400 });
    }

    // Find the order by order number
    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    
    if (!orders || orders.length === 0) {
      console.error('Order not found:', orderNumber);
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];

    // Check Tranzila response code (000 = success)
    if (tranzilaResponse === '000') {
      // Payment successful - update order and send confirmation email
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_status: 'completed',
        status: 'ordered',
        email_sent_to_customer: true,
        internal_notes: `Payment completed. Confirmation: ${confirmationCode}. Amount: ${sum} ILS. Date: ${new Date().toISOString()}`
      });

      // Send confirmation email
      const customerEmail = order.customer_email;
      if (customerEmail) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: "Brandy Melville to Israel",
            to: customerEmail,
            subject: `אישור הזמנה #${order.order_number} - התשלום התקבל בהצלחה!`,
            body: buildConfirmationEmail(order)
          });
          console.log('Confirmation email sent to:', customerEmail);
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
      }

      console.log('Payment successful for order:', orderNumber);
    } else {
      // Payment failed
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_status: 'failed',
        internal_notes: `Payment failed. Response code: ${tranzilaResponse}. Date: ${new Date().toISOString()}`
      });

      console.log('Payment failed for order:', orderNumber, 'Response:', tranzilaResponse);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('Tranzila webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildConfirmationEmail(order) {
  const items = order.items || [];
  const itemsList = items.map(item => 
    `<li style="margin-bottom:8px;">${item.product_name || 'פריט'} ${item.color ? `(${item.color})` : ''} ${item.size ? `- ${item.size}` : ''} × ${item.quantity || 1}</li>`
  ).join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#fafafa;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #eee;padding:30px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#333;font-size:24px;margin:0;">התשלום התקבל בהצלחה! 💖</h1>
    </div>
    
    <p style="font-size:16px;color:#333;">שלום ${order.customer_name || 'יקרה'},</p>
    
    <p style="font-size:15px;color:#555;line-height:1.6;">
      תודה על ההזמנה שלך! קיבלנו את התשלום ואנחנו מתחילים לטפל בהזמנה.
    </p>
    
    <div style="background:#f8f8f8;padding:16px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:bold;">מספר הזמנה: ${order.order_number}</p>
      <p style="margin:0;font-weight:bold;">סכום ששולם: ₪${Math.round(order.total_price_ils || 0)}</p>
    </div>
    
    <div style="margin:20px 0;">
      <h3 style="color:#333;font-size:16px;">הפריטים שהזמנת:</h3>
      <ul style="padding-right:20px;color:#555;">${itemsList}</ul>
    </div>
    
    <div style="background:#fff0f5;border:1px solid #ffccd5;padding:16px;margin:20px 0;text-align:center;">
      <p style="margin:0;color:#333;">
        תוכלי לעקוב אחרי ההזמנה בכל עת באתר שלנו
      </p>
    </div>
    
    <p style="font-size:14px;color:#888;text-align:center;margin-top:30px;">
      צוות Brandy Melville to Israel 💕
    </p>
  </div>
</body>
</html>`;
}