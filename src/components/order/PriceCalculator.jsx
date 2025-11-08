import React, { useEffect, useState } from "react";
import { PricingLabels } from "@/entities/PricingLabels";
import { Rates } from "@/entities/Rates";
import { CalculationSettings } from "@/entities/CalculationSettings";
import { Coupon } from "@/entities/Coupon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Loader2, Calculator, ArrowRight, ArrowLeft, Tag, X, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const formatCurrency = (amount, currency = 'ILS') => {
  const num = Number(amount || 0);
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
  const displayAmount = currency === 'ILS' ? Math.round(num) : num.toFixed(2);
  return `${symbol}${displayAmount}`;
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
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [discount, setDiscount] = useState(0);

  const isLocalOrder = site === 'local' || (cart.length > 0 && cart[0].site === 'local');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const labelsList = await PricingLabels.list();
        if (labelsList.length > 0) {
          setLabels(labelsList[0]);
        }

        const ratesList = await Rates.list();
        let loadedRates = { usd: 3.7, eur: 4.0, gbp: 4.5 };
        if (ratesList && ratesList.length > 0) {
          const latestRate = ratesList[0];
          loadedRates = {
            usd: latestRate.usd || 3.7,
            eur: latestRate.eur || 4.0,
            gbp: latestRate.gbp || 4.5
          };
          setRates(loadedRates);
        }

        const settingsList = await CalculationSettings.list();
        let loadedSettings = null;
        let domesticShipCost = 35;
        
        if (settingsList && settingsList.length > 0) {
          loadedSettings = settingsList[0];
          setSettings(loadedSettings);
          domesticShipCost = isLocalOrder ? 35 : (loadedSettings.domestic_ship_ils || 30);
          setDomesticShipping(domesticShipCost);
        }

        const convertToILS = (price, currency) => {
          const amount = Number(price) || 0;
          if (currency === 'USD') return amount * loadedRates.usd;
          if (currency === 'EUR') return amount * loadedRates.eur;
          if (currency === 'GBP') return amount * loadedRates.gbp;
          return amount;
        };

        const calculateItemFullCost = (item, allItems) => {
          if (item.site === 'local') {
            return Number(item.original_price || 0) * (item.quantity || 1);
          }

          if (!loadedSettings) return convertToILS(item.original_price, item.original_currency) * (item.quantity || 1);

          const priceILS = convertToILS(item.original_price, item.original_currency);
          const itemWeight = (item.item_weight || 0.3) * (item.quantity || 1);
          
          const totalWeight = allItems.reduce((sum, it) => sum + ((it.item_weight || 0.3) * (it.quantity || 1)), 0);

          if (totalWeight === 0) {
            return priceILS * (item.quantity || 1);
          }

          const weightWithPackaging = totalWeight + (loadedSettings.outer_pack_kg || 0.3);
          const roundedWeight = Math.ceil(weightWithPackaging / (loadedSettings.carrier_rounding_kg || 0.5)) * (loadedSettings.carrier_rounding_kg || 0.5);
          const baseShipping = roundedWeight * (loadedSettings.ship_rate_per_kg || 100);
          const withSurcharges = baseShipping * (1 + (loadedSettings.fuel_surcharge_pct || 0) + (loadedSettings.remote_area_pct || 0));
          
          const fixedFees = loadedSettings.fixed_fees_ils || 50;
          const totalOverhead = withSurcharges + fixedFees;
          const itemProportion = itemWeight / totalWeight;
          const itemOverhead = totalOverhead * itemProportion;
          const itemBaseCost = priceILS * (item.quantity || 1);
          const itemCostBeforeVAT = itemBaseCost + itemOverhead;
          const vatRate = loadedSettings.vat_pct || 0.18;
          const itemFullCostWithVAT = itemCostBeforeVAT * (1 + vatRate);
          
          return itemFullCostWithVAT;
        };

        const totalWeightKg = cart.reduce((sum, item) => sum + ((item.item_weight || 0.35) * item.quantity), 0);

        const itemsTotal = cart.reduce((sum, item) => {
          return sum + calculateItemFullCost(item, cart);
        }, 0);
        
        const total = Math.round(itemsTotal + domesticShipCost);

        setTotalPrice(total);
        setTotalWeight(totalWeightKg);
        
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

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setCheckingCoupon(true);
    setCouponError('');
    
    try {
      const coupons = await Coupon.filter({ code: couponCode.toUpperCase().trim() });
      
      if (coupons.length === 0) {
        setCouponError('קוד קופון לא תקין');
        return;
      }
      
      const coupon = coupons[0];
      
      // Validate coupon
      if (!coupon.is_active) {
        setCouponError('קופון זה אינו פעיל');
        return;
      }
      
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);
      
      if (now < validFrom || now > validUntil) {
        setCouponError('קופון זה אינו בתוקף');
        return;
      }
      
      if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
        setCouponError('קופון זה מוגבל בשימוש והגיע למכסה');
        return;
      }
      
      const itemsSubtotal = detailedItems.reduce((sum, item) => sum + item.priceILS, 0);
      
      if (coupon.minimum_order_amount && itemsSubtotal < coupon.minimum_order_amount) {
        setCouponError(`קופון זה תקף רק להזמנות מעל ₪${coupon.minimum_order_amount}`);
        return;
      }
      
      if (coupon.applies_to_site !== 'all' && coupon.applies_to_site !== site) {
        setCouponError('קופון זה לא תקף לאתר שנבחר');
        return;
      }
      
      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round((itemsSubtotal + domesticShipping) * (coupon.discount_value / 100));
      } else {
        discountAmount = Math.round(coupon.discount_value);
      }
      
      // Don't allow discount to exceed total
      const maxDiscount = itemsSubtotal + domesticShipping;
      discountAmount = Math.min(discountAmount, maxDiscount);
      
      setAppliedCoupon(coupon);
      setDiscount(discountAmount);
      
    } catch (error) {
      console.error("Error validating coupon:", error);
      setCouponError('שגיאה בבדיקת הקופון');
    } finally {
      setCheckingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode('');
    setCouponError('');
  };

  const handleContinue = () => {
    const itemsSubtotal = detailedItems.reduce((sum, item) => sum + item.priceILS, 0);
    const finalTotal = totalPrice - discount;
    
    const breakdown = {
      items_total_ils: itemsSubtotal,
      domestic_ship_ils: domesticShipping,
      discount_ils: discount,
      coupon_code: appliedCoupon?.code || null,
      final_total_ils: finalTotal,
      is_local: isLocalOrder
    };
    
    onConfirm(finalTotal, totalWeight, breakdown);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  const itemsSubtotal = detailedItems.reduce((sum, item) => sum + item.priceILS, 0);
  const finalTotal = totalPrice - discount;

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

          {/* Coupon Section */}
          <div className="mb-6">
            <h3 className="font-medium text-stone-700 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              קוד הנחה
            </h3>
            
            {!appliedCoupon ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError('');
                    }}
                    placeholder="הזן קוד קופון"
                    className="font-mono"
                    onKeyPress={(e) => e.key === 'Enter' && validateCoupon()}
                  />
                  <Button
                    onClick={validateCoupon}
                    disabled={!couponCode.trim() || checkingCoupon}
                    className="bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    {checkingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'החל'}
                  </Button>
                </div>
                {couponError && (
                  <p className="text-sm text-red-600">{couponError}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800 font-mono">{appliedCoupon.code}</p>
                    <p className="text-sm text-green-700">
                      {appliedCoupon.discount_type === 'percentage' 
                        ? `${appliedCoupon.discount_value}% הנחה` 
                        : `₪${appliedCoupon.discount_value} הנחה`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeCoupon}
                  className="text-green-600 hover:bg-green-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Price Summary */}
          <div className="space-y-3">
            <div className="flex justify-between text-stone-700">
              <span>סיכום פריטים</span>
              <span className="font-semibold">{formatCurrency(itemsSubtotal, 'ILS')}</span>
            </div>
            
            <div className="flex justify-between text-stone-700">
              <span>משלוח עד הבית</span>
              <span className="font-semibold">{formatCurrency(domesticShipping, 'ILS')}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-green-700">
                <span>הנחה ({appliedCoupon?.code})</span>
                <span className="font-semibold">-{formatCurrency(discount, 'ILS')}</span>
              </div>
            )}

            <Separator className="my-4" />

            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold text-stone-900">
                {labels.final_total_label || 'סה״כ לתשלום'}
              </span>
              <span className="text-2xl font-bold text-rose-600">
                {formatCurrency(finalTotal, 'ILS')}
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