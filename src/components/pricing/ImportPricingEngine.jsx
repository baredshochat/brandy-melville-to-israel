// Import Pricing Engine - New simplified logic for Brandy Melville imports

/**
 * Calculate margin based on original price in EUR
 */
function getMarginForPrice(priceEUR, settings) {
  if (priceEUR <= 30) return settings.margin_low || 0.55;
  if (priceEUR < 60) return settings.margin_mid || 0.40;
  return settings.margin_high || 0.30;
}

/**
 * Get exchange rate for currency
 */
function getExchangeRate(currency, settings) {
  const curr = currency.toUpperCase();
  if (curr === 'EUR') return settings.fx_eur_ils || 4.0;
  if (curr === 'USD') return settings.fx_usd_ils || 3.8;
  if (curr === 'GBP') return settings.fx_gbp_ils || 4.5;
  return settings.fx_eur_ils || 4.0; // default to EUR
}

/**
 * Calculate full price for a single imported item
 */
export function calculateImportItemFullPrice(item, settings) {
  const priceOriginal = item.original_price || 0;
  const currency = item.original_currency || 'EUR';
  const quantity = item.quantity || 1;
  const weight = item.estimated_weight_kg || item.item_weight || settings.default_item_weight_kg || 0.25;

  // Convert original price to EUR for margin calculation
  let priceEUR = priceOriginal;
  if (currency !== 'EUR') {
    const rateOriginal = getExchangeRate(currency, settings);
    const rateEUR = settings.fx_eur_ils || 4.0;
    priceEUR = priceOriginal * (rateOriginal / rateEUR);
  }

  // Get margin based on EUR price
  const margin = getMarginForPrice(priceEUR, settings);

  // Convert to ILS
  const fxRate = getExchangeRate(currency, settings);
  const fxFeeRate = settings.fx_fee_rate || 0.03;
  const priceILS = priceOriginal * fxRate * (1 + fxFeeRate);

  // Apply margin (correct formula: basePrice * (1 + margin))
  const priceWithMargin = priceILS * (1 + margin);

  // Calculate shipping costs per item
  const forwardShippingPerItem = (settings.forward_shipping_usd_per_order || 7) * 
                                  (settings.fx_usd_ils || 3.8) / 
                                  (settings.avg_items_per_forward_order || 2);
  
  const intlShippingPerKg = (settings.intl_shipping_usd_per_2kg || 30) * 
                            (settings.fx_usd_ils || 3.8) / 2;
  const intlShipping = weight * intlShippingPerKg;

  // NO customs tax - you get reimbursed for it
  // Total cost for single unit
  const totalPerUnit = priceWithMargin + forwardShippingPerItem + intlShipping;
  
  // Total for all quantity
  const totalFull = totalPerUnit * quantity;

  return {
    totalFull,
    breakdown: {
      basePrice: priceILS * quantity,
      margin: (priceWithMargin - priceILS) * quantity,
      forwardShipping: forwardShippingPerItem * quantity,
      intlShipping: intlShipping * quantity
    }
  };
}

/**
 * Calculate prices for entire cart of imported items
 */
export function calculateImportCartPrice(cart, settings) {
  if (!cart || cart.length === 0) {
    throw new Error("Cart is empty");
  }

  // Filter only import items
  const importItems = cart.filter(item => 
    item.product_type === 'import' || 
    (item.site && item.site !== 'local')
  );

  if (importItems.length === 0) {
    throw new Error("No import items in cart");
  }

  // Calculate full price for each item
  let totalFull = 0;
  const itemsWithPrices = importItems.map(item => {
    const { totalFull: itemTotal, breakdown } = calculateImportItemFullPrice(item, settings);
    totalFull += itemTotal;
    
    return {
      ...item,
      fullPrice: itemTotal,
      breakdown
    };
  });

  // Add order service fee
  const serviceFee = settings.order_service_fee_ils || 50;
  const domesticShipping = settings.domestic_ship_ils || 35;
  
  // Calculate display price (70% of items total)
  const displayPercent = settings.initial_display_percent || 0.70;
  const cartDisplayPrice = totalFull * displayPercent;
  
  // Import costs = remaining 30% + service fee
  const importCosts = (totalFull * (1 - displayPercent)) + serviceFee;

  // Final total
  const finalTotal = totalFull + serviceFee + domesticShipping;

  return {
    finalPriceILS: Math.round(finalTotal),
    cartDisplayPrice: Math.round(cartDisplayPrice),
    importCosts: Math.round(importCosts),
    domesticShipping,
    breakdown: {
      items: itemsWithPrices,
      cartSubtotal: Math.round(cartDisplayPrice),
      importCosts: Math.round(importCosts),
      serviceFee,
      domesticShipping,
      finalTotal: Math.round(finalTotal)
    }
  };
}