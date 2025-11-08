
// Psychological rounding function
const roundPsych = (price) => {
  if (price <= 200) {
    return Math.floor(price / 10) * 10 + 9.90;
  } else if (price <= 400) {
    return Math.floor(price / 10) * 10 + 9;
  } else {
    const lastDigit = Math.round(price) % 10;
    if (lastDigit >= 5) {
      return Math.floor(price / 10) * 10 + 9;
    } else {
      return Math.floor(price / 10) * 10;
    }
  }
};

// Item weight data (simplified)
const getItemWeights = (item) => {
    // In a real app, this would be a lookup table based on item.item_type or name
    const lowerName = item.product_name.toLowerCase();
    if (lowerName.includes('hoodie')) return { actual: 1.2, dim: 1.45 };
    if (lowerName.includes('sweatpants')) return { actual: 0.5, dim: 0.58 };
    if (lowerName.includes('t-shirt')) return { actual: 0.18, dim: 0.20 };
    if (lowerName.includes('bag')) return { actual: 0.5, dim: 0.70 };
    return { actual: 0.4, dim: 0.4 }; // Default
};


export function computeNewCheckoutPrice({ cart, exchangeRates }) {
    console.log("--- Starting New Detailed Pricing Engine ---");

    if (!cart || cart.length === 0) throw new Error("Cart is empty");

    // --- 1. Initial Setup & Rates ---
    const getRate = (currency) => (exchangeRates[currency.toLowerCase()] || 3.6);
    const FX_FEE_PCT = 1.012; // 1.2%
    const VAT_PCT = 0.18;
    const HANDLING_FEE_GROSS = 55;
    const HANDLING_FEE_NET = HANDLING_FEE_GROSS / (1 + VAT_PCT);

    // --- 2. Calculate Chargeable Weight & Base ILS Price for each item ---
    let totalChargeableKg = 0;
    const itemsWithWeight = cart.map(item => {
        const { actual, dim } = getItemWeights(item);
        const chargeable_kg = Math.max(actual, dim) * item.quantity;
        totalChargeableKg += chargeable_kg;
        
        const price_ils_base = item.original_price * getRate(item.original_currency) * FX_FEE_PCT * item.quantity;

        return { ...item, chargeable_kg, price_ils_base };
    });

    console.log(`Total Chargeable Weight: ${totalChargeableKg.toFixed(2)} kg`);

    // --- 3. Calculate International Shipping Cost ---
    // Simplified EU/Mailboxde rate logic
    let intlShipRatePerKg;
    if (totalChargeableKg >= 5) intlShipRatePerKg = 8.5;
    else if (totalChargeableKg >= 3) intlShipRatePerKg = 11;
    else intlShipRatePerKg = 15; // Below 3kg tier (example)
    
    const totalIntlShipCostEUR = totalChargeableKg * intlShipRatePerKg;
    const totalIntlShipCostILS = totalIntlShipCostEUR * getRate('EUR') * FX_FEE_PCT;
    console.log(`Intl Shipping: ${totalIntlShipCostILS.toFixed(2)} ILS for ${totalChargeableKg.toFixed(2)}kg`);

    // --- 4. Calculate Israel & Fixed Order Costs ---
    const cifValueUSD = itemsWithWeight.reduce((sum, item) => sum + (item.original_price * item.quantity * (getRate(item.original_currency) / getRate('USD'))), 0);
    
    let israelCosts = 0;
    israelCosts += 20; // gov_computer
    if (cifValueUSD > 500) {
        israelCosts += 48; // gov_security
        israelCosts += 27; // gov_IAA
    }
    // Disbursement & Clearance are simplified/ignored as per new model.

    const fixedOrderCosts = 35 + 10 + 5; // Courier + Packaging + Overhead
    const totalAllocatableCosts = totalIntlShipCostILS + israelCosts + fixedOrderCosts;
    console.log(`Total Allocatable Costs (Ship+Israel+Fixed): ${totalAllocatableCosts.toFixed(2)} ILS`);

    // --- 5. Calculate Net Cost per Item ---
    let totalNetCost = 0;
    const itemsWithNetCost = itemsWithWeight.map(item => {
        const cost_net_i = item.price_ils_base + (totalAllocatableCosts * (item.chargeable_kg / totalChargeableKg));
        totalNetCost += cost_net_i;
        return { ...item, cost_net_i };
    });
    console.log(`Total Net Cost of all items (C_sum): ${totalNetCost.toFixed(2)} ILS`);
    
    // --- 6. Calculate Required Net Revenue (S) to hit 20% margin ---
    const m = 0.20; // Target margin - CHANGED TO 20%
    const f = 0.0123; // Blended payment fee
    
    const S_numerator = totalNetCost + (f * HANDLING_FEE_GROSS) - ((1 - m) * HANDLING_FEE_NET);
    const S_denominator = (1 - m) - (f * (1 + VAT_PCT));
    const S = S_numerator / S_denominator;
    console.log(`Required Net Revenue (S) for 20% margin: ${S.toFixed(2)} ILS`);

    // --- 7. Allocate Net Revenue to Items and Calculate Gross Price ---
    const finalItems = itemsWithNetCost.map(item => {
        const price_net_i = (item.cost_net_i / totalNetCost) * S;
        let price_gross_i = roundPsych(price_net_i * (1 + VAT_PCT));

        // Add surcharge for oversized items
        if (item.is_oversized) {
            price_gross_i += 30;
            console.log(`   -> Added 30 ILS for OVERSIZED item: ${item.product_name}`);
        }

        return {
            name: item.product_name,
            qty: item.quantity,
            priceGross: price_gross_i,
        };
    });

    const finalSumItemsGross = finalItems.reduce((sum, item) => sum + item.priceGross, 0);
    const finalTotalGross = finalSumItemsGross + HANDLING_FEE_GROSS;

    console.log(`Final Sum Items: ${finalSumItemsGross.toFixed(2)}, Final Total: ${finalTotalGross.toFixed(2)}`);

    return {
        finalPriceILS: finalTotalGross,
        totalWeight: totalChargeableKg,
        breakdown: {
            items: finalItems,
            summary: {
                sumItemsGross: finalSumItemsGross,
                handlingFee: HANDLING_FEE_GROSS,
                totalGross: finalTotalGross
            }
        }
    };
}
