export function calcFinalPriceILS({
  currency = 'USD',
  productPrice = 0,        // foreign currency amount
  weight_kg = 0,
  fxToILS = 3.7,           // rate for product currency -> ILS
  fxUSDToILS = 3.7,        // USD -> ILS
  payment_method = 'card', // not used in this simple model
  dimensions_cm = { L: 0, W: 0, H: 0 } // not used here
} = {}) {
  // Basic constants (aligned with app tone)
  const VAT_PCT = 0.18;
  const FX_FEE_PCT = 0.012;          // currency conversion overhead
  const PROCESSOR_PCT = 0.025;       // payment processor percent
  const PROCESSOR_FIXED = 1.2;       // fixed processor fee (ILS)
  const HANDLING_FEE_ILS = 55;       // fixed handling fee (shown elsewhere)
  const FIXED_FEES_ILS = 35;         // small fixed logistics overhead

  // 1) Base product cost in ILS + FX fee
  const baseILS = Number(productPrice || 0) * Number(fxToILS || 1);
  const fxCost = baseILS * FX_FEE_PCT;

  // 2) International shipping (simple tiered per-kg model)
  const perKg = weight_kg >= 5 ? 32 : weight_kg >= 3 ? 42 : 55; // ILS/kg rough tiers
  const intlShip = Math.max(0, Number(weight_kg || 0)) * perKg;

  // 3) Customs (rough): if USD value > $75, add 12% on the full USD value
  const productPriceUSD = fxUSDToILS ? baseILS / fxUSDToILS : baseILS / 3.7;
  const customsUSD = productPriceUSD > 75 ? (productPriceUSD - 75) * 0.12 : 0;
  const customsILS = customsUSD * (fxUSDToILS || 3.7);

  // 4) Net (pre-VAT) basket used for pricing snapshot
  const priceExVAT = baseILS + fxCost + intlShip + customsILS + FIXED_FEES_ILS;

  // 5) Gross price (VAT added). Handling fee usually presented separately in UI.
  const priceGross = priceExVAT * (1 + VAT_PCT);

  // 6) Processor fees (stored in breakdown for transparency)
  const processor_fees = priceGross * PROCESSOR_PCT + PROCESSOR_FIXED;

  // Final shown price (align with common flow): gross + handling (processor fees shown separately in breakdown)
  const finalPriceILS = priceGross + HANDLING_FEE_ILS;

  return {
    finalPriceILS,
    breakdown: {
      // Keys used by Orders and OrderDetailsDrawer
      baseILS,
      fxCost,
      intlShip,
      customsILS,
      importVAT_ILS: 0, // simplified
      fixed_fees_ils: FIXED_FEES_ILS,
      bufferILS: 0,
      processor_fees,
      domestic_charge_to_customer: 0,

      // For computeNetProfit snapshot in pages/Orders
      vat_pct: VAT_PCT,
      processor_pct_used: PROCESSOR_PCT,
      processor_fixed_used: PROCESSOR_FIXED,
      priceExVAT,
      priceGross,
      cost_ex_vat: priceExVAT // simplified cost basis
    }
  };
}