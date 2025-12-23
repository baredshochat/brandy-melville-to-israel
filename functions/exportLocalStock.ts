import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { filters, sendEmail, recipientEmail } = await req.json();
    
    // Fetch all items
    let items = await base44.asServiceRole.entities.LocalStockItem.list();
    
    // Apply filters
    if (filters) {
      if (filters.isAvailable !== 'all') {
        items = items.filter(item => item.is_available === (filters.isAvailable === 'true'));
      }
      if (filters.isHidden !== 'all') {
        items = items.filter(item => item.is_hidden === (filters.isHidden === 'true'));
      }
      if (filters.inStock !== 'all') {
        if (filters.inStock === 'true') {
          items = items.filter(item => item.quantity_available > 0);
        } else {
          items = items.filter(item => item.quantity_available === 0);
        }
      }
      if (filters.category && filters.category !== 'all') {
        items = items.filter(item => item.category === filters.category);
      }
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        items = items.filter(item => 
          item.product_name?.toLowerCase().includes(query) ||
          item.product_description?.toLowerCase().includes(query) ||
          item.internal_sku?.toLowerCase().includes(query)
        );
      }
    }

    // Generate CSV
    const headers = [
      'מק״ט פנימי',
      'שם המוצר',
      'תיאור',
      'קטגוריה',
      'מחיר (₪)',
      'כמות במלאי',
      'זמין למכירה',
      'מוסתר',
      'צבע',
      'מידה',
      'משקל (ק״ג)',
      'משלוח חינם',
      'תאריך יצירה',
      'קישור מקור'
    ];

    const categoryNames = {
      tops: 'חולצות וטופים',
      bottoms: 'מכנסיים וחצאיות',
      dresses: 'שמלות',
      sweaters: 'סוודרים וסווטשירטים',
      accessories: 'אביזרים',
      other: 'אחר'
    };

    const rows = items.map(item => [
      item.internal_sku || '',
      item.product_name || '',
      item.product_description || '',
      categoryNames[item.category] || item.category || '',
      item.price_ils || 0,
      item.quantity_available || 0,
      item.is_available ? 'כן' : 'לא',
      item.is_hidden ? 'כן' : 'לא',
      item.color || '',
      item.size || '',
      item.weight_kg || 0,
      item.free_shipping ? 'כן' : 'לא',
      new Date(item.created_date).toLocaleDateString('he-IL'),
      item.source_url || ''
    ]);

    // Build CSV content with UTF-8 BOM for Hebrew support
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Calculate totals
    const totalValue = items.reduce((sum, item) => sum + (item.price_ils * item.quantity_available), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity_available, 0);

    // If email requested, send it
    if (sendEmail && recipientEmail) {
      const emailHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Assistant, Arial, sans-serif; direction: rtl; }
            .summary { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .summary-item { margin: 10px 0; font-size: 16px; }
            .summary-item strong { color: #443E41; }
          </style>
        </head>
        <body>
          <h2>דוח מלאי מקומי - ${new Date().toLocaleDateString('he-IL')}</h2>
          
          <div class="summary">
            <div class="summary-item"><strong>סה״כ פריטים:</strong> ${items.length} סוגי מוצרים</div>
            <div class="summary-item"><strong>סה״כ יחידות במלאי:</strong> ${totalItems}</div>
            <div class="summary-item"><strong>שווי מלאי משוער:</strong> ₪${totalValue.toFixed(2)}</div>
          </div>

          <p>הדוח המלא מצורף בקובץ CSV.</p>
          <p>בברכה,<br>מערכת Brandy Melville to Israel</p>
        </body>
        </html>
      `;

      // Create file as blob and upload
      const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `stock_report_${new Date().toISOString().split('T')[0]}.csv`;
      
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Brandy Melville to Israel',
        to: recipientEmail,
        subject: `דוח מלאי - ${new Date().toLocaleDateString('he-IL')}`,
        body: emailHtml
      });
    }

    // Return CSV for download
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8;',
        'Content-Disposition': `attachment; filename="stock_report_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});