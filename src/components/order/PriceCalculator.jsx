import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Loader2, ShieldCheck, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { PricingLabels } from '@/entities/PricingLabels';
import { Coupon } from '@/entities/Coupon';

const formatMoney = (amount) => {
  return `₪${Math.round(amount).toLocaleString('he-IL')}`;
};

// שערי המרה קבועים
const EXCHANGE_RATES = {
  EUR: 4,
  GBP: 4.5,
  USD: 3.7 // לא בשימוש כרגע אבל נשמור למקרה הצורך
};

const MULTIPLIER = 2.5;
const DOMESTIC_SHIPPING = 30;
const LAUNCH_DISCOUNT_PERCENT = 0.15; // 15% הנחת השקה

export default function PriceCalculator({ cart, site, onConfirm, onBack }) {
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load pricing labels
        const labelsList = await PricingLabels.list();
        const currentLabels = labelsList && labelsList.length > 0
          ? labelsList[0]
          : {};

        setLabels(currentLabels);

        // Check if all items are local
        const isLocalOrder = cart.every(item => item.site === 'local');
        
        if (isLocalOrder) {
          // Simple calculation for local items - just item price + shipping
          const itemsTotal = cart.reduce((sum, item) => sum + (item.original_price * item.quantity), 0);
          
          // Check if this is a test product (price <= 1) - no shipping for test products
          const isTestProduct = itemsTotal <= 1;
          const domesticShipping = isTestProduct ? 0 : DOMESTIC_SHIPPING;
          const finalTotal = itemsTotal + domesticShipping;
          
          setPriceData({
            finalPriceILS: Math.round(finalTotal),
            breakdown: {
              items: cart.map(item => ({
                ...item,
                fullPrice: item.original_price * item.quantity
              })),
              cartSubtotal: itemsTotal,
              domesticShipping,
              finalTotal: Math.round(finalTotal),
              isLocal: true
            }
          });
        } else {
          // חישוב חדש ופשוט: מחיר מקורי * שער המרה * 2.5 + 30 משלוח
          const itemsWithPrices = cart.map(item => {
            const currency = item.original_currency || (site === 'uk' ? 'GBP' : 'EUR');
            const exchangeRate = EXCHANGE_RATES[currency] || 4;
            const itemPriceILS = item.original_price * exchangeRate * MULTIPLIER * item.quantity;
            return {
              ...item,
              fullPrice: Math.round(itemPriceILS)
            };
          });

          const itemsTotal = itemsWithPrices.reduce((sum, item) => sum + item.fullPrice, 0);
          const launchDiscount = Math.round(itemsTotal * LAUNCH_DISCOUNT_PERCENT);
          const afterDiscount = itemsTotal - launchDiscount;
          const finalTotal = afterDiscount + DOMESTIC_SHIPPING;

          setPriceData({
            finalPriceILS: Math.round(finalTotal),
            breakdown: {
              items: itemsWithPrices,
              cartSubtotal: itemsTotal,
              launchDiscount,
              afterDiscount,
              domesticShipping: DOMESTIC_SHIPPING,
              finalTotal: Math.round(finalTotal),
              isLocal: false
            }
          });
        }
        
      } catch (err) {
        console.error('Error loading pricing data:', err);
        setError('שגיאה בחישוב המחיר. אנא נסי שוב.');
      } finally {
        setLoading(false);
      }
    };

    if (cart && cart.length > 0) {
      loadData();
    }
  }, [cart, site]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('אנא הכניסי קוד קופון');
      return;
    }

    setApplyingCoupon(true);
    setCouponError('');

    try {
      const coupons = await Coupon.filter({ code: couponCode.trim().toUpperCase() });
      
      if (!coupons || coupons.length === 0) {
        setCouponError('קוד קופון לא תקף');
        setApplyingCoupon(false);
        return;
      }

      const coupon = coupons[0];

      // בדיקת תוקף
      if (!coupon.is_active) {
        setCouponError('קופון זה אינו פעיל');
        setApplyingCoupon(false);
        return;
      }

      // בדיקת תאריכים
      const now = new Date();
      const validFrom = new Date(coupon.valid_from);
      const validUntil = new Date(coupon.valid_until);

      if (now < validFrom || now > validUntil) {
        setCouponError('קופון זה פג תוקף');
        setApplyingCoupon(false);
        return;
      }

      // בדיקת מגבלת שימוש
      if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
        setCouponError('קופון זה נוצל במלואו');
        setApplyingCoupon(false);
        return;
      }

      // בדיקת סכום מינימלי
      if (coupon.minimum_order_amount && priceData.breakdown.finalTotal < coupon.minimum_order_amount) {
        setCouponError(`הזמנה מינימלית: ₪${coupon.minimum_order_amount}`);
        setApplyingCoupon(false);
        return;
      }

      // בדיקת התאמה לאתר
      if (coupon.applies_to_site && coupon.applies_to_site !== 'all' && coupon.applies_to_site !== site) {
        setCouponError('קופון זה לא תקף לאתר זה');
        setApplyingCoupon(false);
        return;
      }

      setAppliedCoupon(coupon);
      setCouponError('');
    } catch (err) {
      console.error('Error applying coupon:', err);
      setCouponError('שגיאה בבדיקת הקופון');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const calculateDiscount = () => {
    if (!appliedCoupon || !priceData) return 0;

    const subtotal = priceData.breakdown.finalTotal;

    if (appliedCoupon.discount_type === 'percentage') {
      return Math.round(subtotal * (appliedCoupon.discount_value / 100));
    } else {
      return Math.min(appliedCoupon.discount_value, subtotal);
    }
  };

  const getFinalPriceWithDiscount = () => {
    if (!priceData) return 0;
    const discount = calculateDiscount();
    return Math.max(0, priceData.breakdown.finalTotal - discount);
  };

  const handleConfirm = () => {
    if (priceData) {
      const finalPrice = getFinalPriceWithDiscount();
      const breakdown = {
        ...priceData.breakdown,
        coupon: appliedCoupon ? {
          code: appliedCoupon.code,
          discount: calculateDiscount()
        } : null,
        finalTotal: finalPrice
      };

      onConfirm(
        finalPrice,
        cart.reduce((sum, item) => sum + ((item.estimated_weight_kg || item.item_weight || 0.25) * item.quantity), 0),
        breakdown
      );
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה
        </Button>
      </motion.div>
    );
  }

  if (!priceData) {
    return null;
  }

  const { cartSubtotal, launchDiscount, domesticShipping, finalTotal } = priceData.breakdown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-3 sm:p-8">
      
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-stone-900 mb-2">
            סיכום הזמנה
          </h2>
          <p className="text-sm sm:text-base text-stone-600">
            פירוט מלא של העלויות
          </p>
        </div>

        <div className="bg-white border-2 border-rose-200/50 p-4 sm:p-6 shadow-lg space-y-4">
          
          {/* Items Section */}
          <div className="pb-4 border-b border-stone-200">
            <h3 className="font-bold text-xl text-stone-900 mb-3 flex items-center gap-2">
              <span>{labels?.items_section_title || 'הפריטים שלך'}</span>
            </h3>
            <div className="space-y-2">
              {priceData.breakdown.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-base font-bold">
                  <span className="text-stone-800 ltr text-left">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="text-stone-800">
                    {formatMoney(item.fullPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3">
            {/* Launch Discount - only for import orders */}
            {!priceData.breakdown.isLocal && launchDiscount > 0 && (
              <div className="flex justify-between items-center py-2 border-t border-stone-200 bg-green-50 px-2 -mx-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-green-700">🎉 קופון השקת אתר (15%)</span>
                </div>
                <span className="text-xs font-medium text-green-700">
                  -{formatMoney(launchDiscount)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-2 border-t border-stone-200">
              <span className="text-xs text-stone-600 italic">משלוח עד הבית</span>
              <span className="text-xs italic text-stone-700">
                {formatMoney(domesticShipping)}
              </span>
            </div>

            {/* Coupon Section */}
            <div className="py-3 border-t-2 border-stone-200">
              {!appliedCoupon ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    יש לך קוד קופון?
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="הכניסי קוד קופון"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="flex-1"
                      disabled={applyingCoupon}
                    />
                    <Button
                      onClick={handleApplyCoupon}
                      disabled={applyingCoupon || !couponCode.trim()}
                      variant="outline"
                      className="px-6"
                    >
                      {applyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'החל'}
                    </Button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-600">{couponError}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">קופון הוחל: {appliedCoupon.code}</p>
                        <p className="text-xs text-green-700">
                          {appliedCoupon.discount_type === 'percentage'
                            ? `הנחה של ${appliedCoupon.discount_value}%`
                            : `הנחה של ₪${appliedCoupon.discount_value}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={handleRemoveCoupon}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      הסר
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {appliedCoupon && (
              <div className="flex justify-between items-center py-2 border-t border-green-200 bg-green-50">
                <span className="text-sm font-medium text-green-900">הנחת קופון</span>
                <span className="text-sm font-bold text-green-600">
                  -{formatMoney(calculateDiscount())}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t-2 border-rose-200">
              <span className="text-lg font-bold text-stone-900">
                {labels?.final_total_label || 'סה״כ לתשלום'}
              </span>
              <span className="text-2xl font-bold text-rose-600">
                {formatMoney(getFinalPriceWithDiscount())}
              </span>
            </div>
          </div>

          {/* Final Note */}
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-center">
            <p className="text-sm text-stone-700">
              {labels?.final_note_text || 'מחיר סופי, כולל הכל. ברנדי מחו״ל עד אלייך.'}
            </p>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 text-stone-600 text-sm mt-4">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>תשלום מאובטח • ללא עלויות נוספות</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-6">
          <Button
            onClick={handleConfirm}
            className="order-1 sm:order-none h-12 px-8 bg-black hover:bg-stone-800 text-white font-medium flex items-center justify-center gap-2">
            למילוי פרטים
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={onBack}
            className="order-2 sm:order-none flex items-center justify-center gap-2 h-12 px-6">
            <ArrowLeft className="w-4 h-4" />
            חזור לסל
          </Button>
        </div>
      </div>
    </motion.div>
  );
}