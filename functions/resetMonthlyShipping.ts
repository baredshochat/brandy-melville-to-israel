import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Get all Gold tier members
    const goldUsers = await base44.asServiceRole.entities.User.filter({
      club_member: true,
      tier: 'gold'
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let reset = 0;

    for (const user of goldUsers) {
      // Check if last reset was in a different month
      let needsReset = true;
      
      if (user.last_monthly_reset) {
        const lastReset = new Date(user.last_monthly_reset);
        if (lastReset.getMonth() === currentMonth && lastReset.getFullYear() === currentYear) {
          needsReset = false;
        }
      }

      if (needsReset && user.monthly_free_shipping_used) {
        await base44.asServiceRole.entities.User.update(user.id, {
          monthly_free_shipping_used: false,
          last_monthly_reset: now.toISOString()
        });
        reset++;
      }
    }

    return Response.json({ 
      success: true,
      gold_users: goldUsers.length,
      reset_count: reset
    });

  } catch (error) {
    console.error('Error in resetMonthlyShipping:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});