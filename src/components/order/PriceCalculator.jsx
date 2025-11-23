import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { CalculationSettings } from '@/entities/CalculationSettings';
import { PricingLabels } from '@/entities/PricingLabels';
import { calculateImportCartPrice } from '../pricing/ImportPricingEngine';

const formatMoney = (amount) => {
  return `₪${Math.round(amount).toLocaleString('he-IL')}`;
};

export default function PriceCalculator({ cart, site, onConfirm, onBack }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [labels, setLabels] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load calculation settings
        const settingsList = await CalculationSettings.list();
        const currentSettings = settingsList && settingsList.length > 0 
          ? settingsList[0] 
          : {};
        
        // Load pricing labels
        const labelsList = await PricingLabels.list();
        const currentLabels = labelsList && labelsList.length > 0
          ? labelsList[0]
          : {};

        setSettings(currentSettings);
        setLabels(currentLabels);

        // Calculate prices using new engine
        const calculatedPrice = calculateImportCartPrice(cart, currentSettings);
        setPriceData(calculatedPrice);
        
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
  }, [cart]);

  const handleConfirm = () => {
    if (priceData) {
      onConfirm(
        priceData.finalPriceILS,
        cart.reduce((sum, item) => sum + ((item.estimated_weight_kg || item.item_weight || 0.25) * item.quantity), 0),
        priceData.breakdown
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

  const { cartSubtotal, importCosts, serviceFee, domesticShipping, vat, finalTotal } = priceData.breakdown;

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
            <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
              <span>{labels?.items_section_title || 'הפריטים שלך'}</span>
            </h3>
            <div className="space-y-2">
              {priceData.breakdown.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-stone-600 ltr text-left">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span className="text-stone-800 font-medium">
                    {formatMoney(item.fullPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <span className="text-stone-700 font-medium">סל הקניות</span>
              <span className="text-lg font-semibold text-stone-900">
                {formatMoney(cartSubtotal)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-t border-stone-200">
              <div className="flex items-center gap-2">
                <span className="text-stone-700 font-medium">עלות יבוא</span>
                <span className="text-xs text-stone-500">(משלוח, מכס, טיפול)</span>
              </div>
              <span className="text-lg font-semibold text-stone-900">
                {formatMoney(importCosts)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-t border-stone-200">
              <span className="text-stone-700 font-medium">משלוח עד הבית</span>
              <span className="text-lg font-semibold text-stone-900">
                {formatMoney(domesticShipping)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-t border-stone-200">
              <span className="text-stone-700 font-medium">מע״מ (18%)</span>
              <span className="text-lg font-semibold text-stone-900">
                {formatMoney(vat)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-4 border-t-2 border-rose-200">
              <span className="text-lg font-bold text-stone-900">
                {labels?.final_total_label || 'סה״כ לתשלום'}
              </span>
              <span className="text-2xl font-bold text-rose-600">
                {formatMoney(finalTotal)}
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
            המשך לתשלום
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