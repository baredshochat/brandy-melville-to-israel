import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { campaign_id, campaign_name, subject, html_body } = await req.json();

    if (!campaign_id || !subject || !html_body) {
      return Response.json({ 
        error: 'Missing required fields: campaign_id, subject, html_body' 
      }, { status: 400 });
    }

    // Get marketing audience - users who opted in and are not unsubscribed/blocked
    const audience = await base44.asServiceRole.entities.User.filter({
      marketing_opt_in: true,
      blocked_from_marketing: false,
      email: { $ne: null }
    });

    // Filter out users with unsubscribed_at date
    const eligibleUsers = audience.filter(u => !u.unsubscribed_at);

    if (eligibleUsers.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No eligible users to send to',
        sent: 0 
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    // Send emails
    for (const recipient of eligibleUsers) {
      try {
        // Add unsubscribe link to email body
        const unsubscribeUrl = `${new URL(req.url).origin}/api/functions/unsubscribeFromMarketing?email=${encodeURIComponent(recipient.email)}`;
        const bodyWithUnsubscribe = html_body.replace(
          '</body>',
          `<div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
            <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">לחצי כאן להסרה מרשימת התפוצה</a>
          </div></body>`
        );

        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Brandy Melville to Israel',
          to: recipient.email,
          subject: subject,
          body: bodyWithUnsubscribe
        });

        // Log successful send
        await base44.asServiceRole.entities.MarketingLog.create({
          user_email: recipient.email,
          campaign_id: campaign_id,
          campaign_name: campaign_name || campaign_id,
          subject: subject,
          status: 'sent',
          sent_at: new Date().toISOString()
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${recipient.email}:`, error);
        
        // Log failed send
        await base44.asServiceRole.entities.MarketingLog.create({
          user_email: recipient.email,
          campaign_id: campaign_id,
          campaign_name: campaign_name || campaign_id,
          subject: subject,
          status: 'failed',
          sent_at: new Date().toISOString()
        });

        failedCount++;
      }
    }

    return Response.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total_audience: eligibleUsers.length
    });

  } catch (error) {
    console.error('Campaign error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});