import { Order } from "@/entities/Order";
import { calcFinalPriceILS } from "../pricing/PricingEngine";

// Shared service for loading and filtering orders across the app
// This ensures consistency between Orders Admin page and Order Template Editor

/**
 * Load all orders with calculated pricing data
 * @returns {Promise<Array>} Enriched orders with calculated pricing
 */
export const loadAllOrders = async () => {
  try {
    const data = await Order.list('-created_date');
    
    // Enrich orders with calculated pricing data
    const enrichedOrders = data.map(order => {
      const calculatedPricing = calculateOrderPricing(order);
      return {
        ...order,
        calculatedPricing
      };
    });
    
    return enrichedOrders;
  } catch (error) {
    console.error('Error loading orders:', error);
    throw error;
  }
};

/**
 * Get orders for document generation
 * Filters: complete orders, paid, not deleted
 * @returns {Promise<Array>} Filtered orders ready for PDF generation
 */
const RECEIVED_STATUSES = [
  "pending",
  "ordered",
  "warehouse",
  "shipping_to_israel",
  "in_israel",
  "shipping_to_customer"
];

export const getOrdersForDocuments = async () => {
  try {
    const orders = await Order.filter(
      {
        is_deleted: false,
        payment_status: "completed",
        status: { $in: RECEIVED_STATUSES }
      },
      "-created_date"
    );

    return orders || [];
  } catch (error) {
    console.error("getOrdersForDocuments error:", error);
    return [];
  }
};


// Validators - exported for use in other components
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());

export const isCompleteOrder = (order) => {
  if (!order) return false;
  const hasItems = Array.isArray(order.items) && order.items.length > 0;
  const hasName = !!(order.customer_name && String(order.customer_name).trim());
  const hasEmail = isValidEmail(order.customer_email);
  const hasAddress = !!(order.shipping_address && String(order.shipping_address).trim());
  const hasCity = !!(order.city && String(order.city).trim());
  return hasItems && hasName && hasEmail && hasAddress && hasCity;
};

// Helper: Calculate order pricing (same logic as in Orders page)
const calculateOrderPricing = (order) => {
  if (!order.items || order.items.length === 0) {
    return null;
  }

  try {
    const totalProductPrice = order.items.reduce((sum, item) =>
      sum + (item.original_price * item.quantity), 0);

    const totalWeight = order.items.reduce((sum, item) =>
      sum + ((item.weight || 0.35) * item.quantity), 0);

    const siteInfo = {
      us: { currency: 'USD' },
      eu: { currency: 'EUR' },
      uk: { currency: 'GBP' }
    };

    const site = order.site || 'us';
    const currency = siteInfo[site]?.currency || 'USD';

    // Mock exchange rates
    const fxRates = {
      USD: 3.7,
      EUR: 4.0,
      GBP: 4.5
    };

    const result = calcFinalPriceILS({
      currency,
      productPrice: totalProductPrice,
      weight_kg: totalWeight,
      fxToILS: fxRates[currency],
      fxUSDToILS: fxRates.USD,
      dimensions_cm: { L: 0, W: 0, H: 0 },
      payment_method: 'card'
    });

    const breakdown = result.breakdown;

    // Construct snapshot for net profit calculation
    const snapshot = {
      vat_pct: breakdown?.vat_pct || 0.18,
      domestic_vat_applies: true,
      domestic_charge_to_customer: breakdown?.domestic_charge_to_customer || 0,
      domestic_cost_includes_vat: true,
      domestic_ship_cost_ils: (breakdown?.domestic_absorbed_cost || 0) + (breakdown?.domestic_charge_to_customer || 0),
      priceExVAT: breakdown?.priceExVAT || 0,
      processor_fee_on: 'final',
      priceGross: breakdown?.priceGross || 0,
      finalPriceILS: result.finalPriceILS || 0,
      processor_pct_used: breakdown?.processor_pct_used || 0.025,
      processor_fixed_used: breakdown?.processor_fixed_used || 1.2,
      cost_ex_vat: breakdown?.cost_ex_vat || 0,
      refunds_and_adjustments_exVAT: 0
    };

    const { net_profit_ils, margin_pct, processor_fees } = computeNetProfit(snapshot);

    const enhancedBreakdown = {
      ...breakdown,
      net_profit_ils: net_profit_ils,
      profit_pct_of_final: margin_pct,
      processor_fees: processor_fees,
      customsILS: breakdown?.customsILS || 0
    };

    return {
      ...result,
      breakdown: enhancedBreakdown
    };
  } catch (error) {
    console.error('Error calculating pricing for order', order.order_number, error);
    return null;
  }
};

// Helper: Compute net profit
function computeNetProfit(snapshot) {
  const vat = snapshot.vat_pct;

  const domesticIncomeEx = snapshot.domestic_vat_applies
    ? snapshot.domestic_charge_to_customer / (1 + vat)
    : snapshot.domestic_charge_to_customer;

  const domesticCostEx = snapshot.domestic_cost_includes_vat
    ? snapshot.domestic_ship_cost_ils / (1 + vat)
    : snapshot.domestic_ship_cost_ils;

  const revenueEx = snapshot.priceExVAT + domesticIncomeEx;

  let feeBase;
  switch (snapshot.processor_fee_on) {
    case 'gross':  feeBase = snapshot.priceGross; break;
    case 'final':  feeBase = snapshot.finalPriceILS; break;
    default:       feeBase = snapshot.priceExVAT + domesticIncomeEx;
  }
  const processorFees = feeBase * snapshot.processor_pct_used + snapshot.processor_fixed_used;

  const totalCostsEx = snapshot.cost_ex_vat + (domesticCostEx || 0) + (snapshot.refunds_and_adjustments_exVAT || 0);

  const net = revenueEx - processorFees - totalCostsEx;
  const marginPct = revenueEx > 0 ? net / revenueEx : 0;

  return { net_profit_ils: net, margin_pct: marginPct, revenue_exVAT: revenueEx, processor_fees: processorFees, total_costs_exVAT: totalCostsEx };
}