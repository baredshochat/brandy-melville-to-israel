import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, user_email, amount, reason } = await req.json();

    if (!action || !user_email) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Get target user
    const users = await base44.asServiceRole.entities.User.filter({
      email: user_email
    });

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];
    const currentBalance = targetUser.points_balance || 0;
    let newBalance = currentBalance;
    let ledgerType = '';
    let ledgerAmount = 0;
    let description = '';

    switch (action) {
      case 'add':
        if (!amount || amount <= 0) {
          return Response.json({ error: 'Invalid amount' }, { status: 400 });
        }
        newBalance = currentBalance + amount;
        ledgerType = 'admin_add';
        ledgerAmount = amount;
        description = `הוספה ידנית: ${reason || 'ללא סיבה'}`;
        break;

      case 'deduct':
        if (!amount || amount <= 0) {
          return Response.json({ error: 'Invalid amount' }, { status: 400 });
        }
        newBalance = Math.max(0, currentBalance - amount);
        ledgerType = 'admin_deduct';
        ledgerAmount = -amount;
        description = `הורדה ידנית: ${reason || 'ללא סיבה'}`;
        break;

      case 'block':
        // Add user to blocked list
        try {
          const blockedSettings = await base44.asServiceRole.entities.LoyaltySettings.filter({
            setting_key: 'blocked_users'
          });

          let blockedUsers = [];
          if (blockedSettings && blockedSettings.length > 0) {
            blockedUsers = JSON.parse(blockedSettings[0].value);
            if (!blockedUsers.includes(user_email)) {
              blockedUsers.push(user_email);
              await base44.asServiceRole.entities.LoyaltySettings.update(blockedSettings[0].id, {
                value: JSON.stringify(blockedUsers)
              });
            }
          } else {
            await base44.asServiceRole.entities.LoyaltySettings.create({
              setting_key: 'blocked_users',
              value: JSON.stringify([user_email])
            });
          }
          return Response.json({ success: true, message: 'משתמש נחסם בהצלחה' });
        } catch (e) {
          return Response.json({ error: e.message }, { status: 500 });
        }

      case 'unblock':
        // Remove user from blocked list
        try {
          const blockedSettings = await base44.asServiceRole.entities.LoyaltySettings.filter({
            setting_key: 'blocked_users'
          });

          if (blockedSettings && blockedSettings.length > 0) {
            let blockedUsers = JSON.parse(blockedSettings[0].value);
            blockedUsers = blockedUsers.filter(email => email !== user_email);
            await base44.asServiceRole.entities.LoyaltySettings.update(blockedSettings[0].id, {
              value: JSON.stringify(blockedUsers)
            });
          }
          return Response.json({ success: true, message: 'חסימה הוסרה בהצלחה' });
        } catch (e) {
          return Response.json({ error: e.message }, { status: 500 });
        }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // ✅ FIX #3: Direct update to points_balance as single source of truth
    await base44.asServiceRole.entities.User.update(targetUser.id, {
      points_balance: newBalance
    });

    // Create ledger entry with admin_adjustment type
    await base44.asServiceRole.entities.PointsLedger.create({
      user_email: user_email,
      type: 'admin_adjustment',
      amount: ledgerAmount,
      source: `admin:${user.email}`,
      description: description,
      balance_after: newBalance
    });

    return Response.json({ 
      success: true, 
      new_balance: newBalance,
      message: 'פעולה בוצעה בהצלחה'
    });

  } catch (error) {
    console.error('Error in adminPointsManager:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});