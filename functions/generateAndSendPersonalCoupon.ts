import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { template_id, user_ids } = await req.json();
    
    if (!template_id || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return Response.json({ 
        error: 'Missing required fields: template_id and user_ids array' 
      }, { status: 400 });
    }

    // Load template
    const templates = await base44.asServiceRole.entities.CouponTemplate.filter({ id: template_id });
    if (!templates || templates.length === 0) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }
    const template = templates[0];

    if (!template.is_active) {
      return Response.json({ error: 'Template is not active' }, { status: 400 });
    }

    const results = [];

    // Process each user
    for (const userId of user_ids) {
      try {
        // Load user
        const users = await base44.asServiceRole.entities.User.filter({ id: userId });
        if (!users || users.length === 0) {
          results.push({ user_id: userId, success: false, error: 'User not found' });
          continue;
        }
        const targetUser = users[0];

        // Check opt-in if required
        if (template.send_to_opted_in_only && !targetUser.marketing_opt_in) {
          results.push({ 
            user_id: userId, 
            success: false, 
            error: 'User has not opted in to marketing emails' 
          });
          continue;
        }

        // Generate unique coupon code
        const firstName = (targetUser.full_name || '').split(' ')[0] || 'USER';
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        let couponCode = template.code_prefix || 'COUPON-';
        
        if (template.code_suffix_template) {
          const suffix = template.code_suffix_template
            .replace('{first_name}', firstName)
            .replace('{user_id}', userId.substring(0, 6))
            .replace('{random}', randomSuffix);
          couponCode += suffix;
        } else {
          couponCode += randomSuffix;
        }
        
        // Convert to uppercase for consistency
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
          // Default 30 days
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30);
          validUntil = expiryDate.toISOString();
        }

        // Create UserCoupon
        const userCoupon = await base44.asServiceRole.entities.UserCoupon.create({
          user_id: userId,
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

        results.push({ 
          user_id: userId, 
          success: true, 
          coupon_code: couponCode,
          email: targetUser.email
        });

      } catch (err) {
        console.error('Error processing user:', userId, err);
        results.push({ 
          user_id: userId, 
          success: false, 
          error: err.message || 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return Response.json({ 
      success: true,
      message: `נשלחו ${successCount} קופונים בהצלחה${failCount > 0 ? `, ${failCount} נכשלו` : ''}`,
      results 
    });

  } catch (error) {
    console.error('Error in generateAndSendPersonalCoupon:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});