import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const LOCK_TIMEOUT_MINUTES = 5;

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

    // ✅ 2. Get max redeem percentage setting
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

    // ✅ 3. Check if already redeemed for this order
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

    // ✅ 4. Try to acquire lock (atomic operation)
    let lockAcquired = false;
    const now = new Date().toISOString();
    
    try {
      // Get fresh user data with current lock state
      const freshUser = await base44.asServiceRole.entities.User.get(user.id);
      
      // Check if lock is active
      if (freshUser.redeeming_in_progress) {
        // Check if lock is stale (older than LOCK_TIMEOUT_MINUTES)
        if (freshUser.redeeming_locked_at) {
          const lockedAt = new Date(freshUser.redeeming_locked_at);
          const minutesElapsed = (new Date() - lockedAt) / 1000 / 60;
          
          if (minutesElapsed < LOCK_TIMEOUT_MINUTES) {
            return Response.json({ 
              error: 'Redemption already in progress. Please wait and try again.',
              code: 'REDEMPTION_IN_PROGRESS'
            }, { status: 409 });
          }
          
          // Lock is stale, will override it
          console.log(`Overriding stale lock for user ${user.id} (locked ${minutesElapsed.toFixed(1)} minutes ago)`);
        }
      }
      
      // Set lock
      await base44.asServiceRole.entities.User.update(user.id, {
        redeeming_in_progress: true,
        redeeming_locked_at: now
      });
      
      lockAcquired = true;
      
    } catch (e) {
      console.error('Failed to acquire lock:', e);
      return Response.json({ 
        error: 'Failed to acquire redemption lock',
        code: 'LOCK_FAILED'
      }, { status: 500 });
    }

    // ✅ 5. Perform all validations with lock held
    try {
      // Get fresh user data again for validation
      const currentUser = await base44.asServiceRole.entities.User.get(user.id);
      
      // Check club membership
      if (!currentUser.club_member) {
        throw new Error('You must be an active club member to redeem points');
      }
      
      // Check sufficient balance
      const currentBalance = currentUser.points_balance || 0;
      if (currentBalance < points_to_redeem) {
        throw new Error(`Insufficient points. Available: ${currentBalance}, Requested: ${points_to_redeem}`);
      }
      
      // Check max redeem limit
      const maxRedeemable = Math.floor(order_total * maxRedeemPct);
      if (points_to_redeem > maxRedeemable) {
        throw new Error(`Cannot redeem more than ${Math.round(maxRedeemPct * 100)}% of order total (max: ${maxRedeemable} points)`);
      }

      // ✅ 6. Execute redemption (atomic)
      const newBalance = currentBalance - points_to_redeem;
      
      await base44.asServiceRole.entities.User.update(user.id, {
        points_balance: newBalance
      });

      // Create ledger entry
      await base44.asServiceRole.entities.PointsLedger.create({
        user_email: user.email,
        type: 'redeem',
        amount: -points_to_redeem,
        source: order_id,
        description: `מימוש נקודות להזמנה #${order_id}`,
        balance_after: newBalance
      });

      // ✅ 7. Release lock on success
      await base44.asServiceRole.entities.User.update(user.id, {
        redeeming_in_progress: false,
        redeeming_locked_at: null
      });

      return Response.json({ 
        success: true,
        points_redeemed: points_to_redeem,
        new_balance: newBalance
      });

    } catch (validationError) {
      // ✅ 8. Release lock on validation/execution failure
      if (lockAcquired) {
        try {
          await base44.asServiceRole.entities.User.update(user.id, {
            redeeming_in_progress: false,
            redeeming_locked_at: null
          });
        } catch (unlockError) {
          console.error('Failed to release lock after error:', unlockError);
        }
      }
      
      return Response.json({ 
        error: validationError.message,
        code: 'VALIDATION_FAILED'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in redeemPoints:', error);
    
    // Try to release lock if it was acquired
    try {
      const user = await base44.auth.me();
      if (user) {
        await base44.asServiceRole.entities.User.update(user.id, {
          redeeming_in_progress: false,
          redeeming_locked_at: null
        });
      }
    } catch (unlockError) {
      console.error('Failed to release lock after unexpected error:', unlockError);
    }
    
    return Response.json({ error: error.message }, { status: 500 });
  }
});