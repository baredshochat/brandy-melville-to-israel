import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeft, ArrowRight, ShoppingBag, Heart, Minus, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import ColorDisplay from './ColorDisplay';
import CartValueTip from './CartValueTip';

// שערי המרה קבועים
const EXCHANGE_RATES = {
  EUR: 4,
  GBP: 4.5,
  USD: 3.7
};

const MULTIPLIER = 2.2;

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
  const [displayPrice, setDisplayPrice] = React.useState(0);

  React.useEffect(() => {
    // Calculate display price
    if (cart && cart.length > 0) {
      const isLocalOrder = cart.every(item => item.site === 'local');
      
      if (isLocalOrder) {
        // For local items, just show the item prices (no shipping in cart summary)
        const localTotal = cart.reduce((sum, item) => sum + (item.original_price * item.quantity), 0);
        setDisplayPrice(localTotal);
      } else {
        // For import items: מחיר מקורי * שער המרה * 2.5
        const importTotal = cart.reduce((sum, item) => {
          const currency = item.original_currency || 'EUR';
          const exchangeRate = EXCHANGE_RATES[currency] || 4;
          return sum + (item.original_price * exchangeRate * MULTIPLIER * item.quantity);
        }, 0);
        setDisplayPrice(Math.round(importTotal));
      }
    }
  }, [cart]);

  const currentSite = cart.length > 0 ? cart[0].site : null;
  const isLocalOrder = currentSite === 'local';

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

  const canCheckout = cart.length >= 1;

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


                <CartValueTip count={cart.length} onAddAnother={onAddAnother} />

                <div className="pt-4 sm:pt-6 border-t-2 border-rose-200/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-stone-600 font-medium">סיכום ביניים:</span>
                    <span className="text-xl font-bold text-stone-800">₪{displayPrice.toLocaleString('he-IL')}</span>
                  </div>
                  <p className="text-xs text-stone-500 mb-4 text-center">
                    מחיר הפריטים בלבד. עלויות משלוח ומסים יתווספו בשלב הבא 📦
                  </p>
                  <Button
                    onClick={onCheckout}
                    disabled={!canCheckout}
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