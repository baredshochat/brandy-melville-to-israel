import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { item_id, notification_id } = await req.json();
    
    if (!item_id) {
      return Response.json({ error: 'item_id is required' }, { status: 400 });
    }

    // Get the item
    const items = await base44.asServiceRole.entities.LocalStockItem.filter({ id: item_id });
    const item = items[0];
    
    if (!item) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    // Get all notifications for this item that haven't been sent yet
    let notifications;
    if (notification_id) {
      // Send to specific customer only
      const singleNotif = await base44.asServiceRole.entities.BackInStockNotification.filter({
        id: notification_id,
        local_stock_item_id: item_id
      });
      notifications = singleNotif;
    } else {
      // Send to all waiting customers
      notifications = await base44.asServiceRole.entities.BackInStockNotification.filter({
        local_stock_item_id: item_id,
        notified: false
      });
    }

    if (notifications.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No pending notifications',
        sent: 0 
      });
    }

    let sentCount = 0;
    const errors = [];

    // Send email to each customer
    for (const notification of notifications) {
      try {
        const productUrl = `https://${req.headers.get('host')}/LocalStockItemDetail?id=${item.id}`;
        
        const emailHtml = `
          <!DOCTYPE html>
          <html dir="rtl" lang="he">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Assistant, Arial, sans-serif;
                direction: rtl;
                margin: 0;
                padding: 0;
                background-color: #fcfbf9;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 0;
              }
              .header {
                background: linear-gradient(135deg, #fecdd3 0%, #fda4af 100%);
                padding: 40px 20px;
                text-align: center;
              }
              .header h1 {
                color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 600;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .content {
                padding: 40px 30px;
              }
              .product-image {
                width: 100%;
                max-width: 400px;
                height: auto;
                margin: 20px auto;
                display: block;
                border-radius: 0;
              }
              .product-name {
                font-size: 24px;
                font-weight: 600;
                color: #292524;
                margin: 20px 0 10px;
                text-align: center;
              }
              .message {
                font-size: 16px;
                color: #57534e;
                line-height: 1.6;
                text-align: center;
                margin: 20px 0;
              }
              .urgency {
                background: #fef3c7;
                border-right: 4px solid #f59e0b;
                padding: 15px 20px;
                margin: 25px 0;
                border-radius: 0;
              }
              .urgency strong {
                color: #dc2626;
                font-size: 18px;
              }
              .cta-button {
                display: inline-block;
                background: #292524;
                color: white !important;
                padding: 16px 40px;
                text-decoration: none;
                font-size: 18px;
                font-weight: 600;
                margin: 30px auto;
                text-align: center;
                border-radius: 0;
                transition: background 0.3s;
              }
              .cta-button:hover {
                background: #1c1917;
              }
              .button-container {
                text-align: center;
              }
              .footer {
                background: #f5f5f4;
                padding: 30px;
                text-align: center;
                color: #78716c;
                font-size: 14px;
                border-top: 1px solid #e7e5e4;
              }
              .footer a {
                color: #78716c;
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>💖 הפריט שחיכית לו חזר!</h1>
              </div>
              
              <div class="content">
                ${notification.customer_name ? `<p class="message">היי ${notification.customer_name},</p>` : ''}
                
                <p class="message">
                  יש לנו חדשות מעולות! הפריט שביקשת להתעדכן עליו חזר למלאי:
                </p>

                ${item.image_url ? `<img src="${item.image_url}" alt="${item.product_name}" class="product-image" />` : ''}
                
                <h2 class="product-name">${item.product_name}</h2>
                
                <div class="urgency">
                  <strong>⚡ המלאי מוגבל!</strong><br/>
                  הפריט מבוקש מאוד ויכול להיגמר בקרוב. מומלץ להזדרז ולהזמין עכשיו כדי לא לפספס! 🏃‍♀️
                </div>

                <div class="button-container">
                  <a href="${productUrl}" class="cta-button">
                    👗 לצפייה והזמנה
                  </a>
                </div>

                <p class="message" style="margin-top: 40px; font-size: 14px; color: #a8a29e;">
                  את מקבלת מייל זה כי ביקשת להתעדכן כשהפריט יחזור למלאי.<br/>
                  נשמח לעזור לך בכל שאלה! 💕
                </p>
              </div>
              
              <div class="footer">
                <p style="margin: 0 0 10px 0; font-weight: 600;">Brandy Melville to Israel</p>
                <p style="margin: 0;">הדרך הקלה להזמין ברנדי 💖</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Brandy Melville to Israel',
          to: notification.customer_email,
          subject: `💖 ${item.product_name} חזר למלאי!`,
          body: emailHtml
        });

        // Mark as notified
        await base44.asServiceRole.entities.BackInStockNotification.update(notification.id, {
          notified: true
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${notification.customer_email}:`, error);
        errors.push({
          email: notification.customer_email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `נשלחו ${sentCount} התראות מתוך ${notifications.length}`,
      sent: sentCount,
      total: notifications.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Send notifications error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});