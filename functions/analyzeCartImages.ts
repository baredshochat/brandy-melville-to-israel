import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_urls, site } = await req.json();

    if (!file_urls || !Array.isArray(file_urls) || file_urls.length === 0) {
      return Response.json({ error: 'No images provided' }, { status: 400 });
    }

    if (!site) {
      return Response.json({ error: 'Site is required' }, { status: 400 });
    }

    // Define currency based on site
    const siteCurrency = {
      'us': 'USD',
      'eu': 'EUR',
      'uk': 'GBP'
    };
    const expectedCurrency = siteCurrency[site] || 'USD';

    // Call LLM with images
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing shopping cart images from Brandy Melville ${site.toUpperCase()} website.

CRITICAL INSTRUCTIONS:

EXTRACT ALL ITEMS from the shopping cart screenshot(s). For each item, identify:

1. **Product Name** (in English, as shown on the website)
2. **Price** - CRITICAL RULE: Extract the CURRENT ACTIVE price only
   - NEVER use crossed-out prices
   - NEVER use "was" or "original" prices
   - ONLY the price customer will actually pay
   - Return as number without currency symbol
3. **Color** (if visible/specified)
4. **Size** (if visible/specified)
5. **Quantity** (as shown in cart, default to 1 if not visible)
6. **Product URL** (if visible in the image, otherwise return null)

IMPORTANT NOTES:
- If you see multiple items, return ALL of them
- Return empty string for color/size if not specified
- Price must be the FINAL price shown in cart (after any discounts)
- Currency should be ${expectedCurrency}
- If item URL is not visible in screenshot, set it to null

Extract ALL items you can identify from the cart.`,
      add_context_from_internet: false,
      file_urls: file_urls,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                price: { type: "number" },
                color: { type: "string" },
                size: { type: "string" },
                quantity: { type: "number" },
                product_url: { type: ["string", "null"] }
              },
              required: ["product_name", "price", "quantity"]
            }
          }
        },
        required: ["items"]
      }
    });

    // Normalize result
    let parsedResult = result;
    if (typeof Response !== 'undefined' && result instanceof Response) {
      parsedResult = await result.json();
    } else if (result && typeof result === 'object' && 'data' in result) {
      parsedResult = result.data;
    }

    const items = parsedResult?.items || [];

    if (items.length === 0) {
      return Response.json({ 
        error: 'לא זוהו פריטים בתמונות. אנא וודאי שהתמונה מציגה את עגלת הקניות בבירור.',
        items: []
      }, { status: 400 });
    }

    // Format items with site and currency
    const formattedItems = items.map(item => ({
      product_name: item.product_name,
      original_price: item.price,
      original_currency: expectedCurrency,
      color: item.color || '',
      size: item.size || '',
      quantity: item.quantity || 1,
      product_url: item.product_url || '',
      site: site,
      product_sku: 'SKU לא נמצא',
      product_description: 'זוהה מתמונת עגלה',
      confidence: 'medium'
    }));

    return Response.json({ 
      success: true,
      items: formattedItems,
      count: formattedItems.length
    });

  } catch (error) {
    console.error('Error analyzing cart images:', error);
    return Response.json({ 
      error: 'שגיאה בניתוח התמונות. אנא נסי שוב.',
      details: error.message 
    }, { status: 500 });
  }
});