import React, { useEffect, useState } from "react";
import { PricingLabels } from "@/entities/PricingLabels";
import { Rates } from "@/entities/Rates";
import { CalculationSettings } from "@/entities/CalculationSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, ArrowRight, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const formatCurrency = (amount, currency = 'ILS') => {
  const num = Number(amount || 0);
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
  return `${symbol}${num.toFixed(2)}`;
};

export default function PriceCalculator({ cart = [], site, onConfirm, onBack }) {
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailedItems, setDetailedItems] = useState([]);
  const [labels, setLabels] = useState({});
  const [rates, setRates] = useState({ usd: 3.7, eur: 4.0, gbp: 4.5 });
  const [settings, setSettings] = useState(null);
  const [domesticShipping, setDomesticShipping] = useState(35);

  // Check if this is a local stock order
  const isLocalOrder = site === 'local' || (cart.length > 0 && cart[0].site === 'local');

  // Helper function to convert price to ILS
  const convertToILS = (price, currency) => {
    const amount = Number(price) || 0;
    if (currency === 'USD') return amount * rates.usd;
    if (currency === 'EUR') return amount * rates.eur;
    if (currency === 'GBP') return amount * rates.gbp;
    return amount;
  };

  // Calculate full cost per item - SAME AS CartSummary
  const calculateItemFullCost = (item, allItems) => {
    // For local stock - simple calculation
    if (item.site === 'local') {
      return Number(item.original_price || 0) * (item.quantity || 1);
    }

    // For international orders - complex calculation
    if (!settings) return convertToILS(item.original_price, item.original_currency) * (item.quantity || 1);

    const priceILS = convertToILS(item.original_price, item.original_currency);
    const itemWeight = (item.item_weight || 0.3) * (item.quantity || 1);
    
    // Calculate total weight
    const totalWeight = allItems.reduce((sum, it) => sum + ((it.item_weight || 0.3) * (it.quantity || 1)), 0);

    if (totalWeight === 0) {
      return priceILS * (item.quantity || 1);
    }

    // Calculate international shipping cost
    const weightWithPackaging = totalWeight + (settings.outer_pack_kg || 0.3);
    const roundedWeight = Math.ceil(weightWithPackaging / (settings.carrier_rounding_kg || 0.5)) * (settings.carrier_rounding_kg || 0.5);
    const baseShipping = roundedWeight * (settings.ship_rate_per_kg || 100);
    const withSurcharges = baseShipping * (1 + (settings.fuel_surcharge_pct || 0) + (settings.remote_area_pct || 0));
    
    // Calculate fixed fees
    const fixedFees = settings.fixed_fees_ils || 50;
    
    // Total overhead per order
    const totalOverhead = withSurcharges + fixedFees;
    
    // Distribute overhead proportionally by item weight
    const itemProportion = itemWeight / totalWeight;
    const itemOverhead = totalOverhead * itemProportion;
    
    // Item cost before VAT
    const itemBaseCost = priceILS * (item.quantity || 1);
    const itemCostBeforeVAT = itemBaseCost + itemOverhead;
    
    // Add VAT
    const vatRate = settings.vat_pct || 0.18;
    const itemFullCostWithVAT = itemCostBeforeVAT * (1 + vatRate);
    
    return itemFullCostWithVAT;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load pricing labels
        const labelsList = await PricingLabels.list();
        if (labelsList.length > 0) {
          setLabels(labelsList[0]);
        }

        // Load rates
        const ratesList = await Rates.list();
        if (ratesList && ratesList.length > 0) {
          const latestRate = ratesList[0];
          setRates({
            usd: latestRate.usd || 3.7,
            eur: latestRate.eur || 4.0,
            gbp: latestRate.gbp || 4.5
          });
        }

        // Load calculation settings
        const settingsList = await CalculationSettings.list();
        if (settingsList && settingsList.length > 0) {
          setSettings(settingsList[0]);
          setDomesticShipping(settingsList[0].domestic_ship_ils || 30);
        }

        // Calculate SAME AS CartSummary
        const totalWeightKg = cart.reduce((sum, item) => sum + ((item.item_weight || 0.35) * item.quantity), 0);

        // Calculate items total using the SAME function as CartSummary
        const itemsTotal = cart.reduce((sum, item) => {
          return sum + calculateItemFullCost(item, cart);
        }, 0);

        // Domestic shipping
        const domesticShipCost = isLocalOrder ? 35 : (settingsList && settingsList.length > 0 ? (settingsList[0].domestic_ship_ils || 30) : 30);
        
        // Final total
        const total = itemsTotal + domesticShipCost;

        setTotalPrice(total);
        setTotalWeight(totalWeightKg);
        setDomesticShipping(domesticShipCost);
        
        // Set detailed items with same calculation
        setDetailedItems(cart.map(item => ({
          ...item,
          priceILS: calculateItemFullCost(item, cart)
        })));

      } catch (error) {
        console.error("Error calculating price:", error);
      } finally {
        setLoading(false);
      }
    };

    if (cart.length > 0) {
      loadData();
    }
  }, [cart, site, isLocalOrder]);

  const handleContinue = () => {
    // Calculate items subtotal
    const itemsSubtotal = detailedItems.reduce((sum, item) => sum + item.priceILS, 0);
    
    const breakdown = {
      items_total_ils: itemsSubtotal,
      domestic_ship_ils: domesticShipping,
      final_total_ils: totalPrice,
      is_local: isLocalOrder
    };
    
    onConfirm(totalPrice, totalWeight, breakdown);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  // Calculate subtotal from items
  const itemsSubtotal = detailedItems.reduce((sum, item) => sum + item.priceILS, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6"
    >
      <Card className="bg-white border-2 border-stone-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-6 h-6 text-rose-500" />
            <h2 className="text-2xl font-semibold text-stone-900">
              {isLocalOrder ? 'סיכום הזמנה - מלאי מקומי' : 'סיכום הזמנה'}
            </h2>
          </div>

          {/* Items List */}
          <div className="space-y-3 mb-6">
            <h3 className="font-medium text-stone-700 mb-3">
              {labels.items_section_title || 'הפריטים שלך'}
            </h3>
            {detailedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-stone-50 rounded">
                <div className="flex-1">
                  <p className="font-medium text-stone-800">{item.product_name}</p>
                  <p className="text-sm text-stone-500">
                    {[item.color, item.size].filter(Boolean).join(' • ')} • כמות: {item.quantity}
                  </p>
                  {!isLocalOrder && (
                    <p className="text-xs text-stone-400 mt-1">כולל משלוח בינלאומי, עמלות ומע״ם</p>
                  )}
                </div>
                <p className="font-semibold text-stone-900">
                  {formatCurrency(item.priceILS, 'ILS')}
                </p>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Price Summary - EXACTLY like CartSummary */}
          <div className="space-y-3">
            <div className="flex justify-between text-stone-700">
              <span>סיכום פריטים</span>
              <span className="font-semibold">{formatCurrency(itemsSubtotal, 'ILS')}</span>
            </div>
            
            <div className="flex justify-between text-stone-700">
              <span>משלוח עד הבית</span>
              <span className="font-semibold">{formatCurrency(domesticShipping, 'ILS')}</span>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold text-stone-900">
                {labels.final_total_label || 'סה״כ לתשלום'}
              </span>
              <span className="text-2xl font-bold text-rose-600">
                {formatCurrency(totalPrice, 'ILS')}
              </span>
            </div>

            <p className="text-sm text-stone-500 text-center pt-2">
              {isLocalOrder 
                ? 'מחיר סופי, כולל הכל. זמן אספקה: 3-7 ימי עסקים.'
                : 'מחיר סופי, כולל הכל. ברנדי מחו״ל עד אלייך.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 h-12"
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              חזור לעגלה
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white"
            >
              המשך לתשלום
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}