
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ArrowLeft, ArrowRight, ShoppingBag, Heart, Minus, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import ColorDisplay from './ColorDisplay';
import CartValueTip from './CartValueTip';

const getSiteName = (siteCode) => {
  const names = {
    'us': 'ארצות הברית',
    'eu': 'אירופה',
    'uk': 'בריטניה'
  };
  return names[siteCode] || siteCode;
};

export default function CartSummary({ cart, onRemove, onUpdateQuantity, onAddAnother, onCheckout, onBack, onEdit }) {
  // Helper: derive product name from URL if missing
  const getNameFromUrl = (url) => {
    try {
      if (!url) return "";
      const u = new URL(url);
      let path = u.pathname.replace(/\/+$/, ""); // Remove trailing slashes
      let slug = path.includes("/products/")
        ? path.split("/products/")[1] // Get slug after /products/
        : path.split("/").filter(Boolean).pop(); // Get last segment if not a product URL
      
      if (!slug) return "";
      
      // Remove query parameters or hash fragments
      slug = slug.split("?")[0].split("#")[0];
      
      slug = decodeURIComponent(slug); // Decode URL-encoded characters
      
      // Replace hyphens with spaces, capitalize each word
      return slug
        .replace(/-/g, ' ') // Replace hyphens with spaces
        .split(" ") // Split by space
        .filter(Boolean) // Remove empty strings
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1)) // Capitalize first letter of each word
        .join(" "); // Join back with spaces
    } catch (e) {
      console.warn("Could not parse URL for product name:", url, e);
      return "";
    }
  };

  const [deletingIds, setDeletingIds] = React.useState([]); // מניעת מחיקה כפולה

  const currentSite = cart.length > 0 ? cart[0].site : null;

  const currencySymbol = cart.length > 0 ?
  cart[0]?.original_currency === 'USD' ? '$' :
  cart[0]?.original_currency === 'EUR' ? '€' :
  cart[0]?.original_currency === 'GBP' ? '£' : '' :
  '';

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.original_price) || 0) * (item.quantity || 1), 0);

  const handleRemoveItem = async (itemId) => {
    if (deletingIds.includes(itemId)) return; // אם כבר מוחק — אל תפעל שוב
    
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
              const itemCurrencySymbol = item.original_currency === 'USD' ? '$' :
              item.original_currency === 'EUR' ? '€' :
              item.original_currency === 'GBP' ? '£' : '';

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
                        <p className="font-medium text-stone-700 ltr text-sm sm:text-base">{itemCurrencySymbol}{((Number(item.original_price) || 0) * (item.quantity || 1)).toFixed(2)}</p>
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
