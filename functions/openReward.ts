import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const POINTS_PER_REWARD = 100;
const REWARD_DISCOUNT = 50; // ₪50 per reward

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user data
    const users = await base44.asServiceRole.entities.User.filter({
      email: user.email
    });

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = users[0];
    const currentBalance = userData.points_balance || 0;

    // Check if user has enough points
    if (currentBalance < POINTS_PER_REWARD) {
      return Response.json({ 
        error: `נדרשות ${POINTS_PER_REWARD} נקודות. יתרה נוכחית: ${currentBalance}`,
        current_balance: currentBalance,
        points_needed: POINTS_PER_REWARD - currentBalance
      }, { status: 400 });
    }

    const newBalance = currentBalance - POINTS_PER_REWARD;

    // Create reward with 30 days expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const reward = await base44.asServiceRole.entities.LoyaltyReward.create({
      user_email: user.email,
      reward_type: 'points_redemption',
      discount_amount: REWARD_DISCOUNT,
      status: 'active',
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      points_cost: POINTS_PER_REWARD
    });

    // Update user balance
    await base44.asServiceRole.entities.User.update(userData.id, {
      points_balance: newBalance
    });

    // Create ledger entry
    await base44.asServiceRole.entities.PointsLedger.create({
      user_email: user.email,
      type: 'reward_opened',
      amount: -POINTS_PER_REWARD,
      source: 'reward_system',
      description: `פתיחת הטבה של ${REWARD_DISCOUNT}₪ (תוקף עד ${expiresAt.toLocaleDateString('he-IL')})`,
      balance_after: newBalance,
      reward_id: reward.id
    });

    return Response.json({ 
      success: true,
      reward_id: reward.id,
      discount_amount: REWARD_DISCOUNT,
      expires_at: expiresAt.toISOString(),
      new_balance: newBalance
    });

  } catch (error) {
    console.error('Error in openReward:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});