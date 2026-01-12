import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrls, site } = await req.json();
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return Response.json({ error: 'No images provided' }, { status: 400 });
    }

    if (!site) {
      return Response.json({ error: 'Site is required' }, { status: 400 });
    }

    // Map site to currency
    const currencyMap = {
      'us': 'USD',
      'eu': 'EUR',
      'uk': 'GBP'
    };
    const expectedCurrency = currencyMap[site] || 'USD';

    // Analyze images using LLM with vision capability
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are analyzing shopping cart screenshots from Brandy Melville ${site.toUpperCase()} website.

CRITICAL INSTRUCTIONS:

Extract ALL products visible in the shopping cart image(s). For each product, identify:

1. **Product Name**: The exact product name as shown
2. **SKU**: Product code if visible (look for codes like "M065L-622BAG720000")
3. **Price**: The CURRENT price (not crossed-out prices)
4. **Currency**: Should be ${expectedCurrency}
5. **Color**: If specified
6. **Size**: If specified (often "One Size" or specific size)
7. **Quantity**: Number of items

PRICE RULES:
- Extract the CURRENT active price only
- NEVER use crossed-out/strikethrough prices
- Return only the numeric value (for £15.00 return 15)

Return a JSON array of all products found. If no products are detected, return an empty array.

Example output format:
[
  {
    "product_name": "Rosa Top",
    "product_sku": "TOP123",
    "price": 15,
    "currency": "GBP",
    "color": "White",
    "size": "One Size",
    "quantity": 1
  }
]`,
      add_context_from_internet: false,
      file_urls: imageUrls,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                product_sku: { type: ["string", "null"] },
                price: { type: "number" },
                currency: { type: "string" },
                color: { type: ["string", "null"] },
                size: { type: ["string", "null"] },
                quantity: { type: "number" }
              },
              required: ["product_name", "price", "currency", "quantity"]
            }
          }
        },
        required: ["items"]
      }
    });

    // Parse result
    let parsedResult;
    if (typeof result === 'string') {
      parsedResult = JSON.parse(result);
    } else if (result && typeof result === 'object' && 'data' in result) {
      parsedResult = result.data;
    } else {
      parsedResult = result;
    }

    const items = parsedResult?.items || [];

    // Transform to CartItem format
    const cartItems = items.map(item => ({
      product_name: item.product_name,
      product_sku: item.product_sku || 'לא זוהה',
      original_price: item.price,
      original_currency: item.currency || expectedCurrency,
      color: item.color || '',
      size: item.size || '',
      quantity: item.quantity || 1,
      product_description: '',
      product_url: '',
      site: site
    }));

    return Response.json({
      success: true,
      items: cartItems,
      count: cartItems.length
    });

  } catch (error) {
    console.error('Error analyzing cart images:', error);
    return Response.json({ 
      error: 'Failed to analyze images',
      details: error.message 
    }, { status: 500 });
  }
});