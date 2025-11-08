import React, { useEffect, useState } from "react";
import { PricingLabels } from "@/entities/PricingLabels";
import { Rates } from "@/entities/Rates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, ArrowRight, ArrowLeft, Info } from "lucide-react";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const formatCurrency = (amount, currency = 'ILS') => {
  const num = Number(amount || 0);
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
  return `${symbol}${num.toFixed(2)}`;
};

export default function PriceCalculator({ cart = [], site, onConfirm, onBack }) {
  const [breakdown, setBreakdown] = useState(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detailedItems, setDetailedItems] = useState([]);
  const [labels, setLabels] = useState({});

  // Check if this is a local stock order
  const isLocalOrder = site === 'local' || (cart.length > 0 && cart[0].site === 'local');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Load pricing labels
        const labelsList = await PricingLabels.list();
        if (labelsList.length > 0) {
          setLabels(labelsList[0]);
        }

        if (isLocalOrder) {
          // LOCAL STOCK CALCULATION - Simple pricing
          const itemsTotal = cart.reduce((sum, item) => {
            const price = Number(item.original_price || 0);
            const qty = Number(item.quantity || 1);
            return sum + (price * qty);
          }, 0);

          const shippingCost = 35; // Fixed shipping for local stock
          const total = itemsTotal + shippingCost;

          setBreakdown({
            items_total_ils: itemsTotal,
            domestic_ship_ils: shippingCost,
            final_total_ils: total,
            is_local: true
          });

          setTotalPrice(total);
          setTotalWeight(0); // Not relevant for local stock
          setDetailedItems(cart.map(item => ({
            ...item,
            priceILS: Number(item.original_price || 0) * Number(item.quantity || 1)
          })));
        } else {
          // INTERNATIONAL ORDER CALCULATION - Complex pricing
          const ratesList = await Rates.list();
          let fxRates = { usd: 3.7, eur: 4.0, gbp: 4.5 };
          if (ratesList.length > 0) {
            fxRates = ratesList[0];
          }

          const currencyMap = { us: 'USD', eu: 'EUR', uk: 'GBP' };
          const currency = currencyMap[site] || 'USD';
          const fxRate = currency === 'EUR' ? fxRates.eur : currency === 'GBP' ? fxRates.gbp : fxRates.usd;

          // Calculate totals
          const productTotal = cart.reduce((sum, item) => sum + (item.original_price * item.quantity), 0);
          const totalWeightKg = cart.reduce((sum, item) => sum + ((item.item_weight || 0.35) * item.quantity), 0);

          // Basic calculation (simplified - in production use full pricing engine)
          const productILS = productTotal * fxRate;
          const shippingILS = totalWeightKg * 70; // ₪70 per kg
          const customsILS = productTotal > 75 ? (productILS + shippingILS) * 0.12 : 0;
          const feesILS = 50;
          const subtotal = productILS + shippingILS + customsILS + feesILS;
          const domesticShipILS = 30;
          const total = subtotal + domesticShipILS;

          setBreakdown({
            items_total_ils: productILS,
            intl_ship_ils: shippingILS,
            customs_ils: customsILS,
            fees_ils: feesILS,
            domestic_ship_ils: domesticShipILS,
            final_total_ils: total,
            is_local: false
          });

          setTotalPrice(total);
          setTotalWeight(totalWeightKg);
          setDetailedItems(cart.map(item => ({
            ...item,
            priceILS: (item.original_price * fxRate) * item.quantity
          })));
        }
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
    onConfirm(totalPrice, totalWeight, breakdown);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

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
              {isLocalOrder ? 'סיכום הזמנה - מלאי מקומי' : 'חישוב מחיר סופי'}
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
                </div>
                <p className="font-semibold text-stone-900">
                  {formatCurrency(item.priceILS, 'ILS')}
                </p>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          {/* Price Breakdown */}
          <div className="space-y-3">
            {isLocalOrder ? (
              // LOCAL STOCK BREAKDOWN
              <>
                <div className="flex justify-between text-stone-700">
                  <span>סכום פריטים</span>
                  <span className="font-semibold">{formatCurrency(breakdown.items_total_ils, 'ILS')}</span>
                </div>
                <div className="flex justify-between text-stone-700">
                  <div className="flex items-center gap-2">
                    <span>משלוח עד הבית</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-4 h-4 text-stone-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">משלוח מהמלאי שלנו בישראל - 3-7 ימי עסקים</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="font-semibold">{formatCurrency(breakdown.domestic_ship_ils, 'ILS')}</span>
                </div>
              </>
            ) : (
              // INTERNATIONAL BREAKDOWN
              <>
                <div className="flex justify-between text-stone-700">
                  <span>{labels.product_ils_label || 'עלות מוצרים בש״ח'}</span>
                  <span className="font-semibold">{formatCurrency(breakdown.items_total_ils, 'ILS')}</span>
                </div>
                <div className="flex justify-between text-stone-700">
                  <span>{labels.intl_shipping_label || 'משלוח בינלאומי'}</span>
                  <span className="font-semibold">{formatCurrency(breakdown.intl_ship_ils, 'ILS')}</span>
                </div>
                {breakdown.customs_ils > 0 && (
                  <div className="flex justify-between text-stone-700">
                    <span>{labels.customs_and_fees_label || 'מכס ועמלות'}</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(breakdown.customs_ils, 'ILS')}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-700">
                  <span>עמלות טיפול קבועות</span>
                  <span className="font-semibold">{formatCurrency(breakdown.fees_ils, 'ILS')}</span>
                </div>
                <div className="flex justify-between text-stone-700">
                  <span>{labels.domestic_shipping_label || 'משלוח עד הבית'}</span>
                  <span className="font-semibold">{formatCurrency(breakdown.domestic_ship_ils, 'ILS')}</span>
                </div>
              </>
            )}

            <Separator className="my-4" />

            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold text-stone-900">
                {labels.final_total_label || 'סה״כ לתשלום'}
              </span>
              <span className="text-2xl font-bold text-rose-600">
                {formatCurrency(breakdown.final_total_ils, 'ILS')}
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