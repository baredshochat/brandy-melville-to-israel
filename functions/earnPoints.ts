import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper to calculate tier earn percentage
function getTierEarnPercentage(tier) {
  switch (tier) {
    case 'gold': return 0.10;  // 10%
    case 'silver': return 0.07; // 7%
    case 'member': 
    default: return 0.05;       // 5%
  }
}

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

    // Get current user data
    const users = await base44.asServiceRole.entities.User.filter({
      email: order.customer_email
    });

    let currentBalance = 0;
    let userId = null;
    let userTier = 'member';

    if (users && users.length > 0) {
      currentBalance = users[0].points_balance || 0;
      userId = users[0].id;
      userTier = users[0].tier || 'member';
    }

    // Get earn percentage based on tier
    const earnPercentage = getTierEarnPercentage(userTier);

    // Calculate points (percentage of order total)
    const orderTotal = order.total_price_ils || 0;
    const pointsToEarn = Math.floor(orderTotal * earnPercentage);

    if (pointsToEarn <= 0) {
      return Response.json({ 
        success: false, 
        message: 'No points to earn' 
      });
    }

    const newBalance = currentBalance + pointsToEarn;

    // Update user balance and order count
    if (userId) {
      const currentOrders = users[0].orders_last_6_months || 0;
      await base44.asServiceRole.entities.User.update(userId, {
        points_balance: newBalance,
        orders_last_6_months: currentOrders + 1
      });
    }

    // Create ledger entry
    await base44.asServiceRole.entities.PointsLedger.create({
      user_email: order.customer_email,
      type: 'earn',
      amount: pointsToEarn,
      source: order.order_number,
      description: `צבירת ${Math.round(earnPercentage * 100)}% מהזמנה #${order.order_number}`,
      balance_after: newBalance
    });

    return Response.json({ 
      success: true, 
      points_earned: pointsToEarn,
      new_balance: newBalance,
      tier: userTier,
      earn_percentage: earnPercentage
    });

  } catch (error) {
    console.error('Error in earnPoints:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});