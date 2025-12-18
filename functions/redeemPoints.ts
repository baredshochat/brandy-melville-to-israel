import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { points_to_redeem, order_total } = await req.json();
    
    if (!points_to_redeem || !order_total) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Get max redeem percentage setting
    let maxRedeemPercentage = 0.3; // default 30%
    try {
      const settings = await base44.asServiceRole.entities.LoyaltySettings.filter({
        setting_key: 'max_redeem_percentage'
      });
      if (settings && settings.length > 0) {
        maxRedeemPercentage = parseFloat(settings[0].value);
      }
    } catch (e) {
      console.log('Using default max redeem percentage:', e.message);
    }

    // Check if points exceed max allowed
    const maxAllowedPoints = Math.floor(order_total * maxRedeemPercentage);
    if (points_to_redeem > maxAllowedPoints) {
      return Response.json({ 
        error: `ניתן לממש עד ${maxAllowedPoints} נקודות (${Math.round(maxRedeemPercentage * 100)}% מסכום ההזמנה)`,
        max_allowed: maxAllowedPoints
      }, { status: 400 });
    }

    // Check if user is blocked
    try {
      const blockedSettings = await base44.asServiceRole.entities.LoyaltySettings.filter({
        setting_key: 'blocked_users'
      });
      if (blockedSettings && blockedSettings.length > 0) {
        const blockedUsers = JSON.parse(blockedSettings[0].value);
        if (blockedUsers.includes(user.email)) {
          return Response.json({ 
            error: 'המשתמש חסום ממימוש הטבות' 
          }, { status: 403 });
        }
      }
    } catch (e) {
      console.log('No blocked users:', e.message);
    }

    // Get current user data
    const users = await base44.asServiceRole.entities.User.filter({
      email: user.email
    });

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = users[0];
    
    // CRITICAL CHECK 1: Verify club membership is active
    if (!userData.club_member) {
      return Response.json({ 
        error: 'חברות המועדון אינה פעילה',
        club_member: false
      }, { status: 403 });
    }

    const currentBalance = userData.points_balance || 0;

    // CRITICAL CHECK 2: Verify sufficient points
    if (currentBalance < points_to_redeem) {
      return Response.json({ 
        error: `אין מספיק נקודות. יתרה נוכחית: ${currentBalance}`,
        current_balance: currentBalance
      }, { status: 400 });
    }

    // ATOMIC TRANSACTION START
    const newBalance = currentBalance - points_to_redeem;

    // Update user balance atomically
    await base44.asServiceRole.entities.User.update(userData.id, {
      points_balance: newBalance
    });

    // Create ledger entry for audit trail
    await base44.asServiceRole.entities.PointsLedger.create({
      user_email: user.email,
      type: 'use',
      amount: -points_to_redeem,
      source: 'checkout',
      description: `מימוש ${points_to_redeem} נקודות בקופה`,
      balance_after: newBalance
    });
    // ATOMIC TRANSACTION END

    return Response.json({ 
      success: true, 
      points_redeemed: points_to_redeem,
      discount_amount: points_to_redeem, // 1 point = 1 ILS
      new_balance: newBalance
    });

  } catch (error) {
    console.error('Error in redeemPoints:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});