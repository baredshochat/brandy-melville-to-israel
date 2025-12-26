import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import JSZip from 'npm:jszip@3.10.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { order_ids } = await req.json();
    
    if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
      return Response.json({ error: 'order_ids array is required' }, { status: 400 });
    }

    // Get the active template
    const templates = await base44.asServiceRole.entities.OrderTemplate.filter({ is_active: true });
    if (!templates || templates.length === 0) {
      return Response.json({ error: 'No active template found' }, { status: 404 });
    }

    const template = templates[0];

    // Parse the template - it's now stored as JSON with enabled blocks
    let templateContent = '';
    try {
      const parsed = JSON.parse(template.content);
      if (parsed.enabledBlocks) {
        // Build HTML from enabled blocks
        const DOCUMENT_BLOCKS = [
          {
            id: 'header',
            html: `
              <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 28px;">Brandy Melville to Israel</h1>
                <p style="margin: 5px 0 0 0; color: #666;">מסמך הזמנה</p>
              </div>
            `
          },
          {
            id: 'order_info',
            html: `
              <div style="margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <div><strong>מספר הזמנה:</strong> {{order_number}}</div>
                  <div><strong>תאריך:</strong> {{created_date}}</div>
                </div>
              </div>
            `
          },
          {
            id: 'customer_info',
            html: `
              <div style="margin-bottom: 30px;">
                <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">פרטי לקוחה</h2>
                <div style="margin-top: 10px;">
                  <div><strong>שם:</strong> {{customer_name}}</div>
                  <div><strong>אימייל:</strong> {{customer_email}}</div>
                  <div><strong>טלפון:</strong> {{customer_phone}}</div>
                  <div><strong>כתובת משלוח:</strong> {{shipping_address}}, {{city}}</div>
                </div>
              </div>
            `
          },
          {
            id: 'items_table',
            html: `
              <div style="margin-bottom: 30px;">
                <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">פריטים בהזמנה</h2>
                {{items_table}}
              </div>
            `
          },
          {
            id: 'payment_summary',
            html: `
              <div style="margin-bottom: 30px;">
                <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">סיכום תשלום</h2>
                <div style="margin-top: 10px;">
                  <div style="display: flex; justify-content: space-between;"><span>סכום ביניים:</span><span>₪{{subtotal}}</span></div>
                  <div style="display: flex; justify-content: space-between;"><span>משלוח:</span><span>₪{{shipping_cost}}</span></div>
                  <div style="display: flex; justify-content: space-between;"><span>מע״מ (18%):</span><span>₪{{vat}}</span></div>
                  <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000;">
                    <span>סה״כ לתשלום:</span><span>₪{{total}}</span>
                  </div>
                </div>
              </div>
            `
          },
          {
            id: 'footer',
            html: `
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 12px;">
                <p>תודה שבחרת בנו! 💖</p>
                <p>Brandy Melville to Israel - הדרך הקלה להזמין ברנדי</p>
              </div>
            `
          }
        ];

        const enabledBlocksHTML = DOCUMENT_BLOCKS
          .filter(block => parsed.enabledBlocks[block.id])
          .map(block => block.html)
          .join('\n');

        templateContent = `
          <div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif; direction: rtl;">
            ${enabledBlocksHTML}
          </div>
        `;
      } else {
        templateContent = template.content;
      }
    } catch {
      // Old format - use as-is
      templateContent = template.content || '';
    }

    // If single order - return PDF directly
    if (order_ids.length === 1) {
      const orders = await base44.asServiceRole.entities.Order.filter({ id: order_ids[0] });
      const order = orders[0];
      
      if (!order) {
        return Response.json({ error: 'Order not found' }, { status: 404 });
      }

      const pdfBytes = generateSinglePdf(order, templateContent);
      
      return new Response(pdfBytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="order_${order.order_number}.pdf"`
        }
      });
    }

    // Multiple orders - create a ZIP file
    const zip = new JSZip();
    
    for (const orderId of order_ids) {
      const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
      const order = orders[0];
      
      if (!order) continue;
      
      const pdfBytes = generateSinglePdf(order, templateContent);
      zip.file(`order_${order.order_number}.pdf`, pdfBytes);
    }

    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    
    return new Response(zipBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="orders_${new Date().toISOString().split('T')[0]}.zip"`
      }
    });

  } catch (error) {
    console.error('Generate PDF error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateSinglePdf(order, templateContent) {
  // Replace placeholders with actual data
  let processed = templateContent;
  
  // Basic placeholders
  processed = processed.replace(/{{order_number}}/g, order.order_number || '');
  processed = processed.replace(/{{created_date}}/g, order.created_date ? new Date(order.created_date).toLocaleDateString('he-IL') : '');
  processed = processed.replace(/{{customer_name}}/g, order.customer_name || '');
  processed = processed.replace(/{{customer_email}}/g, order.customer_email || '');
  processed = processed.replace(/{{customer_phone}}/g, order.customer_phone || '');
  processed = processed.replace(/{{shipping_address}}/g, order.shipping_address || '');
  processed = processed.replace(/{{city}}/g, order.city || '');
  
  // Financial data
  const breakdown = order.price_breakdown || {};
  processed = processed.replace(/{{subtotal}}/g, (breakdown.cartSubtotal || 0).toLocaleString());
  processed = processed.replace(/{{shipping_cost}}/g, (breakdown.domesticShipping || 35).toLocaleString());
  processed = processed.replace(/{{vat}}/g, (breakdown.vat || 0).toLocaleString());
  processed = processed.replace(/{{total}}/g, (order.total_price_ils || 0).toLocaleString());
  processed = processed.replace(/{{total_price_ils}}/g, (order.total_price_ils || 0).toLocaleString());

  // Process items table
  if (processed.includes('{{items_table}}')) {
    const itemsTableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">מוצר</th>
            <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">צבע</th>
            <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">מידה</th>
            <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">כמות</th>
            <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">מחיר</th>
          </tr>
        </thead>
        <tbody>
          ${(order.items || []).map(item => `
            <tr>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.product_name || ''}</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.color || '—'}</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.size || '—'}</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.quantity || 1}</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">₪${(item.customer_price_ils || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    processed = processed.replace(/{{items_table}}/g, itemsTableHtml);
  }

  // Create PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Convert HTML to PDF text (basic implementation)
  // Remove HTML tags for simple text rendering
  const tempDiv = { innerHTML: processed };
  const plainText = processed.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
  
  // Add RTL support
  doc.setR2L(true);
  doc.setFont('helvetica');
  doc.setFontSize(10);
  
  // Split text into lines and add to PDF
  const lines = doc.splitTextToSize(plainText, 180);
  let y = 20;
  
  lines.forEach(line => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 200, y, { align: 'right' });
    y += 7;
  });

  return doc.output('arraybuffer');
}