import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get email from query params
    const url = new URL(req.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return new Response(
        `<!DOCTYPE html>
        <html dir="rtl">
        <head><meta charset="utf-8"><title>שגיאה</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>שגיאה</h1>
          <p>כתובת אימייל לא תקינה</p>
        </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Find user by email
    const users = await base44.asServiceRole.entities.User.filter({ email: email });
    
    if (!users || users.length === 0) {
      return new Response(
        `<!DOCTYPE html>
        <html dir="rtl">
        <head><meta charset="utf-8"><title>לא נמצא</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>משתמש לא נמצא</h1>
          <p>כתובת האימייל לא נמצאה במערכת</p>
        </body>
        </html>`,
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const userId = users[0].id;

    // Update user - unsubscribe from marketing
    await base44.asServiceRole.entities.User.update(userId, {
      marketing_opt_in: false,
      unsubscribed_at: new Date().toISOString()
    });

    // Return success page
    return new Response(
      `<!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>הוסרת מרשימת התפוצה</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #fef3f5 0%, #f8f9fa 100%);
            margin: 0;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 500px;
            text-align: center;
          }
          h1 {
            color: #2d3748;
            margin-bottom: 16px;
          }
          p {
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .success-icon {
            width: 64px;
            height: 64px;
            background: #d4f4e2;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            font-size: 32px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✓</div>
          <h1>הוסרת בהצלחה מרשימת התפוצה</h1>
          <p>כתובת המייל <strong>${email}</strong> הוסרה מרשימת התפוצה שלנו.</p>
          <p>לא תקבלי יותר מיילים שיווקיים מאיתנו.</p>
          <p style="font-size: 14px; color: #718096; margin-top: 32px;">
            תודה שהיית איתנו 💕
          </p>
        </div>
      </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return new Response(
      `<!DOCTYPE html>
      <html dir="rtl">
      <head><meta charset="utf-8"><title>שגיאה</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>שגיאה</h1>
        <p>אירעה שגיאה בעת הסרתך מרשימת התפוצה. אנא נסי שוב מאוחר יותר.</p>
      </body>
      </html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
});