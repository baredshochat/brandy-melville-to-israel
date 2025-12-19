import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { birthday, phone, marketing_opt_in } = await req.json();

    // Get current user data
    const users = await base44.asServiceRole.entities.User.filter({
      email: user.email
    });

    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = users[0];

    // Check if already a member
    if (userData.club_member) {
      return Response.json({ 
        success: false, 
        message: 'כבר חבר מועדון' 
      });
    }

    // Update user - join club with automatic marketing opt-in
    const updateData = {
      club_member: true,
      birthday: birthday || userData.birthday,
      phone: phone || userData.phone,
      marketing_opt_in: marketing_opt_in !== false, // Default to true
      marketing_source: 'loyalty_signup'
    };

    // Add timestamp if opting in
    if (updateData.marketing_opt_in) {
      updateData.marketing_opt_in_at = new Date().toISOString();
    }

    await base44.asServiceRole.entities.User.update(userData.id, updateData);

    // Trigger signup coupon creation
    try {
      await base44.asServiceRole.functions.invoke('createSignupCoupon', {
        user_id: userData.id
      });
    } catch (e) {
      console.error('Failed to create signup coupon:', e.message);
    }

    return Response.json({ 
      success: true,
      message: 'הצטרפת בהצלחה למועדון!'
    });

  } catch (error) {
    console.error('Error in joinClub:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});