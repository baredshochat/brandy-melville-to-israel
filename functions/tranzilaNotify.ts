import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const OWNER_EMAIL = 'Baredshochat35@gmail.com';

// Helper: format money
const formatMoney = (amount, currency = 'ILS') => {
  const n = Number(amount || 0);
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
  return `${symbol}${n.toFixed(2)}`;
};

// Build confirmation email HTML for customer
function buildCustomerPaymentConfirmationEmail({ order, customerName, customerEmail, trackOrderUrl, chatUrl, totalILS }) {
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
    <title>אישור תשלום - הזמנה #${order?.order_number || ""}</title>
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

        <div style="margin:16px 0; padding:12px; background:#E8F5E9; border:1px solid #A5D6A7; border-radius:6px;">
          <p style="margin:0; font-size:14px; color:#2E7D32; font-weight:600;">
            ✓ התשלום אושר בהצלחה
          </p>
        </div>

        <div style="margin:16px 0; padding:12px; background:${accent}22; border:1px solid ${accent}; border-radius:6px;">
          <p style="margin:0; font-size:13px; color:${primary};">
            <strong>מספר מעקב:</strong> ${order?.order_number || ""}<br>
            <strong>זמן אספקה משוער:</strong> ${deliveryTimeText}
          </p>
        </div>

        <div style="margin:18px 0; border:1px solid ${border}; padding:16px; border-radius:6px; background:#fff;">
          <h3 style="margin:0 0 12px 0; font-size:14px; color:${primary};">הפריטים שהזמנת:</h3>
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

// Build payment failed email for customer
function buildCustomerPaymentFailedEmail({ customerName, orderNumber }) {
  const brandName = "Brandy Melville to Israel";
  const primary = "#443E41";
  const accent = "#FFCAD4";
  const border = "#FCE8EF";
  const muted = "#9CA3AF";
  const bg = "#FFFDFC";

  return `
  <!doctype html>
  <html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>התשלום נכשל - הזמנה #${orderNumber || ""}</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body dir="rtl" style="margin:0; background:${bg}; font-family:Assistant, Arial, Helvetica, sans-serif;">
    <div style="max-width:640px; margin:24px auto; background:#fff; border:1px solid ${border}; border-radius:8px; overflow:hidden;">
      <div style="padding:16px 20px; border-bottom:1px solid ${border}; background:#fff;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:32px; height:32px; background:${accent}; color:#fff; display:flex; align-items:center; justify-content:center; border-radius:50%;">💖</div>
          <div>
            <div style="font-size:16px; font-weight:700; color:${primary};">${brandName}</div>
          </div>
        </div>
      </div>

      <div style="padding:24px 20px;">
        <h1 style="margin:0 0 8px 0; font-size:20px; color:${primary};">שלום ${customerName || 'יקרה'},</h1>
        
        <div style="margin:16px 0; padding:12px; background:#FFEBEE; border:1px solid #EF9A9A; border-radius:6px;">
          <p style="margin:0; font-size:14px; color:#C62828; font-weight:600;">
            ✗ לצערנו, התשלום לא עבר בהצלחה
          </p>
        </div>

        <p style="margin:16px 0; font-size:14px; color:${primary}; line-height:1.6;">
          ייתכן שהייתה בעיה עם פרטי כרטיס האשראי או שהייתה בעיה טכנית זמנית.
          <br><br>
          מה אפשר לעשות?
        </p>

        <ul style="margin:16px 0; padding-right:20px; font-size:14px; color:${primary}; line-height:1.8;">
          <li>לנסות שוב עם אותו כרטיס</li>
          <li>לנסות כרטיס אשראי אחר</li>
          <li>לפנות לבנק לבדיקה</li>
          <li>ליצור איתנו קשר לעזרה</li>
        </ul>

        <div style="margin-top:4px; padding:12px; background:${accent}22; border:1px solid ${accent}; border-radius:6px; text-align:center;">
          <span style="font-size:13px; color:${primary};">
            אנחנו כאן בשבילך! אם יש שאלות, אל תהססי לפנות אלינו 💖
          </span>
        </div>
      </div>

      <div style="padding:16px 20px; border-top:1px solid ${border}; background:#fff; color:${muted}; font-size:12px;">
        צוות ${brandName}
      </div>
    </div>
  </body>
  </html>`;
}

// Build notification email for owner
function buildOwnerNotificationEmail({ status, orderNumber, amount, customerName, customerEmail, customerPhone, confirmNum }) {
  const isApproved = status === 'approved';
  const statusText = isApproved ? '✓ תשלום אושר' : '✗ תשלום נכשל';
  const statusColor = isApproved ? '#2E7D32' : '#C62828';
  const statusBg = isApproved ? '#E8F5E9' : '#FFEBEE';

  return `
  <!doctype html>
  <html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8">
    <title>${statusText} - הזמנה #${orderNumber}</title>
  </head>
  <body dir="rtl" style="margin:0; background:#f5f5f5; font-family:Arial, sans-serif; padding:20px;">
    <div style="max-width:500px; margin:0 auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
      <div style="padding:16px 20px; background:${statusBg}; border-bottom:1px solid #ddd;">
        <h1 style="margin:0; font-size:18px; color:${statusColor};">${statusText}</h1>
      </div>
      <div style="padding:20px;">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0; font-weight:bold; color:#666;">מספר הזמנה:</td>
            <td style="padding:8px 0; color:#333;">${orderNumber || 'לא ידוע'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; font-weight:bold; color:#666;">סכום:</td>
            <td style="padding:8px 0; color:#333; font-size:18px; font-weight:bold;">₪${amount || '0'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; font-weight:bold; color:#666;">שם לקוחה:</td>
            <td style="padding:8px 0; color:#333;">${customerName || 'לא ידוע'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; font-weight:bold; color:#666;">אימייל:</td>
            <td style="padding:8px 0; color:#333;">${customerEmail || 'לא ידוע'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; font-weight:bold; color:#666;">טלפון:</td>
            <td style="padding:8px 0; color:#333;">${customerPhone || 'לא ידוע'}</td>
          </tr>
          ${confirmNum ? `
          <tr>
            <td style="padding:8px 0; font-weight:bold; color:#666;">מספר אישור:</td>
            <td style="padding:8px 0; color:#333;">${confirmNum}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      <div style="padding:12px 20px; background:#f9f9f9; border-top:1px solid #eee; font-size:12px; color:#999;">
        התקבל ב-${new Date().toLocaleString('he-IL')}
      </div>
    </div>
  </body>
  </html>`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Parse JSON from your Google Cloud Run server
    const data = await req.json();
    
    console.log('Webhook received from server:', JSON.stringify(data));

    // Extract data from webhook
    const status = data.status; // 'approved' or 'declined'
    const amount = data.amount;
    const orderNumber = data.order_id;
    const confirmNum = data.confirm_num;
    const cardMask = data.card_mask;
    const customerName = data.customer_name;
    const customerEmail = data.email;
    const customerPhone = data.phone;
    const rawPayload = data.raw;

    // Save webhook log
    try {
      await base44.asServiceRole.entities.WebhookLog.create({
        source: 'Tranzila',
        event_type: 'payment_notification',
        status: status || 'unknown',
        order_id: orderNumber || '',
        amount: amount || '',
        customer_name: customerName || '',
        customer_email: customerEmail || '',
        customer_phone: customerPhone || '',
        raw_payload: JSON.stringify(rawPayload || data)
      });
      console.log('Webhook logged');
    } catch (logError) {
      console.error('Failed to log webhook:', logError.message);
    }

    // Find the order
    let order = null;
    if (orderNumber) {
      try {
        const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
        if (orders && orders.length > 0) {
          order = orders[0];
          console.log('Found order:', order.id);
        }
      } catch (e) {
        console.error('Error finding order:', e.message);
      }
    }

    const appId = Deno.env.get('BASE44_APP_ID');
    const baseUrl = `https://app.base44.com/${appId}/`;
    const trackOrderUrl = `${baseUrl}TrackOrder?orderNumber=${orderNumber}`;
    const chatUrl = `${baseUrl}Chat`;

    if (status === 'approved') {
      // Payment approved
      console.log('Payment approved for order:', orderNumber);

      // Update order status
      if (order) {
        try {
          const freeShippingUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          await base44.asServiceRole.entities.Order.update(order.id, {
            payment_status: 'completed',
            status: 'pending',
            email_sent_to_customer: true,
            free_shipping_until: freeShippingUntil
          });
          console.log('Order updated to completed and pending with free shipping until:', freeShippingUntil);
          
          // Schedule free shipping reminder email after 25 minutes
          setTimeout(async () => {
            try {
              await base44.asServiceRole.functions.invoke('sendFreeShippingReminder', { order_id: order.id });
              console.log(`Free shipping reminder scheduled for order ${order.id}`);
            } catch (scheduleError) {
              console.error(`Failed to schedule free shipping reminder:`, scheduleError);
            }
          }, 25 * 60 * 1000); // 25 minutes
          
          // Update local stock quantities for local items
          const items = order.items || [];
          const localItems = items.filter(item => item.site === 'local' || item.product_type === 'local');
          console.log('Local items found:', localItems.length);
          
          if (localItems.length > 0) {
            for (const item of localItems) {
              console.log('Processing item:', item.product_name, 'SKU:', item.product_sku);
              
              // Find the stock item by matching SKU
              const stockItems = await base44.asServiceRole.entities.LocalStockItem.filter({
                internal_sku: item.product_sku || item.internal_sku
              });
              
              console.log('Stock items found:', stockItems.length);
              
              if (stockItems && stockItems.length > 0) {
                const stockItem = stockItems[0];
                const newQuantity = Math.max(0, stockItem.quantity_available - item.quantity);
                console.log('Updating stock:', stockItem.id, 'from', stockItem.quantity_available, 'to', newQuantity);
                
                await base44.asServiceRole.entities.LocalStockItem.update(stockItem.id, {
                  quantity_available: newQuantity
                });
                
                console.log('Stock updated successfully for:', item.product_name);
              } else {
                console.log('ERROR: No stock item found for SKU:', item.product_sku || item.internal_sku);
              }
            }
          } else {
            console.log('No local items in order');
          }
        } catch (e) {
          console.error('Error updating order:', e.message);
        }
      }

      // Send email to customer
      if (customerEmail) {
        try {
          const customerEmailHtml = buildCustomerPaymentConfirmationEmail({
            order: order || { order_number: orderNumber, items: [] },
            customerName,
            customerEmail,
            trackOrderUrl,
            chatUrl,
            totalILS: amount
          });

          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: "Brandy Melville to Israel",
            to: customerEmail,
            subject: `אישור תשלום - הזמנה #${orderNumber} • ₪${amount}`,
            body: customerEmailHtml
          });
          console.log('Customer email sent');
        } catch (e) {
          console.error('Error sending customer email:', e.message);
        }
      }

      // Send email to owner
      try {
        const ownerEmailHtml = buildOwnerNotificationEmail({
          status: 'approved',
          orderNumber,
          amount,
          customerName,
          customerEmail,
          customerPhone,
          confirmNum
        });

        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: "Brandy Melville to Israel",
          to: OWNER_EMAIL,
          subject: `✓ תשלום אושר - הזמנה #${orderNumber} • ₪${amount}`,
          body: ownerEmailHtml
        });
        console.log('Owner email sent');
      } catch (e) {
        console.error('Error sending owner email:', e.message);
      }

    } else if (status === 'declined') {
      // Payment declined
      console.log('Payment declined for order:', orderNumber);

      // Update order status
      if (order) {
        try {
          await base44.asServiceRole.entities.Order.update(order.id, {
            payment_status: 'failed'
          });
          console.log('Order updated to failed');
        } catch (e) {
          console.error('Error updating order:', e.message);
        }
      }

      // Send email to customer
      if (customerEmail) {
        try {
          const customerEmailHtml = buildCustomerPaymentFailedEmail({
            customerName,
            orderNumber
          });

          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: "Brandy Melville to Israel",
            to: customerEmail,
            subject: `התשלום נכשל - הזמנה #${orderNumber}`,
            body: customerEmailHtml
          });
          console.log('Customer decline email sent');
        } catch (e) {
          console.error('Error sending customer decline email:', e.message);
        }
      }

      // Send email to owner
      try {
        const ownerEmailHtml = buildOwnerNotificationEmail({
          status: 'declined',
          orderNumber,
          amount,
          customerName,
          customerEmail,
          customerPhone,
          confirmNum
        });

        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: "Brandy Melville to Israel",
          to: OWNER_EMAIL,
          subject: `✗ תשלום נכשל - הזמנה #${orderNumber}`,
          body: ownerEmailHtml
        });
        console.log('Owner decline email sent');
      } catch (e) {
        console.error('Error sending owner decline email:', e.message);
      }
    }

    return Response.json({ success: true, message: 'Webhook processed' }, { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 200 });
  }
});