import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin authentication
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { to, subject, body, from_name } = await req.json();

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) {
      return Response.json({ 
        error: 'SENDGRID_API_KEY not configured. Please set it in environment variables.' 
      }, { status: 500 });
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to.trim() }]
        }],
        from: {
          email: 'Brandyorder@gmail.com',
          name: from_name || 'Brandy Melville to Israel'
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: body
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid error:', errorText);
      return Response.json({ 
        error: `SendGrid error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    return Response.json({ success: true, message: 'Email sent successfully' });

  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ 
      error: error.message || 'Failed to send email' 
    }, { status: 500 });
  }
});