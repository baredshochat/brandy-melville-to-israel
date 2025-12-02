import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper: format money
const formatMoney = (amount, currency = 'ILS') => {
  const n = Number(amount || 0);
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
  return `${symbol}${n.toFixed(2)}`;
};

// Build confirmation email HTML
function buildOrderConfirmationEmailHTML({ order, customerName, customerEmail, trackOrderUrl, chatUrl, totalILS }) {
  const brandName = "Brandy Melville to Israel";
  const primary = "#443E41";
  const accent = "#FFCAD4";
  const border = "#FCE8EF";
  const muted = "#9CA3AF";
  const bg = "#FFFDFC";

  const isLocalOrder = order?.site === 'local';
  const items = order?.items || [];

  const itemsRows = items.map((item) => {
    const options = [item.color, item.size].filter(Boolean).join(" • ");
    return `
      <tr>
        <td style="padding:10px 0; font-size:14px; color:${primary};">${(item.product_name || '').replace(/</g,'&lt;')}</td>
        <td style="padding:10px 0; font-size:12px; color:${muted}; text-align:right; white-space:nowrap;">${options || ''}</td>
        <td style="padding:10px 0; font-size:14px; color:${primary}; text-align:left; white-space:nowrap;">× ${item.quantity || 1}</td>
      </tr>
      <tr><td colspan="3" style="border-bottom:1px solid ${border}; height:1px;"></td></tr>
    `;
  }).join("");

  const totalILSStr = formatMoney(totalILS, 'ILS');
  const deliveryTimeText = isLocalOrder ? '3-7 ימי עסקים' : '3-4 שבועות';
  const pricingExplanation = isLocalOrder
    ? 'המחיר כולל את הפריטים + משלוח עד הבית. ללא עלויות נוספות.'
    : 'המחיר ששילמת כולל כבר את כל העלויות הנלוות – מסים, מכס ועמלות ייבוא – אין הפתעות.';

  return `
  <!doctype html>
  <html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>אישור הזמנה #${order?.order_number || ""}</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body dir="rtl" style="margin:0; background:${bg}; font-family:Assistant, Arial, Helvetica, sans-serif;">
    <div style="max-width:640px; margin:24px auto; background:#fff; border:1px solid ${border}; border-radius:8px; overflow:hidden;">
      <div style="padding:16px 20px; border-bottom:1px solid ${border}; display:flex; align-items:center; justify-content:space-between; background:#fff;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:32px; height:32px; background:${accent}; color:#fff; display:flex; align-items:center; justify-content:center; border-radius:50%;">💖</div>
          <div>
            <div style="font-size:16px; font-weight:700; color:${primary};">${brandName}</div>
            <div style="font-size:12px; color:${muted};">${isLocalOrder ? 'מלאי מקומי - אספקה מהירה' : 'הדרך הקלה להזמין ברנדי מחו״ל'}</div>
          </div>
        </div>
        <div style="font-size:12px; color:${muted};">מס׳ הזמנה: <strong style="color:${primary}">${order?.order_number || ""}</strong></div>
      </div>

      <div style="padding:24px 20px;">
        <h1 style="margin:0 0 8px 0; font-size:20px; color:${primary};">שלום ${customerName || 'יקרה'},</h1>
        <p style="margin:0 0 12px 0; font-size:14px; color:${primary}; line-height:1.6;">
          התשלום התקבל בהצלחה! 🎉 ההזמנה שלך אושרה ואנחנו כבר מתרגשות להכין ולשלוח אותה אלייך.
          <br><strong style="color:${primary}">חשוב לדעת:</strong> ${pricingExplanation}
        </p>

        <div style="margin:16px 0; padding:12px; background:${accent}22; border:1px solid ${accent}; border-radius:6px;">
          <p style="margin:0; font-size:13px; color:${primary};">
            <strong>זמן אספקה משוער:</strong> ${deliveryTimeText}
          </p>
        </div>

        <div style="margin:18px 0; border:1px solid ${border}; padding:16px; border-radius:6px; background:#fff;">
          <table style="width:100%; border-collapse:collapse;">
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; gap:10px; margin-top:14px; padding:12px; background:${bg}; border:1px solid ${border}; border-radius:6px;">
            <div style="font-size:15px; color:${primary}; font-weight:700;">סה״כ שולם</div>
            <div style="font-size:18px; color:${primary}; font-weight:800;">${totalILSStr}</div>
          </div>
        </div>

        <div style="margin:20px 0; text-align:center;">
          <a href="${trackOrderUrl}" style="display:inline-block; background:${primary}; color:#fff; text-decoration:none; padding:10px 16px; font-size:14px; font-weight:700; margin:4px 6px; border-radius:6px;">
            עקבי אחרי ההזמנה שלך
          </a>
          <a href="${chatUrl}" style="display:inline-block; background:#fff; color:${primary}; border:2px solid ${accent}; text-decoration:none; padding:10px 16px; font-size:14px; font-weight:700; margin:4px 6px; border-radius:6px;">
            צ׳אט עם הנציגה הווירטואלית
          </a>
        </div>

        <div style="margin-top:4px; padding:12px; background:${accent}22; border:1px solid ${accent}; border-radius:6px; text-align:center;">
          <span style="font-size:13px; color:${primary};">
            תודה שבחרת בנו! אנחנו על זה ומטפלות בכל אהבה ✨ אם עולה לך שאלה בדרך, אנחנו כאן בשבילך תמיד 💖
          </span>
        </div>

        <p style="margin:16px 0 0 0; font-size:12px; color:${muted}; text-align:center;">
          אישור זה נשלח לכתובת <span style="color:${primary}; font-weight:600;">${customerEmail || ''}</span>.
        </p>
      </div>

      <div style="padding:16px 20px; border-top:1px solid ${border}; background:#fff; color:${primary}; font-size:12px;">
        <div style="margin-bottom:6px;">
          <strong>בלי הפתעות:</strong> ${pricingExplanation} אין תשלומים נוספים לאחר ההזמנה.
        </div>
        <div style="color:${muted};">צוות ${brandName}</div>
      </div>
    </div>
  </body>
  </html>`;
}

Deno.serve(async (req) => {
  try {
    // Parse form data from Tranzila notification
    const contentType = req.headers.get('content-type') || '';
    let data = {};
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      for (const [key, value] of params) {
        data[key] = value;
      }
    } else if (contentType.includes('application/json')) {
      data = await req.json();
    } else {
      // Try URL params
      const url = new URL(req.url);
      for (const [key, value] of url.searchParams) {
        data[key] = value;
      }
    }

    console.log('Tranzila notification received:', data);

    // Check if payment was successful
    const response = data.Response || data.response;
    if (response !== '000') {
      console.log('Payment not successful, Response:', response);
      return Response.json({ status: 'ignored', reason: 'payment not successful' });
    }

    // Extract order number from pdesc, remarks, or json_purchase_data
    const pdesc = data.pdesc || data.Pdesc || '';
    const remarks = data.remarks || data.Remarks || '';
    const jsonPurchaseData = data.json_purchase_data || '';
    
    // Try to find order number in various fields
    let orderNumber = null;
    
    // Check pdesc first (most common)
    let match = pdesc.match(/BM\d+/);
    if (match) {
      orderNumber = match[0];
    }
    
    // Check remarks
    if (!orderNumber) {
      match = remarks.match(/BM\d+/);
      if (match) {
        orderNumber = match[0];
      }
    }
    
    // Check json_purchase_data
    if (!orderNumber && jsonPurchaseData) {
      try {
        const parsed = JSON.parse(jsonPurchaseData);
        if (parsed.order_number) {
          orderNumber = parsed.order_number;
        }
      } catch (e) {
        // Not JSON, try regex
        match = jsonPurchaseData.match(/BM\d+/);
        if (match) {
          orderNumber = match[0];
        }
      }
    }
    
    // Log all received data for debugging
    console.log('Looking for order in - pdesc:', pdesc, 'remarks:', remarks, 'json_purchase_data:', jsonPurchaseData);
    
    if (!orderNumber) {
      console.log('No order number found in any field');
      return Response.json({ status: 'error', reason: 'no order number', receivedData: data });
    }
    console.log('Processing order:', orderNumber);

    // Initialize Base44 client from request - use service role for webhook operations
    const base44 = createClientFromRequest(req);

    // Find the order using service role (admin access)
    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    
    if (!orders || orders.length === 0) {
      console.log('Order not found:', orderNumber);
      return Response.json({ status: 'error', reason: 'order not found' });
    }

    const order = orders[0];

    // Check if email was already sent
    if (order.email_sent_to_customer) {
      console.log('Email already sent for order:', orderNumber);
      return Response.json({ status: 'already_sent' });
    }

    // Update order payment status
    await base44.asServiceRole.entities.Order.update(order.id, { 
      payment_status: 'completed',
      email_sent_to_customer: true
    });

    // Build email
    const baseUrl = 'https://app.base44.com/brandy-melville-order-il/'; // Replace with actual app URL
    const trackOrderUrl = `${baseUrl}TrackOrder?orderNumber=${orderNumber}`;
    const chatUrl = `${baseUrl}Chat`;

    const emailHtml = buildOrderConfirmationEmailHTML({
      order,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      trackOrderUrl,
      chatUrl,
      totalILS: order.total_price_ils
    });

    // Send email using Base44 integrations
    if (order.customer_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: "Brandy Melville to Israel",
        to: order.customer_email,
        subject: `אישור תשלום - הזמנה #${orderNumber} • ${formatMoney(order.total_price_ils, 'ILS')}`,
        body: emailHtml
      });
      console.log('Email sent to:', order.customer_email);
    }

    return Response.json({ status: 'success', orderNumber });
  } catch (error) {
    console.error('Error processing Tranzila notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});