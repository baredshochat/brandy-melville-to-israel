import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // ✅ 1. Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { points_to_redeem, order_total, order_id } = await req.json();
    
    if (!points_to_redeem || !order_total) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (!order_id) {
      return Response.json({ error: 'Missing order_id - required to prevent duplicate redemption' }, { status: 400 });
    }

    // ✅ 2. CRITICAL: Check if already redeemed for this order (FIRST LINE OF DEFENSE)
    const existingRedemption = await base44.asServiceRole.entities.PointsLedger.filter({
      user_email: user.email,
      source: order_id,
      type: 'redeem'
    });

    if (existingRedemption && existingRedemption.length > 0) {
      return Response.json({ 
        error: 'Points already redeemed for this order',
        code: 'ALREADY_REDEEMED'
      }, { status: 400 });
    }

    // ✅ 3. Get max redeem percentage setting
    let maxRedeemPct = 0.3;
    try {
      const settings = await base44.asServiceRole.entities.LoyaltySettings.filter({
        setting_key: 'max_redeem_percentage'
      });
      if (settings && settings.length > 0) {
        maxRedeemPct = parseFloat(settings[0].value);
      }
    } catch (e) {
      console.log('Using default max redeem percentage:', e.message);
    }

    // ✅ 4. Get current user data (single read)
    const currentUser = await base44.asServiceRole.entities.User.get(user.id);
    
    // ✅ 5. Validate conditions BEFORE attempting update
    if (!currentUser.club_member) {
      return Response.json({ 
        error: 'You must be an active club member to redeem points',
        code: 'NOT_CLUB_MEMBER'
      }, { status: 403 });
    }
    
    const currentBalance = currentUser.points_balance || 0;
    if (currentBalance < points_to_redeem) {
      return Response.json({ 
        error: `Insufficient points. Available: ${currentBalance}, Requested: ${points_to_redeem}`,
        code: 'INSUFFICIENT_POINTS'
      }, { status: 400 });
    }
    
    const maxRedeemable = Math.floor(order_total * maxRedeemPct);
    if (points_to_redeem > maxRedeemable) {
      return Response.json({ 
        error: `Cannot redeem more than ${Math.round(maxRedeemPct * 100)}% of order total (max: ${maxRedeemable} points)`,
        code: 'EXCEEDS_MAX_REDEEM'
      }, { status: 400 });
    }

    // ✅ 6. Calculate new balance
    const newBalance = currentBalance - points_to_redeem;

    // ✅ 7. ATOMIC UPDATE: Update points_balance directly
    await base44.asServiceRole.entities.User.update(user.id, {
      points_balance: newBalance
    });

    // ✅ 8. Verify update succeeded by reading back
    const updatedUser = await base44.asServiceRole.entities.User.get(user.id);
    if (updatedUser.points_balance !== newBalance) {
      // Something went wrong - balance doesn't match what we set
      console.error(`Balance mismatch after update. Expected: ${newBalance}, Got: ${updatedUser.points_balance}`);
      return Response.json({ 
        error: 'Failed to update points balance - please try again',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    // ✅ 9. Create ledger entry AFTER successful balance update
    await base44.asServiceRole.entities.PointsLedger.create({
      user_email: user.email,
      type: 'redeem',
      amount: -points_to_redeem,
      source: order_id,
      description: `מימוש נקודות להזמנה #${order_id}`,
      balance_after: newBalance
    });

    // ✅ 10. Return success with updated balance
    return Response.json({ 
      success: true,
      points_redeemed: points_to_redeem,
      new_balance: newBalance
    });

  } catch (error) {
    console.error('Error in redeemPoints:', error);
    return Response.json({ 
      error: error.message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
});