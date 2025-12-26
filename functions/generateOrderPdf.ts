import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

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
    const templateContent = template.content || '';

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
    // For now, we'll return an error asking to download one by one
    // In future, can use a ZIP library
    return Response.json({ 
      error: 'Bulk download coming soon - please download orders one by one for now' 
    }, { status: 501 });

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