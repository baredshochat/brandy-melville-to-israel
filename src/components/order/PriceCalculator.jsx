import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Loader2, ShieldCheck, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { PricingLabels } from '@/entities/PricingLabels';
import { Code } from '@/entities/Code';
import { Order } from '@/entities/Order';
import { CalculationSettings } from '@/entities/CalculationSettings';
import { base44 } from '@/api/base44Client';

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

export default function PriceCalculator({ cart, site, onConfirm, onBack, parentOrderId }) {
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [calSettings, setCalSettings] = useState(null);
  const [error, setError] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState(null);
  const [codeError, setCodeError] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load pricing labels
        const labelsList = await PricingLabels.list();
        const currentLabels = labelsList && labelsList.length > 0 ?
        labelsList[0] :
        {};

        setLabels(currentLabels);

        // Load CalculationSettings
        const calculationSettingsList = await CalculationSettings.list();
        const currentCalSettings = calculationSettingsList && calculationSettingsList.length > 0 ? calculationSettingsList[0] : {};
        setCalSettings(currentCalSettings);

        // Check if all items are local
        const isLocalOrder = cart.every((item) => item.site === 'local');
        
        // Calculate domestic shipping cost
        let domesticShippingCost = 0;
        if (site === 'local' && cart.length > 0) {
          domesticShippingCost = currentCalSettings.domestic_ship_ils || 35;
        }

        // Apply free shipping if part of an add-on order with active free shipping
        if (parentOrderId) {
          try {
            const parentOrder = await Order.get(parentOrderId);
            if (parentOrder && parentOrder.free_shipping_until && new Date(parentOrder.free_shipping_until) > new Date()) {
              domesticShippingCost = 0; // Apply free shipping
            }
          } catch (e) {
            console.error('Error checking parent order for free shipping:', e);
          }
        }

        if (isLocalOrder) {
          // Simple calculation for local items - just item price + shipping
          const itemsTotal = cart.reduce((sum, item) => sum + item.original_price * item.quantity, 0);

          // Check if all items have free shipping
          const allFreeShipping = cart.every((item) => item.free_shipping === true);
          const currentDomesticShipping = allFreeShipping ? 0 : domesticShippingCost;
          const finalTotal = itemsTotal + currentDomesticShipping;

          setPriceData({
            finalPriceILS: Math.round(finalTotal),
            breakdown: {
              items: cart.map((item) => ({
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
          const itemsWithPrices = cart.map((item) => {
            const currency = item.original_currency || (site === 'uk' ? 'GBP' : 'EUR');
            const exchangeRate = EXCHANGE_RATES[currency] || currentCalSettings.fx_eur_ils || 4;
            const multiplier = currentCalSettings.initial_display_percent ? (1 / currentCalSettings.initial_display_percent) : MULTIPLIER;
            const itemPriceILS = item.original_price * exchangeRate * multiplier * item.quantity;
            return {
              ...item,
              fullPrice: Math.round(itemPriceILS)
            };
          });

          const itemsTotal = itemsWithPrices.reduce((sum, item) => sum + item.fullPrice, 0);
          const finalTotal = itemsTotal + domesticShippingCost;

          setPriceData({
            finalPriceILS: Math.round(finalTotal),
            breakdown: {
              items: itemsWithPrices,
              cartSubtotal: itemsTotal,
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
  }, [cart, site, parentOrderId]);

  const handleApplyCode = async () => {
    if (!codeInput.trim()) {
      setCodeError('אנא הכניסי קוד');
      return;
    }

    setApplyingCode(true);
    setCodeError('');

    try {
      const codes = await Code.filter({ code: codeInput.trim().toUpperCase() });

      if (!codes || codes.length === 0) {
        setCodeError('קוד לא תקף');
        setApplyingCode(false);
        return;
      }

      const code = codes[0];

      // Validations
      if (!code.is_active) {
        setCodeError('הקוד אינו פעיל');
        setApplyingCode(false);
        return;
      }

      if (code.expires_at && new Date(code.expires_at) < new Date()) {
        setCodeError('תוקף הקוד פג');
        setApplyingCode(false);
        return;
      }

      if (code.usage_limit_total && code.used_count >= code.usage_limit_total) {
        setCodeError('הקוד הגיע למגבלת השימוש');
        setApplyingCode(false);
        return;
      }

      setAppliedCode(code);
      setCodeError('');
    } catch (err) {
      console.error('Error applying code:', err);
      setCodeError('שגיאה בבדיקת הקוד');
    } finally {
      setApplyingCode(false);
    }
  };

  const handleRemoveCode = () => {
    setAppliedCode(null);
    setCodeInput('');
    setCodeError('');
  };

  const calculateDiscount = () => {
    if (!appliedCode || !priceData) return { amount: 0, message: '' };

    const subtotal = priceData.breakdown.finalTotal;
    const eligibleItems = cart;

    if (appliedCode.reward_type === 'percent') {
      const amount = Math.round(subtotal * (appliedCode.value / 100));
      return { amount, message: `הנחה של ${appliedCode.value}%` };
    }

    if (appliedCode.reward_type === 'fixed') {
      const amount = Math.min(appliedCode.value, subtotal);
      return { amount, message: `הנחה של ₪${appliedCode.value}` };
    }

    if (appliedCode.reward_type === 'buy_x_get_y') {
      const totalQty = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);

      if (totalQty >= appliedCode.buy_quantity) {
        const sortedItems = [...eligibleItems].sort((a, b) => 
          (a.original_price || 0) - (b.original_price || 0)
        );

        const freeQty = Math.min(
          appliedCode.get_quantity,
          Math.floor(totalQty / appliedCode.buy_quantity) * appliedCode.get_quantity
        );

        let remainingFree = freeQty;
        let discount = 0;

        for (const item of sortedItems) {
          if (remainingFree <= 0) break;
          const itemsToDiscount = Math.min(remainingFree, item.quantity);
          discount += itemsToDiscount * (item.original_price || 0);
          remainingFree -= itemsToDiscount;
        }

        return { 
          amount: Math.round(discount), 
          message: `קנה ${appliedCode.buy_quantity} קבל ${appliedCode.get_quantity} - ${freeQty} פריטים בחינם!`
        };
      } else {
        return { 
          amount: 0, 
          message: `קנה עוד ${appliedCode.buy_quantity - totalQty} פריטים לקבלת ההנחה`
        };
      }
    }

    return { amount: 0, message: '' };
  };

  const getFinalPriceWithDiscount = () => {
    if (!priceData) return 0;
    const { amount } = calculateDiscount();
    return Math.max(0, priceData.breakdown.finalTotal - amount);
  };

  const handleConfirm = async () => {
    if (priceData) {
      const finalPrice = getFinalPriceWithDiscount();
      const { amount: discountAmount, message: discountMessage } = calculateDiscount();
      
      const breakdown = {
        ...priceData.breakdown,
        code: appliedCode ? {
          code: appliedCode.code,
          type: appliedCode.type,
          reward_type: appliedCode.reward_type,
          discount: discountAmount,
          message: discountMessage
        } : null,
        finalTotal: finalPrice
      };

      // Increment code usage if applied
      if (appliedCode) {
        try {
          await Code.update(appliedCode.id, { 
            used_count: (appliedCode.used_count || 0) + 1 
          });
          
          // Check if should disable due to limits
          if (appliedCode.usage_limit_total && 
              (appliedCode.used_count + 1) >= appliedCode.usage_limit_total) {
            await Code.update(appliedCode.id, { is_active: false });
          }
        } catch (err) {
          console.error('Error updating code usage:', err);
        }
      }

      onConfirm(
        finalPrice,
        cart.reduce((sum, item) => sum + (item.estimated_weight_kg || item.item_weight || 0.25) * item.quantity, 0),
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
      </motion.div>);

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
      </motion.div>);

  }

  if (!priceData) {
    return null;
  }

  const { cartSubtotal, domesticShipping, finalTotal } = priceData.breakdown;

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
            {parentOrderId && priceData?.breakdown?.domesticShipping === 0 
              ? "משלוח זה יצורף להזמנה הקיימת שלך, ללא עלות נוספת! 🎉"
              : "פירוט מלא של העלויות"}
          </p>
        </div>

        <div className="bg-white border-2 border-rose-200/50 p-4 sm:p-6 shadow-lg space-y-4">
          
          {/* Items Section */}
          <div className="pb-4 border-b border-stone-200">
            <h3 className="font-bold text-xl text-stone-900 mb-3 flex items-center gap-2">
              <span>{labels?.items_section_title || 'הפריטים שלך'}</span>
            </h3>
            <div className="space-y-2">
              {priceData.breakdown.items.map((item, idx) =>
              <div key={idx} className="flex justify-between text-base font-bold">
                  <span className="text-stone-800 ltr text-left">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="text-stone-800">
                    {formatMoney(item.fullPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-t border-stone-200">
              <span className="text-xs text-stone-600 italic">משלוח עד הבית</span>
              <span className="text-xs italic text-stone-700">
                {priceData?.breakdown?.domesticShipping === 0 && parentOrderId
                  ? "חינם! 🎁"
                  : formatMoney(priceData?.breakdown?.domesticShipping || 0)}
              </span>
            </div>

            {/* Code Section */}
            <div className="py-3 border-t-2 border-stone-200">
              {!appliedCode ?
              <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    יש לך קוד הנחה?
                  </label>
                  <div className="flex gap-2">
                    <Input
                    type="text"
                    placeholder="הכניסי קוד"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                    className="flex-1"
                    disabled={applyingCode} />

                    <Button
                    onClick={handleApplyCode}
                    disabled={applyingCode || !codeInput.trim()}
                    variant="outline"
                    className="px-6">

                      {applyingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'החל'}
                    </Button>
                  </div>
                  {codeError &&
                <p className="text-xs text-red-600">{codeError}</p>
                }
                </div> :

              <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">קוד הוחל: {appliedCode.code}</p>
                        <p className="text-xs text-green-700">{calculateDiscount().message}</p>
                      </div>
                    </div>
                    <Button
                    onClick={handleRemoveCode}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50">

                      הסר
                    </Button>
                  </div>
                </div>
              }
            </div>

            {appliedCode && calculateDiscount().amount > 0 &&
            <div className="flex justify-between items-center py-2 border-t border-green-200 bg-green-50">
                <span className="text-sm font-medium text-green-900">הנחה</span>
                <span className="text-sm font-bold text-green-600">
                  -{formatMoney(calculateDiscount().amount)}
                </span>
              </div>
            }

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
    </motion.div>);

}