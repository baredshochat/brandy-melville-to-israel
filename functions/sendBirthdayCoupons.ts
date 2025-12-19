import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Find active birthday template
    const templates = await base44.asServiceRole.entities.CouponTemplate.filter({ 
      event_type: 'birthday',
      is_active: true 
    });
    
    if (!templates || templates.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No active birthday template found',
        sent: 0
      });
    }
    
    const template = templates[0];
    const currentMonth = new Date().getMonth(); // 0-11
    const currentYear = new Date().getFullYear();

    // Get all users with marketing opt-in
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    // Filter users with birthday this month
    const usersWithBirthday = allUsers.filter(user => {
      if (!user.birthday) return false;
      const birthDate = new Date(user.birthday);
      return birthDate.getMonth() === currentMonth;
    });

    const results = [];

    for (const user of usersWithBirthday) {
      try {
        // Check if user already received birthday coupon this year
        const existingCoupons = await base44.asServiceRole.entities.UserCoupon.filter({
          user_id: user.id,
          template_id: template.id
        });

        const hasCurrentYearCoupon = existingCoupons?.some(coupon => {
          const couponYear = new Date(coupon.created_date).getFullYear();
          return couponYear === currentYear;
        });

        if (hasCurrentYearCoupon) {
          results.push({ 
            user_id: user.id, 
            success: false, 
            reason: 'Already received birthday coupon this year' 
          });
          continue;
        }

        // Check opt-in if required
        if (template.send_to_opted_in_only && !user.marketing_opt_in) {
          results.push({ 
            user_id: user.id, 
            success: false, 
            reason: 'User has not opted in to marketing' 
          });
          continue;
        }

        // Generate unique coupon code
        const firstName = (user.full_name || '').split(' ')[0] || 'USER';
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        let couponCode = template.code_prefix || 'COUPON-';
        
        if (template.code_suffix_template) {
          const suffix = template.code_suffix_template
            .replace('{first_name}', firstName)
            .replace('{user_id}', user.id.substring(0, 6))
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
          user_id: user.id,
          user_email: user.email,
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
        const emailSubject = (template.email_subject || 'קופון יום הולדת מיוחד! 🎂')
          .replace('{user_name}', user.full_name || 'לקוחה יקרה')
          .replace('{coupon_code}', couponCode);

        const emailBody = (template.email_body_template || `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>יום הולדת שמח {user_name}! 🎂</h2>
            <p>לכבוד יום ההולדת שלך, הכנו לך קופון הנחה מיוחד:</p>
            <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="margin: 0; color: #e91e63;">{coupon_code}</h1>
            </div>
            <p><strong>ההנחה שלך:</strong> ${template.discount_type === 'percentage' ? template.discount_value + '%' : '₪' + template.discount_value}</p>
            <p><strong>תוקף:</strong> עד {valid_until_date}</p>
            <p>להזמנה חדשה, הזיני את הקוד בקופה ותיהני מההנחה!</p>
          </div>
        `)
          .replace(/{user_name}/g, user.full_name || 'לקוחה יקרה')
          .replace(/{coupon_code}/g, couponCode)
          .replace(/{valid_until_date}/g, validUntilDate);

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Brandy Melville to Israel',
          to: user.email,
          subject: emailSubject,
          body: emailBody
        });

        results.push({ 
          user_id: user.id, 
          success: true, 
          coupon_code: couponCode 
        });

      } catch (err) {
        console.error('Error processing user:', user.id, err);
        results.push({ 
          user_id: user.id, 
          success: false, 
          error: err.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return Response.json({ 
      success: true,
      message: `נשלחו ${successCount} קופוני יום הולדת`,
      total_birthday_users: usersWithBirthday.length,
      sent: successCount,
      results 
    });

  } catch (error) {
    console.error('Error in sendBirthdayCoupons:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});