import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { order_id } = await req.json();
    
    if (!order_id) {
      return Response.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Get order
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if already earned points for this order
    const existingLedger = await base44.asServiceRole.entities.PointsLedger.filter({
      user_email: order.customer_email,
      source: order.order_number,
      type: 'earn'
    });

    if (existingLedger && existingLedger.length > 0) {
      return Response.json({ 
        success: false, 
        message: 'Points already earned for this order' 
      });
    }

    // Get earn percentage setting
    let earnPercentage = 0.1; // default 10%
    try {
      const settings = await base44.asServiceRole.entities.LoyaltySettings.filter({
        setting_key: 'earn_percentage'
      });
      if (settings && settings.length > 0) {
        earnPercentage = parseFloat(settings[0].value);
      }
    } catch (e) {
      console.log('Using default earn percentage:', e.message);
    }

    // Calculate points (10% of order total, excluding points used)
    const orderTotal = order.total_price_ils || 0;
    const pointsToEarn = Math.floor(orderTotal * earnPercentage);

    if (pointsToEarn <= 0) {
      return Response.json({ 
        success: false, 
        message: 'No points to earn' 
      });
    }

    // Get current user data
    const users = await base44.asServiceRole.entities.User.filter({
      email: order.customer_email
    });

    let currentBalance = 0;
    let userId = null;

    if (users && users.length > 0) {
      currentBalance = users[0].points_balance || 0;
      userId = users[0].id;
    }

    const newBalance = currentBalance + pointsToEarn;

    // Update user balance
    if (userId) {
      await base44.asServiceRole.entities.User.update(userId, {
        points_balance: newBalance
      });
    }

    // Create ledger entry
    await base44.asServiceRole.entities.PointsLedger.create({
      user_email: order.customer_email,
      type: 'earn',
      amount: pointsToEarn,
      source: order.order_number,
      description: `צבירה מהזמנה #${order.order_number}`,
      balance_after: newBalance
    });

    return Response.json({ 
      success: true, 
      points_earned: pointsToEarn,
      new_balance: newBalance
    });

  } catch (error) {
    console.error('Error in earnPoints:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});