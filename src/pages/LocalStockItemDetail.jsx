import React, { useState, useEffect } from "react";
import { LocalStockItem } from "@/entities/LocalStockItem";
import { CartItem } from "@/entities/CartItem";
import { User } from "@/entities/User";
import { BackInStockNotification } from "@/entities/BackInStockNotification";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowRight, ShoppingCart, Loader2, CheckCircle, Heart, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

export default function LocalStockItemDetail() {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyName, setNotifyName] = useState('');
  const [submittingNotification, setSubmittingNotification] = useState(false);

  useEffect(() => {
    User.me().then((u) => {
      setUser(u);
      if (u) {
        setNotifyEmail(u.email || '');
        setNotifyName(u.full_name || '');
      }
    }).catch(() => setUser(null));
    loadItem();
  }, []);

  const loadItem = async () => {
    setLoading(true);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const itemId = urlParams.get('id');

      if (!itemId) {
        window.location.href = createPageUrl('LocalStock');
        return;
      }

      const data = await LocalStockItem.get(itemId);
      setItem(data);
    } catch (error) {
      console.error("Error loading item:", error);
      alert("שגיאה בטעינת הפריט");
      window.location.href = createPageUrl('LocalStock');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (goToCart = false) => {
    setAddingToCart(true);

    try {
      await CartItem.create({
        site: 'local',
        product_url: item.source_url || '',
        product_name: item.product_name,
        product_sku: item.internal_sku || '',
        product_description: item.product_description || '',
        color: item.color || '',
        size: item.size || '',
        quantity: 1,
        original_price: item.price_ils,
        original_currency: 'ILS',
        item_type: item.category || 'other',
        item_weight: item.weight_kg || 0.3,
        item_image_url: item.image_url || '',
        available_colors: [],
        available_sizes: [],
        free_shipping: item.free_shipping || false
      });

      window.dispatchEvent(new CustomEvent('refreshCart'));

      if (goToCart) {
        // לרכישה - עבור ישירות לסל
        window.location.href = createPageUrl('Home') + '?site=local&step=4';
      } else {
        // הוספה לסל - חזור לדף המלאי המקומי
        setAddedToCart(true);
        setTimeout(() => {
          window.location.href = createPageUrl('LocalStock');
        }, 1000);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("שגיאה בהוספת הפריט לסל.");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleSubmitNotification = async () => {
    if (!notifyEmail || !item) return;

    setSubmittingNotification(true);
    try {
      await BackInStockNotification.create({
        local_stock_item_id: item.id,
        product_name: item.product_name,
        customer_email: notifyEmail,
        customer_name: notifyName,
        notified: false
      });

      alert('נרשמת בהצלחה! נעדכן אותך כשהפריט יחזור למלאי 💖');
      setNotifyDialogOpen(false);
    } catch (error) {
      console.error('Error submitting notification:', error);
      alert('שגיאה בשמירת הבקשה');
    } finally {
      setSubmittingNotification(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>);

  }

  if (!item) {
    return null;
  }

  const allImages = [item.image_url, ...(item.additional_images || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-rose-50/30 to-stone-100 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => window.location.href = createPageUrl('LocalStock')}
          className="mb-6 flex items-center gap-2 text-stone-600 hover:text-black">

          <ArrowRight className="w-4 h-4" />
          חזרה למלאי
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 bg-white p-6 sm:p-8 shadow-lg">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <motion.div
              key={selectedImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full bg-stone-100 overflow-hidden flex items-center justify-center"
              style={{ minHeight: '400px' }}>

              <img
                src={allImages[selectedImage]}
                alt={item.product_name}
                className="w-full h-auto object-contain max-h-[600px]" />

            </motion.div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 &&
            <div className="grid grid-cols-5 gap-2">
                {allImages.map((img, index) =>
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-full bg-stone-100 overflow-hidden border-2 transition-all flex items-center justify-center ${
                selectedImage === index ?
                'border-rose-400' :
                'border-stone-200 hover:border-stone-400'}`
                }
                style={{ height: '100px' }}>

                    <img
                  src={img}
                  alt={`${item.product_name} ${index + 1}`}
                  className="w-full h-full object-contain p-1" />

                  </button>
              )}
              </div>
            }
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-light text-stone-900 mb-3">
                {item.product_name}
              </h1>
              
              {item.product_description &&
              <p
                className="text-base text-stone-600 leading-relaxed"
                dir="ltr"
                style={{ textAlign: 'left' }}>

                  {item.product_description}
                </p>
              }
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-2">
              {item.color &&
              <Badge variant="outline" className="px-2 py-1 text-xs">
                  צבע: {item.color}
                </Badge>
              }
              {item.size &&
              <Badge variant="outline" className="px-2 py-1 text-xs">
                  מידה: {item.size}
                </Badge>
              }
            </div>

            {/* Price / Sold Out */}
            <div className="pt-6 border-t border-stone-200">
              {item.quantity_available > 0 && item.is_available ?
              <>
                  <p className="text-4xl font-bold text-stone-900">
                    ₪{item.price_ils}
                  </p>
                  {item.free_shipping &&
                <p className="text-sm text-green-600 mt-2 font-medium">
                      ✨ משלוח חינם!
                    </p>
                }
                </> :

              <div className="px-3 py-2 bg-stone-100 border border-stone-300 text-center">
                  <p className="text-stone-700 text-sm font-semibold">Sold Out • הפריט אזל מהמלאי</p>
                </div>
              }
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {item.quantity_available > 0 && item.is_available ?
              <>
                  <Button
                  onClick={() => handleAddToCart(true)}
                  disabled={addingToCart || addedToCart}
                  className="w-full h-14 bg-rose-500 hover:bg-rose-600 text-white text-lg">

                    {addingToCart ?
                  <>
                        <Loader2 className="w-5 h-5 animate-spin ml-2" />
                        מוסיף לסל...
                      </> :

                  'לרכישה'
                  }
                  </Button>
                  
                  <Button
                  onClick={() => handleAddToCart(false)}
                  disabled={addingToCart || addedToCart}
                  variant="outline"
                  className="w-full h-12 border-stone-300 text-stone-800 hover:bg-stone-100 text-base">

                    {addedToCart ?
                  <>
                        <CheckCircle className="w-5 h-5 ml-2 text-green-600" />
                        נוסף לסל!
                      </> :

                  <>
                        <ShoppingCart className="w-5 h-5 ml-2" />
                        הוסף לסל
                      </>
                  }
                  </Button>
                </> :

              <Button
                onClick={() => setNotifyDialogOpen(true)}
                className="w-full h-10 bg-rose-500 hover:bg-rose-600 text-white text-sm flex items-center justify-center gap-2">

                  <Bell className="w-4 h-4" />
                  NOTIFY ME WHEN AVAILABLE
                </Button>
              }
            </div>

            {/* Info Box */}
            <div className="p-4 bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-sm text-stone-700">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                <span>זמין במלאי המקומי שלנו בישראל</span>
              </div>
              <p className="text-sm text-stone-600">
                ⚡ אספקה מהירה: 3-7 ימי עסקים
              </p>
              <p className="text-xs text-stone-500">
                (לא כולל שישי-שבת, חגים ומועדים)
              </p>
            </div>


          </div>
        </div>
      </div>

      {/* Notify Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notify When Available</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-stone-600">
              נעדכן אותך במייל ברגע ש{item?.product_name} יחזור למלאי! 💖
            </p>
            <div className="space-y-2">
              <Label>שם (אופציונלי)</Label>
              <Input
                value={notifyName}
                onChange={(e) => setNotifyName(e.target.value)}
                placeholder="השם שלך" />

            </div>
            <div className="space-y-2">
              <Label>אימייל *</Label>
              <Input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="example@email.com"
                required />

            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleSubmitNotification}
              disabled={!notifyEmail || submittingNotification}
              className="bg-rose-500 hover:bg-rose-600">

              {submittingNotification ? 'שומר...' : 'עדכן אותי'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}