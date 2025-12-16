import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const SILVER_THRESHOLD = 5;  // 5 orders in 6 months
const GOLD_THRESHOLD = 10;   // 10 orders in 6 months

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // This function should be called periodically (daily cron)
    // or can be triggered manually by admin

    // Get all club members
    const users = await base44.asServiceRole.entities.User.filter({
      club_member: true
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    let updated = 0;

    for (const user of users) {
      // Count orders in last 6 months
      const orders = await base44.asServiceRole.entities.Order.filter({
        customer_email: user.email,
        payment_status: 'completed',
        created_date: { $gte: sixMonthsAgo.toISOString() }
      });

      const orderCount = orders ? orders.length : 0;
      const currentTier = user.tier || 'member';
      let newTier = currentTier;

      // Determine tier
      if (orderCount >= GOLD_THRESHOLD) {
        newTier = 'gold';
      } else if (orderCount >= SILVER_THRESHOLD) {
        newTier = 'silver';
      } else {
        newTier = 'member';
      }

      // Update if changed
      if (newTier !== currentTier) {
        await base44.asServiceRole.entities.User.update(user.id, {
          tier: newTier,
          tier_achieved_at: new Date().toISOString(),
          orders_last_6_months: orderCount
        });

        // Send notification email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: "Brandy Melville to Israel",
            to: user.email,
            subject: `עלית לדרגת ${newTier === 'gold' ? 'Gold ⭐' : 'Silver ✨'}!`,
            body: `
              <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #F43F5E;">מזל טוב! עלית דרגה 🎉</h1>
                <p>היי ${user.full_name || 'יקרה'},</p>
                <p>הגעת לדרגת <strong>${newTier === 'gold' ? 'Gold ⭐' : 'Silver ✨'}</strong> במועדון!</p>
                <p>מעכשיו את נהנית מ:</p>
                <ul>
                  ${newTier === 'gold' ? `
                    <li>צבירת 10% נקודות על כל הזמנה</li>
                    <li>100 נקודות ביום הולדת</li>
                    <li>משלוח חינם אחד בכל חודש</li>
                    <li>קדימות במלאי ובטיפול</li>
                  ` : `
                    <li>צבירת 7% נקודות על כל הזמנה</li>
                    <li>75 נקודות ביום הולדת</li>
                    <li>משלוח חינם חד-פעמי</li>
                    <li>קדימות במלאי</li>
                  `}
                </ul>
                <p>תודה שאת איתנו! 💖</p>
              </div>
            `
          });
        } catch (e) {
          console.error('Failed to send tier upgrade email:', e);
        }

        updated++;
      } else if (orderCount !== user.orders_last_6_months) {
        // Just update order count
        await base44.asServiceRole.entities.User.update(user.id, {
          orders_last_6_months: orderCount
        });
      }
    }

    return Response.json({ 
      success: true,
      users_checked: users.length,
      users_updated: updated
    });

  } catch (error) {
    console.error('Error in updateTiers:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});