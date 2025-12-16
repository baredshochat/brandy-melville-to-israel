import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { text } = await req.json();
    
    if (!text || !text.trim()) {
      return Response.json({ 
        success: false, 
        error: 'חסר טקסט לניתוח' 
      }, { status: 400 });
    }

    // שימוש ב-LLM לניתוח הטקסט
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `נתח את הטקסט הבא שמכיל רשימת פריטים מהזמנה אונליין.
חלץ את פרטי הפריטים לפי הפורמט המבוקש.

הטקסט:
${text}

כללי ניתוח:
1. זהה כל פריט לפי תבנית של: שם מוצר × כמות
2. חלץ צבע ומידה (בדרך כלל מופיעים אחרי שם המוצר, מופרדים ב-/)
3. חלץ מחיר (יכול להיות £, $, € או ללא סימן)
4. זהה את המטבע לפי הסימן (£ = GBP, $ = USD, € = EUR)
5. אם אין כמות מפורשת, הנח כמות של 1
6. התעלם משורות כמו Subtotal, Shipping, Taxes, Total

החזר רק את הפריטים עצמם, לא את סיכומי המחיר.`,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                quantity: { type: "number" },
                color: { type: "string" },
                size: { type: "string" },
                actual_cost_price: { type: "number" },
                actual_cost_currency: { type: "string", enum: ["USD", "EUR", "GBP", "ILS"] }
              },
              required: ["product_name", "quantity", "actual_cost_price", "actual_cost_currency"]
            }
          }
        },
        required: ["items"]
      }
    });

    if (!result || !result.items || result.items.length === 0) {
      return Response.json({
        success: false,
        error: 'לא הצלחתי לזהות פריטים בטקסט. נסי להדביק טקסט אחר או להזין ידנית.'
      });
    }

    return Response.json({
      success: true,
      items: result.items
    });

  } catch (error) {
    console.error('Error parsing inventory:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'שגיאה בניתוח הטקסט' 
    }, { status: 500 });
  }
});