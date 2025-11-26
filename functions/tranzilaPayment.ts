import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, amount, orderNumber, customerEmail, customerName, customerPhone } = await req.json();

    if (!orderId || !amount || !orderNumber) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const terminalName = Deno.env.get("TRANZILA_TERMINAL_NAME");

    if (!terminalName) {
      return Response.json({ error: 'Tranzila not configured' }, { status: 500 });
    }

    // Build Tranzila payment page URL
    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const successUrl = `${origin}/TrackOrder?order=${orderNumber}&payment=success`;
    const failUrl = `${origin}/Home?payment=failed&order=${orderNumber}`;

    // Tranzila parameters - sum should be a number without decimals for ILS
    const sumInAgorot = Math.round(amount * 100) / 100;
    
    const params = new URLSearchParams();
    params.append('sum', sumInAgorot.toString());
    params.append('currency', '1'); // 1 = ILS
    params.append('cred_type', '1'); // Regular credit
    params.append('tranmode', 'A'); // Auth + Capture
    params.append('myid', orderNumber);
    if (customerName) params.append('contact', customerName);
    if (customerEmail) params.append('email', customerEmail);
    if (customerPhone) params.append('phone', customerPhone);
    params.append('success_url_address', successUrl);
    params.append('fail_url_address', failUrl);

    const paymentUrl = `https://direct.tranzila.com/brandyorder/?${params.toString()}`;

    // Update order with pending payment status
    await base44.asServiceRole.entities.Order.update(orderId, {
      payment_status: 'pending',
      internal_notes: `Payment initiated at ${new Date().toISOString()}`
    });

    return Response.json({ 
      paymentUrl,
      orderNumber
    });

  } catch (error) {
    console.error('Tranzila payment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});