import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { user_id } = await req.json();
    
    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Find active signup template
    const templates = await base44.asServiceRole.entities.CouponTemplate.filter({ 
      event_type: 'signup',
      is_active: true 
    });
    
    if (!templates || templates.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No active signup template found' 
      });
    }
    
    const template = templates[0];

    // Check if user already has a signup coupon from this template
    const existingCoupons = await base44.asServiceRole.entities.UserCoupon.filter({
      user_id: user_id,
      template_id: template.id
    });

    if (existingCoupons && existingCoupons.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'User already has a signup coupon' 
      });
    }

    // Load user
    const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    const targetUser = users[0];

    // Generate unique coupon code
    const firstName = (targetUser.full_name || '').split(' ')[0] || 'USER';
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    let couponCode = template.code_prefix || 'COUPON-';
    
    if (template.code_suffix_template) {
      const suffix = template.code_suffix_template
        .replace('{first_name}', firstName)
        .replace('{user_id}', user_id.substring(0, 6))
        .replace('{random}', randomSuffix);
      couponCode += suffix;
    } else {
      couponCode += randomSuffix;
    }
    
    couponCode = couponCode.toUpperCase();

    // Calculate expiry date
    let validUntil;
    if (template.valid_until) {
      validUntil = new Date(template.valid_until).toISOString();
    } else if (template.valid_days) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + template.valid_days);
      validUntil = expiryDate.toISOString();
    } else {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      validUntil = expiryDate.toISOString();
    }

    // Create UserCoupon
    await base44.asServiceRole.entities.UserCoupon.create({
      user_id: user_id,
      user_email: targetUser.email,
      coupon_code: couponCode,
      template_id: template.id,
      template_name: template.name,
      discount_type: template.discount_type,
      discount_value: template.discount_value || 0,
      buy_quantity: template.buy_quantity || null,
      get_quantity: template.get_quantity || null,
      valid_until: validUntil,
      status: 'active',
      usage_limit_per_user: template.usage_limit_per_user || 1,
      sent_at: new Date().toISOString(),
      is_personal: true
    });

    // Prepare email content
    const validUntilDate = new Date(validUntil).toLocaleDateString('he-IL');
    const emailSubject = (template.email_subject || 'קופון הנחה מיוחד עבורך! 🎁')
      .replace('{user_name}', targetUser.full_name || 'לקוחה יקרה')
      .replace('{coupon_code}', couponCode);

    const emailBody = (template.email_body_template || `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>שלום {user_name}!</h2>
        <p>שמחים לשלוח לך קופון הנחה מיוחד:</p>
        <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="margin: 0; color: #e91e63;">{coupon_code}</h1>
        </div>
        <p><strong>ההנחה שלך:</strong> ${template.discount_type === 'percentage' ? template.discount_value + '%' : '₪' + template.discount_value}</p>
        <p><strong>תוקף:</strong> עד {valid_until_date}</p>
        <p>להזמנה חדשה, הזיני את הקוד בקופה ותיהני מההנחה!</p>
      </div>
    `)
      .replace(/{user_name}/g, targetUser.full_name || 'לקוחה יקרה')
      .replace(/{coupon_code}/g, couponCode)
      .replace(/{valid_until_date}/g, validUntilDate);

    // Send email
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Brandy Melville to Israel',
      to: targetUser.email,
      subject: emailSubject,
      body: emailBody
    });

    return Response.json({ 
      success: true, 
      message: 'Signup coupon created and sent',
      coupon_code: couponCode
    });

  } catch (error) {
    console.error('Error in createSignupCoupon:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});