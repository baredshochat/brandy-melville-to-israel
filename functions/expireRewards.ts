import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // Get all active rewards
    const activeRewards = await base44.asServiceRole.entities.LoyaltyReward.filter({
      status: 'active'
    });

    const now = new Date();
    let expired = 0;

    for (const reward of activeRewards) {
      const expiresAt = new Date(reward.expires_at);
      
      if (expiresAt < now) {
        // Mark as expired
        await base44.asServiceRole.entities.LoyaltyReward.update(reward.id, {
          status: 'expired'
        });

        // Create ledger entry
        await base44.asServiceRole.entities.PointsLedger.create({
          user_email: reward.user_email,
          type: 'reward_expired',
          amount: 0,
          source: 'reward_system',
          description: `הטבה של ${reward.discount_amount}₪ פגה תוקף`,
          balance_after: 0, // Not affecting balance
          reward_id: reward.id
        });

        // Send notification email
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: "Brandy Melville to Israel",
            to: reward.user_email,
            subject: "הטבה פגה תוקף",
            body: `
              <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>הטבה פגה תוקף</h2>
                <p>ההטבה של ${reward.discount_amount}₪ פגה תוקף.</p>
                <p>כדי להפיק הטבה חדשה, צברי עוד נקודות והפיקי הטבה חדשה.</p>
              </div>
            `
          });
        } catch (e) {
          console.error('Failed to send expiry email:', e);
        }

        expired++;
      }
    }

    return Response.json({ 
      success: true,
      expired_rewards: expired
    });

  } catch (error) {
    console.error('Error in expireRewards:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});