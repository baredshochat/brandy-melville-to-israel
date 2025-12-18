import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { user_email, delta, reason } = await req.json();
    if (!user_email || typeof delta !== 'number') {
      return Response.json({ error: 'Missing user_email or delta' }, { status: 400 });
    }

    // Find the target user by email (service role)
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const target = users[0];

    const current = Number(target.points_balance || 0);
    const newBalance = Math.max(0, current + delta);

    // ✅ FIX #3: Direct update to points_balance as single source of truth
    await base44.asServiceRole.entities.User.update(target.id, { 
      points_balance: newBalance
    });

    const type = delta >= 0 ? 'admin_add' : 'admin_deduct';
    await base44.asServiceRole.entities.PointsLedger.create({
      user_email,
      type: 'admin_adjustment',
      amount: delta,
      source: 'admin',
      description: reason || 'Admin adjustment',
      balance_after: newBalance,
    });

    return Response.json({ success: true, user_email, new_balance: newBalance });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});