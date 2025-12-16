import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { birthday, phone, marketing_opt_in } = await req.json();

    // Get current user data
    const users = await base44.asServiceRole.entities.User.filter({
      email: user.email
    });

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = users[0];

    // Check if already a member
    if (userData.club_member) {
      return Response.json({ 
        success: false, 
        message: 'כבר חבר מועדון' 
      });
    }

    // Get signup bonus setting
    let signupBonus = 50; // default 50 points
    try {
      const settings = await base44.asServiceRole.entities.LoyaltySettings.filter({
        setting_key: 'signup_bonus'
      });
      if (settings && settings.length > 0) {
        signupBonus = parseInt(settings[0].value);
      }
    } catch (e) {
      console.log('Using default signup bonus:', e.message);
    }

    const currentBalance = userData.points_balance || 0;
    const newBalance = currentBalance + signupBonus;

    // Update user - join club and add bonus
    await base44.asServiceRole.entities.User.update(userData.id, {
      club_member: true,
      tier: 'member',
      birthday: birthday || userData.birthday,
      phone: phone || userData.phone,
      points_balance: newBalance,
      marketing_opt_in: marketing_opt_in || false,
      marketing_opt_in_at: marketing_opt_in ? new Date().toISOString() : null
    });

    // Create ledger entry for bonus
    await base44.asServiceRole.entities.PointsLedger.create({
      user_email: user.email,
      type: 'bonus',
      amount: signupBonus,
      source: 'club_signup',
      description: `בונוס הצטרפות למועדון`,
      balance_after: newBalance
    });

    // Send welcome email
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: "Brandy Melville to Israel",
        to: user.email,
        subject: "ברוכה הבאה למועדון הלקוחות! 🎉",
        body: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #F43F5E;">ברוכה הבאה למועדון! 💖</h1>
            <p>היי ${user.full_name || 'יקרה'},</p>
            <p>קיבלת <strong>${signupBonus} נקודות בונוס</strong> להצטרפות למועדון הלקוחות שלנו!</p>
            <p>מעכשיו את צוברת נקודות על כל הזמנה, ומקבלת הטבות מיוחדות ביום ההולדת שלך 🎂</p>
            <p>היתרה הנוכחית שלך: <strong>${newBalance} נקודות</strong></p>
            <p style="margin-top: 20px;">בברנדי שלך,<br>צוות Brandy Melville to Israel</p>
          </div>
        `
      });
    } catch (e) {
      console.error('Failed to send welcome email:', e.message);
    }

    return Response.json({ 
      success: true, 
      bonus_points: signupBonus,
      new_balance: newBalance,
      message: 'הצטרפת בהצלחה למועדון!'
    });

  } catch (error) {
    console.error('Error in joinClub:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});