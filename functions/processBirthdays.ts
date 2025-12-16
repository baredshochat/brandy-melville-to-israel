import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function getBirthdayPoints(tier) {
  switch (tier) {
    case 'gold': return 100;
    case 'silver': return 75;
    case 'member':
    default: return 50;
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const today = new Date();
    const todayStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Get all club members with birthdays today
    const allUsers = await base44.asServiceRole.entities.User.filter({
      club_member: true
    });

    const birthdayUsers = allUsers.filter(user => {
      if (!user.birthday) return false;
      const bday = new Date(user.birthday);
      const bdayStr = `${String(bday.getMonth() + 1).padStart(2, '0')}-${String(bday.getDate()).padStart(2, '0')}`;
      return bdayStr === todayStr;
    });

    let processed = 0;

    for (const user of birthdayUsers) {
      // Check if already granted this year
      if (user.birthday_reward_granted_at) {
        const lastGrant = new Date(user.birthday_reward_granted_at);
        if (lastGrant.getFullYear() === today.getFullYear()) {
          continue; // Already granted this year
        }
      }

      const tier = user.tier || 'member';
      const pointsToGrant = getBirthdayPoints(tier);
      const currentBalance = user.points_balance || 0;
      const newBalance = currentBalance + pointsToGrant;

      // Set expiry 30 days from now
      const expiresAt = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Update user
      await base44.asServiceRole.entities.User.update(user.id, {
        points_balance: newBalance,
        birthday_reward_granted_at: today.toISOString(),
        birthday_reward_expires_at: expiresAt.toISOString()
      });

      // Create ledger entry
      await base44.asServiceRole.entities.PointsLedger.create({
        user_email: user.email,
        type: 'birthday_bonus',
        amount: pointsToGrant,
        source: 'birthday',
        description: `תגמול יום הולדת - ${pointsToGrant} נקודות (תוקף: 30 ימים)`,
        balance_after: newBalance
      });

      // Send birthday email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: "Brandy Melville to Israel",
          to: user.email,
          subject: "🎉 יום הולדת שמח! קיבלת מתנה 🎁",
          body: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #F43F5E;">יום הולדת שמח! 🎂</h1>
              <p>היי ${user.full_name || 'יקרה'},</p>
              <p>במועדון שלנו, יום ההולדת שלך הוא גם יום ההולדת שלנו!</p>
              <p>קיבלת <strong>${pointsToGrant} נקודות מתנה</strong> 🎁</p>
              <p>היתרה שלך עכשיו: <strong>${newBalance} נקודות</strong></p>
              <p style="color: #666; font-size: 14px;">
                * הנקודות תקפות ל-30 ימים מהיום
              </p>
              <p>תהני ביום המיוחד שלך! 💖</p>
            </div>
          `
        });
      } catch (e) {
        console.error('Failed to send birthday email:', e);
      }

      processed++;
    }

    return Response.json({ 
      success: true,
      processed
    });

  } catch (error) {
    console.error('Error in processBirthdays:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});