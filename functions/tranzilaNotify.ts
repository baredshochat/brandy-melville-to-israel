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
  // Always return 200 OK immediately for Tranzila
  // Process in background-like manner but still sync
  
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
      // Try to read body as text and parse as URL params
      const text = await req.text();
      if (text) {
        const params = new URLSearchParams(text);
        for (const [key, value] of params) {
          data[key] = value;
        }
      }
      // Also check URL params
      const url = new URL(req.url);
      for (const [key, value] of url.searchParams) {
        data[key] = value;
      }
    }

    console.log('Tranzila notification received:', JSON.stringify(data));

    // Check if payment was successful
    const response = data.Response || data.response;
    if (response !== '000') {
      console.log('Payment not successful, Response:', response);
      return new Response('OK', { status: 200 });
    }

    // Extract order number from remarks field (where we put it)
    // Format in remarks: "הזמנה BM1764691543798"
    const remarks = decodeURIComponent(data.remarks || data.Remarks || '');
    const pdesc = decodeURIComponent(data.pdesc || data.Pdesc || '');
    
    console.log('Decoded remarks:', remarks);
    console.log('Decoded pdesc:', pdesc);
    
    // Try to find order number
    let orderNumber = null;
    
    // Check remarks first (where we store the order number)
    let match = remarks.match(/BM\d+/);
    if (match) {
      orderNumber = match[0];
    }
    
    // Check pdesc as fallback
    if (!orderNumber) {
      match = pdesc.match(/BM\d+/);
      if (match) {
        orderNumber = match[0];
      }
    }
    
    if (!orderNumber) {
      console.log('No order number found');
      return new Response('OK', { status: 200 });
    }
    
    console.log('Found order number:', orderNumber);

    // Use Base44 REST API directly
    const appId = Deno.env.get('BASE44_APP_ID');
    const apiBase = 'https://app.base44.com/api/airtable';
    
    // Fetch order
    const ordersResponse = await fetch(`${apiBase}/${appId}/Order?filterByFormula={order_number}="${orderNumber}"`, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!ordersResponse.ok) {
      console.log('Failed to fetch order:', ordersResponse.status);
      return new Response('OK', { status: 200 });
    }
    
    const ordersData = await ordersResponse.json();
    const records = ordersData.records || [];
    
    if (records.length === 0) {
      console.log('Order not found:', orderNumber);
      return new Response('OK', { status: 200 });
    }
    
    const order = { id: records[0].id, ...records[0].fields };
    console.log('Found order:', order.id);

    // Check if email already sent
    if (order.email_sent_to_customer) {
      console.log('Email already sent for this order');
      return new Response('OK', { status: 200 });
    }

    // Update order status
    await fetch(`${apiBase}/${appId}/Order/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          payment_status: 'completed',
          email_sent_to_customer: true
        }
      })
    });
    console.log('Order updated');

    // Send email via Base44 integration API
    if (order.customer_email) {
      const baseUrl = `https://app.base44.com/${appId}/`;
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

      // Call the SendEmail integration
      const emailResponse = await fetch(`https://app.base44.com/api/integrations/${appId}/Core/SendEmail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_name: "Brandy Melville to Israel",
          to: order.customer_email,
          subject: `אישור תשלום - הזמנה #${orderNumber} • ${formatMoney(order.total_price_ils, 'ILS')}`,
          body: emailHtml
        })
      });
      
      console.log('Email API response:', emailResponse.status);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error:', error.message);
    // Always return 200 to Tranzila so they don't retry
    return new Response('OK', { status: 200 });
  }
});