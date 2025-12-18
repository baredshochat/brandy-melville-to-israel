import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // This should be called via a scheduled job (e.g., daily cron)
    
    console.log('Starting birthday processing...');

    // Get all club members
    const allUsers = await base44.asServiceRole.entities.User.list();
    const clubMembers = allUsers.filter(u => u.club_member && u.birthday);

    console.log(`Found ${clubMembers.length} club members with birthdays`);

    // Get today's date and date in 7 days
    const today = new Date();
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const in7DaysMonth = in7Days.getMonth() + 1;
    const in7DaysDay = in7Days.getDate();

    const birthdayUsers = [];

    for (const user of clubMembers) {
      try {
        const birthday = new Date(user.birthday);
        const bdayMonth = birthday.getMonth() + 1;
        const bdayDay = birthday.getDate();

        // Check if birthday is in 7 days
        if (bdayMonth === in7DaysMonth && bdayDay === in7DaysDay) {
          birthdayUsers.push(user);
        }
      } catch (e) {
        console.error(`Error parsing birthday for user ${user.email}:`, e.message);
      }
    }

    console.log(`Found ${birthdayUsers.length} users with upcoming birthdays`);

    const results = [];

    for (const user of birthdayUsers) {
      try {
        // Check if already sent this year
        const thisYear = today.getFullYear();
        const codePrefix = `BDAY${thisYear}`;
        
        const existingCodes = await base44.asServiceRole.entities.Code.filter({
          code: { $regex: codePrefix },
          allowed_emails: { $in: [user.email] }
        });

        if (existingCodes && existingCodes.length > 0) {
          console.log(`Already sent birthday code to ${user.email} this year`);
          continue;
        }

        // Create unique birthday code
        const uniqueCode = `${codePrefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        // Set expiry to 14 days from now
        const expiryDate = new Date(today);
        expiryDate.setDate(today.getDate() + 14);

        // Create birthday discount code (20% off)
        await base44.asServiceRole.entities.Code.create({
          code: uniqueCode,
          type: 'coupon',
          is_active: true,
          expires_at: expiryDate.toISOString().split('T')[0],
          usage_limit_total: 1,
          usage_limit_per_user: 1,
          used_count: 0,
          allowed_emails: [user.email],
          reward_type: 'percent',
          value: 20,
          notes: `הטבת יום הולדת ${thisYear} ל-${user.full_name || user.email}`
        });

        // Send birthday email
        const birthdayDate = new Date(user.birthday);
        const bdayDay = birthdayDate.getDate();
        const bdayMonth = birthdayDate.getMonth() + 1;

        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: "Brandy Melville to Israel",
          to: user.email,
          subject: "מתנת יום הולדת מיוחדת! 🎂🎉",
          body: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; text-align: center;">
              <h1 style="color: #F43F5E; font-size: 32px;">🎉 יום הולדת שמח! 🎂</h1>
              <p style="font-size: 18px;">היי ${user.full_name || 'יקרה'},</p>
              <p style="font-size: 16px;">עוד שבוע את חוגגת, ואנחנו כבר מתרגשות!</p>
              <p style="font-size: 16px; margin: 30px 0;">בתור מתנה מיוחדת, הכנו לך:</p>
              
              <div style="background: linear-gradient(135deg, #FFCAD4 0%, #F43F5E 100%); padding: 30px; border-radius: 15px; margin: 20px 0;">
                <p style="color: white; font-size: 24px; margin: 0 0 10px 0; font-weight: bold;">20% הנחה</p>
                <p style="color: white; font-size: 14px; margin: 0 0 20px 0;">על כל ההזמנה!</p>
                <div style="background: white; padding: 15px; border-radius: 10px; display: inline-block;">
                  <p style="margin: 0; font-size: 28px; font-weight: bold; color: #F43F5E; letter-spacing: 3px;">${uniqueCode}</p>
                </div>
              </div>

              <p style="font-size: 14px; color: #666;">הקוד תקף עד ${expiryDate.toLocaleDateString('he-IL')}</p>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">פשוט הכניסי את הקוד בקופה ותהני מההנחה 💖</p>
              <p style="margin-top: 40px; font-size: 16px;">בברנדי שלך,<br><strong>צוות Brandy Melville to Israel</strong></p>
            </div>
          `
        });

        results.push({
          email: user.email,
          code: uniqueCode,
          status: 'sent'
        });

        console.log(`Sent birthday code to ${user.email}`);

      } catch (e) {
        console.error(`Error processing birthday for ${user.email}:`, e.message);
        results.push({
          email: user.email,
          status: 'error',
          error: e.message
        });
      }
    }

    return Response.json({ 
      success: true, 
      processed: results.length,
      results 
    });

  } catch (error) {
    console.error('Error in processBirthdays:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});