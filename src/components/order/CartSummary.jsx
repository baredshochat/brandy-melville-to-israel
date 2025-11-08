import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeft, ArrowRight, ShoppingBag, Heart, Minus, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import ColorDisplay from './ColorDisplay';
import CartValueTip from './CartValueTip';
import { Rates } from '@/entities/Rates';
import { CalculationSettings } from '@/entities/CalculationSettings';

const getSiteName = (siteCode) => {
  const names = {
    'us': 'ארצות הברית',
    'eu': 'אירופה',
    'uk': 'בריטניה',
    'local': 'ישראל'
  };
  return names[siteCode] || siteCode;
};

export default function CartSummary({ cart, onRemove, onUpdateQuantity, onAddAnother, onCheckout, onBack, onEdit }) {
  // Helper: derive product name from URL if missing
  const getNameFromUrl = (url) => {
    try {
      if (!url) return "";
      const u = new URL(url);
      let path = u.pathname.replace(/\/+$/, "");
      let slug = path.includes("/products/")
        ? path.split("/products/")[1]
        : path.split("/").filter(Boolean).pop();
      
      if (!slug) return "";
      slug = slug.split("?")[0].split("#")[0];
      slug = decodeURIComponent(slug);
      
      return slug
        .replace(/-/g, ' ')
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    } catch (e) {
      console.warn("Could not parse URL for product name:", url, e);
      return "";
    }
  };

  const [deletingIds, setDeletingIds] = React.useState([]);
  const [rates, setRates] = React.useState({ usd: 3.7, eur: 4.0, gbp: 4.5 });
  const [settings, setSettings] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  // Fetch exchange rates and calculation settings
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch rates
        const ratesList = await Rates.list();
        if (ratesList && ratesList.length > 0) {
          const latestRate = ratesList[0];
          setRates({
            usd: latestRate.usd || 3.7,
            eur: latestRate.eur || 4.0,
            gbp: latestRate.gbp || 4.5
          });
        }

        // Fetch calculation settings
        const settingsList = await CalculationSettings.list();
        if (settingsList && settingsList.length > 0) {
          setSettings(settingsList[0]);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper function to convert price to ILS
  const convertToILS = (price, currency) => {
    const amount = Number(price) || 0;
    if (currency === 'USD') return amount * rates.usd;
    if (currency === 'EUR') return amount * rates.eur;
    if (currency === 'GBP') return amount * rates.gbp;
    return amount;
  };

  // Calculate full cost per item (including proportional shipping, fees, and VAT)
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

  const currentSite = cart.length > 0 ? cart[0].site : null;
  const isLocalOrder = currentSite === 'local';

  // Calculate subtotal with all costs included
  const subtotalILS = cart.reduce((sum, item) => {
    return sum + calculateItemFullCost(item, cart);
  }, 0);

  const handleRemoveItem = async (itemId) => {
    if (deletingIds.includes(itemId)) return;
    
    setDeletingIds((prev) => [...prev, itemId]);
    try {
      await onRemove(itemId);
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== itemId));
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    try {
      await onUpdateQuantity(itemId, newQuantity);
    } catch (error) {
      console.error("Error updating quantity:", error);
      if (error && error.message && !error.message.includes('404') && !error.message.includes('not found')) {
        alert('שגיאה בעדכון הכמות. אנא נסי שוב.');
      }
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 flex justify-center items-center">
        <div className="text-stone-500">טוען...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="step4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="p-3 sm:p-8">

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-10">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-rose-300 fill-rose-300" />
            <h2 className="text-2xl sm:text-4xl font-semibold text-stone-900">
              סל הקניות שלך
            </h2>
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-rose-300 fill-rose-300" />
          </div>
          {currentSite &&
          <p className="text-sm text-stone-600">
              מוצרים מ{getSiteName(currentSite)}
            </p>
          }
        </div>

        <div className="bg-stone-50 border-2 border-rose-200/50 p-4 sm:p-8 shadow-lg">
            {cart.length > 0 ?
          <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-4 sm:mb-6">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                  <h3 className="text-base sm:text-lg font-medium text-stone-800">הפריטים שלך מ{getSiteName(currentSite)}</h3>
                </div>
                
                {cart.map((item) => {
              const displayName = (item.product_name && item.product_name.trim())
                ? item.product_name
                : getNameFromUrl(item.product_url);

              const itemFullCost = calculateItemFullCost(item, cart);

              return (
                <div key={item.id} className="flex items-start justify-between p-3 sm:p-4 bg-white/80 border border-rose-100 shadow-sm flex-col gap-3 sm:flex-row sm:gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-stone-800 ltr text-left text-sm sm:text-base">{displayName}</p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1">
                          <ColorDisplay colorName={item.color} size="sm" />
                          <span className="text-stone-400">•</span>
                          <span className="text-xs sm:text-sm text-stone-500 ltr text-left">{item.size}</span>
                        </div>
                        {item.item_notes &&
                    <div className="mt-2 p-2 bg-stone-50 border border-stone-200">
                            <p className="text-xs text-stone-600">
                              <span className="font-medium">הערות:</span> {item.item_notes}
                            </p>
                          </div>
                    }
                        {item.item_image_url &&
                    <div className="mt-2">
                            <img
                        src={item.item_image_url}
                        alt="תמונה של הפריט"
                        loading="lazy"
                        decoding="async"
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover border border-stone-200" />
                          </div>
                    }
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between">
                          <div className="flex items-center gap-1 sm:gap-2">
                             <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8 rounded-none" onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}><Minus className="w-3 h-3 sm:w-4 sm:h-4" /></Button>
                              <span className="w-6 sm:w-8 text-center font-medium text-sm sm:text-base">{item.quantity}</span>
                             <Button size="icon" variant="outline" className="h-7 w-7 sm:h-8 sm:w-8 rounded-none" onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}><Plus className="w-3 h-3 sm:w-4 sm:h-4" /></Button>
                          </div>
                        <div className="text-left">
                          <p className="font-medium text-stone-700 text-sm sm:text-base">₪{itemFullCost.toFixed(2)}</p>
                          {!isLocalOrder && (
                            <p className="text-xs text-stone-400">כולל הכל</p>
                          )}
                        </div>
                        <div className="flex items-center">
                          <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="text-stone-400 hover:text-blue-500 hover:bg-blue-50 w-8 h-8">
                              <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={deletingIds.includes(item.id)}
                        className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 w-8 h-8 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>);

            })}
                {/* Upsell tip when cart has 1–2 items */}
                <CartValueTip count={cart.length} onAddAnother={onAddAnother} />

                <div className="pt-4 sm:pt-6 border-t-2 border-rose-200/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-stone-600 font-medium">סיכום ביניים:</span>
                    <span className="text-xl font-bold text-stone-800">₪{subtotalILS.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-stone-500 mb-4 text-center">
                    {isLocalOrder 
                      ? 'בשלב הבא יתווסף רק משלוח עד הבית (₪35) 🏠'
                      : 'המחירים כוללים משלוח בינלאומי, עמלות ומע״ם. בשלב הבא יתווסף רק משלוח עד הבית 🏠'}
                  </p>
                  <Button
                    onClick={onCheckout}
                    disabled={cart.length === 0}
                    className="w-full h-12 sm:h-14 px-6 sm:px-8 bg-black hover:bg-stone-800 active:bg-stone-700 text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 shadow-lg text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    סיכום הזמנה
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
                 
              </div> :

          <div className="text-center py-8 sm:py-12">
                <ShoppingBag className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-rose-300 mb-3 sm:mb-4" />
                <p className="text-stone-500 text-base sm:text-lg">סל הקניות שלך ריק.</p>
                <p className="text-stone-400 text-sm mt-2">הוסיפי מוצרים מהאתר שבחרת</p>
              </div>
          }
        </div>
        
        <div className="flex flex-col gap-3 sm:gap-4 mt-6 sm:mt-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button variant="outline" onClick={onAddAnother} className="w-full sm:w-auto flex items-center justify-center gap-2 h-10 sm:h-12 px-4 sm:px-6 border-rose-200 hover:bg-rose-50 text-stone-800 hover:border-rose-300 text-sm sm:text-base">
              <Plus className="w-4 h-4" />
              הוספת פריט נוסף
            </Button>
            <Button
              variant="ghost"
              onClick={() => onBack()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 h-10 sm:h-12 px-4 sm:px-6 text-stone-600 hover:text-black hover:bg-stone-100 text-sm sm:text-base">
              <ArrowLeft className="w-4 h-4" />
              חזור לבחירת אתר
            </Button>
          </div>
        </div>
      </div>
    </motion.div>);

}