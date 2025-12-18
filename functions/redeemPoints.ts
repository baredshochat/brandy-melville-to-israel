import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // 1. Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { redemption_token_id, order_id } = await req.json();
    
    if (!redemption_token_id) {
      return Response.json({ error: 'Missing redemption_token_id' }, { status: 400 });
    }

    if (!order_id) {
      return Response.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // 2. Load the token
    let token;
    try {
      token = await base44.asServiceRole.entities.RedemptionToken.get(redemption_token_id);
      
      // Normalize response
      if (typeof Response !== 'undefined' && token instanceof Response) {
        token = await token.json();
      } else if (token?.data) {
        token = token.data;
      }
    } catch (e) {
      return Response.json({ 
        error: 'Invalid or non-existent token',
        code: 'TOKEN_NOT_FOUND'
      }, { status: 404 });
    }

    // 3. Critical validations on token
    if (token.status !== 'active') {
      return Response.json({ 
        error: `Token already ${token.status}`,
        code: 'TOKEN_ALREADY_USED'
      }, { status: 400 });
    }

    if (new Date(token.expires_at) < new Date()) {
      // Mark as expired
      await base44.asServiceRole.entities.RedemptionToken.update(token.id, {
        status: 'expired'
      });
      
      return Response.json({ 
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      }, { status: 400 });
    }

    if (token.user_id !== user.id) {
      return Response.json({ 
        error: 'Token does not belong to current user',
        code: 'TOKEN_UNAUTHORIZED'
      }, { status: 403 });
    }

    // 4. Check if points already redeemed for this order
    const existingRedemption = await base44.asServiceRole.entities.PointsLedger.filter({
      user_email: user.email,
      source: order_id,
      type: 'redeem'
    });

    if (existingRedemption && existingRedemption.length > 0) {
      // Mark token as used anyway
      await base44.asServiceRole.entities.RedemptionToken.update(token.id, {
        status: 'used',
        used_at: new Date().toISOString(),
        order_id: order_id
      });
      
      return Response.json({ 
        error: 'Points already redeemed for this order',
        code: 'ALREADY_REDEEMED'
      }, { status: 400 });
    }

    // 5. Re-verify user conditions (might have changed since token creation)
    const currentUser = await base44.asServiceRole.entities.User.get(user.id);
    
    if (!currentUser.club_member) {
      return Response.json({ 
        error: 'User is no longer a club member',
        code: 'NOT_CLUB_MEMBER'
      }, { status: 403 });
    }

    const currentBalance = currentUser.points_balance || 0;
    if (currentBalance < token.points_amount) {
      return Response.json({ 
        error: `Insufficient points. Available: ${currentBalance}, Required: ${token.points_amount}`,
        code: 'INSUFFICIENT_POINTS'
      }, { status: 400 });
    }

    // 6. Perform redemption - update points balance
    const newBalance = currentBalance - token.points_amount;
    
    await base44.asServiceRole.entities.User.update(user.id, {
      points_balance: newBalance
    });

    // 7. Verify update succeeded
    const updatedUser = await base44.asServiceRole.entities.User.get(user.id);
    if (updatedUser.points_balance !== newBalance) {
      console.error(`Balance mismatch. Expected: ${newBalance}, Got: ${updatedUser.points_balance}`);
      return Response.json({ 
        error: 'Failed to update points balance',
        code: 'UPDATE_FAILED'
      }, { status: 500 });
    }

    // 8. Create ledger entry
    await base44.asServiceRole.entities.PointsLedger.create({
      user_email: user.email,
      type: 'redeem',
      amount: -token.points_amount,
      source: order_id,
      description: `מימוש נקודות להזמנה #${order_id}`,
      balance_after: newBalance
    });

    // 9. Mark token as used
    await base44.asServiceRole.entities.RedemptionToken.update(token.id, {
      status: 'used',
      used_at: new Date().toISOString(),
      order_id: order_id
    });

    // 10. Return success
    return Response.json({ 
      success: true,
      points_redeemed: token.points_amount,
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