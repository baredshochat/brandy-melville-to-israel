import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me || me.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user_id, delta, reason } = await req.json();

    if (!user_id || typeof delta !== 'number') {
      return Response.json({ error: 'Missing user_id or delta' }, { status: 400 });
    }

    // ✅ Fetch user by ID (SAFE)
    const user = await base44.asServiceRole.entities.User.get(user_id);

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // ✅ Block non-club members
    if (user.club_member !== true) {
      return Response.json(
        { error: 'User is not an active club member' },
        { status: 403 }
      );
    }

    const current = Number(user.points_balance || 0);
    const newBalance = Math.max(0, current + delta);

    // ✅ Single source of truth
    await base44.asServiceRole.entities.User.update(user.id, {
      points_balance: newBalance,
    });

    // ✅ Ledger
    await base44.asServiceRole.entities.PointsLedger.create({
      user_id: user.id,
      type: 'admin_adjustment',
      amount: delta,
      source: 'admin',
      description: reason || 'Admin adjustment',
      balance_after: newBalance,
    });

    return Response.json({
      success: true,
      user_id: user.id,
      new_balance: newBalance,
    });
  } catch (err) {
    return Response.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
});
