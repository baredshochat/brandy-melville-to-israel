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
    const baseUrl = "https://direct.tranzila.com";
    
    // Generate success and failure URLs
    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const successUrl = `${origin}/TrackOrder?order=${orderNumber}&payment=success`;
    const failUrl = `${origin}/Home?payment=failed&order=${orderNumber}`;
    const notifyUrl = `${origin}/api/tranzilaWebhook`;

    // Tranzila parameters
    const params = new URLSearchParams({
      supplier: terminalName,
      sum: amount.toString(),
      currency: '1', // 1 = ILS
      cred_type: '1', // Regular transaction
      tranmode: 'A', // Authorization + Capture
      order_id: orderNumber,
      contact: customerName || '',
      email: customerEmail || '',
      phone: customerPhone || '',
      success_url_address: successUrl,
      fail_url_address: failUrl,
      notify_url_address: notifyUrl,
      lang: 'il', // Hebrew interface
      trButtonColor: '000000', // Black button
      buttonLabel: 'לתשלום מאובטח',
      nologo: '1',
      hidesum: '0',
    });

    const paymentUrl = `${baseUrl}/${terminalName}/iframe.php?${params.toString()}`;

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