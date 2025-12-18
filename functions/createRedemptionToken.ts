import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    // 1. Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { points_amount } = await req.json();
    
    if (!points_amount || points_amount <= 0) {
      return Response.json({ error: 'Invalid points_amount' }, { status: 400 });
    }

    // 2. Check if user is club member
    if (!user.club_member) {
      return Response.json({ 
        error: 'You must be an active club member to redeem points',
        code: 'NOT_CLUB_MEMBER'
      }, { status: 403 });
    }

    // 3. Check if user has enough points
    const currentBalance = user.points_balance || 0;
    if (currentBalance < points_amount) {
      return Response.json({ 
        error: `Insufficient points. Available: ${currentBalance}, Requested: ${points_amount}`,
        code: 'INSUFFICIENT_POINTS',
        available_points: currentBalance
      }, { status: 400 });
    }

    // 4. Create redemption token with 5-minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    const token = await base44.asServiceRole.entities.RedemptionToken.create({
      user_id: user.id,
      points_amount: points_amount,
      status: 'active',
      expires_at: expiresAt,
      used_at: null,
      order_id: null
    });

    // Normalize response
    const tokenId = token?.id || token?.data?.id || token;

    return Response.json({ 
      success: true,
      token_id: tokenId,
      points_amount: points_amount,
      expires_at: expiresAt
    });

  } catch (error) {
    console.error('Error in createRedemptionToken:', error);
    return Response.json({ 
      error: error.message,
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
});