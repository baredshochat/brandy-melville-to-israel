import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return Response.json({ error: 'Missing text' }, { status: 400 });
    }
    
    // ניתוח הטקסט
    const items = parseInventoryText(text);
    
    return Response.json({ success: true, items });
  } catch (error) {
    console.error('Parse error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function parseInventoryText(text) {
  const items = [];
  
  // דפוס לזיהוי פריט: שם המוצר × כמות
  // לדוגמה: "Erica Sweatshirt × 1"
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let currentItem = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // בדיקה אם זו שורת מוצר חדש (מכילה × או x עם מספר)
    const productMatch = line.match(/^(.+?)\s*[×x]\s*(\d+)$/i);
    
    if (productMatch) {
      // שמירת פריט קודם אם קיים
      if (currentItem && currentItem.product_name) {
        items.push(currentItem);
      }
      
      // יצירת פריט חדש
      currentItem = {
        product_name: productMatch[1].trim(),
        quantity: parseInt(productMatch[2]),
        color: '',
        size: '',
        actual_cost_price: '',
        actual_cost_currency: 'GBP',
        product_sku: '',
        source_url: '',
        notes: ''
      };
    }
    // בדיקה אם זו שורת צבע/מידה
    else if (currentItem && line.includes('/')) {
      const parts = line.split('/').map(p => p.trim());
      if (parts.length >= 1) {
        currentItem.color = parts[0];
      }
      if (parts.length >= 2) {
        currentItem.size = parts[1];
      }
    }
    // בדיקה אם זו שורת מחיר (מכילה סימן מטבע)
    else if (currentItem && /[£$€₪]/.test(line)) {
      const priceMatch = line.match(/([£$€₪])?\s*(\d+(?:\.\d{2})?)\s*(GBP|USD|EUR|ILS)?/);
      if (priceMatch) {
        currentItem.actual_cost_price = parseFloat(priceMatch[2]);
        
        // זיהוי מטבע
        const currencySymbol = priceMatch[1];
        const currencyCode = priceMatch[3];
        
        if (currencyCode) {
          currentItem.actual_cost_currency = currencyCode;
        } else if (currencySymbol) {
          const currencyMap = {
            '£': 'GBP',
            '$': 'USD',
            '€': 'EUR',
            '₪': 'ILS'
          };
          currentItem.actual_cost_currency = currencyMap[currencySymbol] || 'USD';
        }
      }
    }
    // בדיקה אם זו שורה שמכילה רק גודל (לדוגמה "Oversized Fit" או "XS/S")
    else if (currentItem && !currentItem.color && !line.includes('×') && !line.includes('x') && line.length < 30) {
      // אם עדיין לא מילאנו צבע/מידה, זה יכול להיות מידה או גודל
      if (currentItem.size === '') {
        currentItem.size = line;
      } else if (currentItem.color === '') {
        currentItem.color = line;
      }
    }
  }
  
  // הוספת הפריט האחרון
  if (currentItem && currentItem.product_name) {
    items.push(currentItem);
  }
  
  return items;
}