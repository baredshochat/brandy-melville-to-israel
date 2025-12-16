import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id } = await req.json();

    if (!order_id) {
      return Response.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(order_id);

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const customerEmail = order.customer_email;
    const customerName = order.customer_name;
    const orderNumber = order.order_number;
    const freeShippingUntil = order.free_shipping_until;

    if (!customerEmail || !freeShippingUntil) {
      return Response.json({ error: 'Order details missing for reminder' }, { status: 400 });
    }

    const freeShippingDate = new Date(freeShippingUntil);
    const now = new Date();

    if (freeShippingDate <= now) {
      return Response.json({ success: false, message: 'Free shipping period has expired' }, { status: 200 });
    }

    const appId = Deno.env.get('BASE44_APP_ID');
    const baseUrl = `https://app.base44.com/${appId}/`;
    const addItemsUrl = `${baseUrl}Home?parentOrderId=${order_id}`;

    const primary = "#443E41";
    const accent = "#FFCAD4";
    const border = "#FCE8EF";
    const muted = "#9CA3AF";
    const bg = "#FFFDFC";

    const emailBody = `
      <!doctype html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>הזדמנות אחרונה למשלוח חינם!</title>
        <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body dir="rtl" style="margin:0; background:${bg}; font-family:Assistant, Arial, Helvetica, sans-serif;">
        <div style="max-width:640px; margin:24px auto; background:#fff; border:1px solid ${border}; border-radius:8px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
          <div style="padding:16px 20px; border-bottom:1px solid ${border}; background:#fff;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:32px; height:32px; background:${accent}; color:#fff; display:flex; align-items:center; justify-content:center; border-radius:50%;">💖</div>
              <div>
                <div style="font-size:16px; font-weight:700; color:${primary};">Brandy Melville to Israel</div>
                <div style="font-size:12px; color:${muted};">הדרך הקלה להזמין ברנדי מחו״ל</div>
              </div>
            </div>
          </div>

          <div style="padding:24px 20px;">
            <h1 style="margin:0 0 8px 0; font-size:22px; color:${primary};">היי ${customerName || 'יקירה'} ✨</h1>
            
            <p style="margin:0 0 16px 0; font-size:15px; color:${primary}; line-height:1.7;">
              ההזמנה שלך <strong>#${orderNumber}</strong> אושרה ונמצאת בטיפול! 🎉
            </p>

            <div style="margin:20px 0; padding:20px; background:linear-gradient(135deg, #FFF5F7 0%, #FFE8EC 100%); border:2px solid ${accent}; border-radius:12px; text-align:center;">
              <div style="font-size:28px; margin-bottom:8px;">🎁</div>
              <h2 style="margin:0 0 8px 0; font-size:18px; color:${primary}; font-weight:700;">
                משלוח חינם ל-24 שעות!
              </h2>
              <p style="margin:0; font-size:14px; color:${primary}; line-height:1.6;">
                יש לך הזדמנות מיוחדת להוסיף עוד פריטים להזמנה הקיימת שלך<br>
                <strong>ללא עלות משלוח נוספת!</strong>
              </p>
            </div>

            <div style="margin:20px 0; padding:14px; background:#FFF9E6; border:1px solid #FFE082; border-radius:8px; text-align:center;">
              <p style="margin:0; font-size:14px; color:#F57C00; font-weight:600;">
                ⏰ נותרו לך פחות מ-24 שעות!
              </p>
              <p style="margin:6px 0 0 0; font-size:12px; color:#666;">
                ההצעה פגה ב-${freeShippingDate.toLocaleString('he-IL', { 
                  day: 'numeric', 
                  month: 'long', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>

            <div style="margin:24px 0; padding:16px; background:${bg}; border-right:4px solid ${accent};">
              <h3 style="margin:0 0 8px 0; font-size:15px; color:${primary}; font-weight:600;">איך זה עובד?</h3>
              <ol style="margin:8px 0 0 0; padding-right:20px; font-size:14px; color:${primary}; line-height:1.8;">
                <li>לחצי על הכפתור למטה</li>
                <li>בחרי פריטים נוספים שאת אוהבת</li>
                <li>הוסיפי לסל וראי שהמשלוח <strong>חינם!</strong></li>
                <li>הפריטים יצורפו להזמנה #${orderNumber}</li>
              </ol>
            </div>

            <div style="margin:28px 0; text-align:center;">
              <a href="${addItemsUrl}" style="display:inline-block; background:${primary}; color:#fff; text-decoration:none; padding:14px 32px; font-size:16px; font-weight:700; border-radius:8px; box-shadow:0 4px 12px rgba(68,62,65,0.25); transition:all 0.3s;">
                🛍️ הוסיפי פריטים עם משלוח חינם
              </a>
            </div>

            <div style="margin-top:24px; padding:14px; background:${accent}22; border:1px solid ${accent}; border-radius:8px; text-align:center;">
              <p style="margin:0; font-size:13px; color:${primary}; line-height:1.6;">
                <strong>שימי לב:</strong> ההצעה תקפה רק ל-24 שעות מרגע אישור ההזמנה המקורית.<br>
                לאחר מכן, עלות המשלוח תחזור למחיר הרגיל.
              </p>
            </div>

            <p style="margin:20px 0 0 0; font-size:12px; color:${muted}; text-align:center; line-height:1.5;">
              תודה שבחרת בנו! אנחנו על זה ומטפלות בכל אהבה 💖<br>
              <span style="color:${primary}; font-weight:600;">${customerEmail}</span>
            </p>
          </div>

          <div style="padding:16px 20px; border-top:1px solid ${border}; background:#fff; color:${muted}; font-size:12px; text-align:center;">
            צוות Brandy Melville to Israel
          </div>
        </div>
      </body>
      </html>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Brandy Melville to Israel',
      to: customerEmail,
      subject: `🎁 הזדמנות אחרונה: הוסיפי פריטים להזמנה #${orderNumber} עם משלוח חינם!`,
      body: emailBody
    });

    return Response.json({ success: true, message: 'Free shipping reminder sent' });
  } catch (error) {
    console.error('sendFreeShippingReminder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});