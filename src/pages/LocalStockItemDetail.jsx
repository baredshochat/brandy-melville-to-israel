
import React, { useState, useEffect } from "react";
import { LocalStockItem } from "@/entities/LocalStockItem";
import { CartItem } from "@/entities/CartItem";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ShoppingCart, Loader2, CheckCircle, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { createPageUrl } from "@/utils";

export default function LocalStockItemDetail() {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    User.me().then(setUser).catch(() => setUser(null));
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

  const handleAddToCart = async () => {
    if (!user) {
      alert("אנא התחברי כדי להוסיף פריטים לסל.");
      return;
    }

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
        available_sizes: []
      });

      setAddedToCart(true);
      window.dispatchEvent(new CustomEvent('refreshCart'));

      setTimeout(() => {
        setAddedToCart(false);
      }, 2000);
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("שגיאה בהוספת הפריט לסל.");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
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
          className="mb-6 flex items-center gap-2 text-stone-600 hover:text-black"
        >
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
              style={{ minHeight: '400px' }}
            >
              <img
                src={allImages[selectedImage]}
                alt={item.product_name}
                className="w-full h-auto object-contain max-h-[600px]"
              />
            </motion.div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-full bg-stone-100 overflow-hidden border-2 transition-all flex items-center justify-center ${
                      selectedImage === index
                        ? 'border-rose-400'
                        : 'border-stone-200 hover:border-stone-400'
                    }`}
                    style={{ height: '100px' }}
                  >
                    <img
                      src={img}
                      alt={`${item.product_name} ${index + 1}`}
                      className="w-full h-full object-contain p-1"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-light text-stone-900 mb-3">
                {item.product_name}
              </h1>
              
              {item.product_description && (
                <p 
                  className="text-base text-stone-600 leading-relaxed" 
                  dir="ltr" 
                  style={{ textAlign: 'left' }}
                >
                  {item.product_description}
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-3">
              {item.color && (
                <Badge variant="outline" className="px-4 py-2 text-sm">
                  צבע: {item.color}
                </Badge>
              )}
              {item.size && (
                <Badge variant="outline" className="px-4 py-2 text-sm">
                  מידה: {item.size}
                </Badge>
              )}
            </div>

            {/* Price */}
            <div className="pt-6 border-t border-stone-200">
              <p className="text-4xl font-bold text-stone-900">
                ₪{item.price_ils}
              </p>
              <p className="text-sm text-stone-500 mt-2">
                + 35 ש״ח משלוח עד הבית
              </p>
            </div>

            {/* Add to Cart */}
            <Button
              onClick={handleAddToCart}
              disabled={addingToCart || addedToCart || !item.is_available}
              className="w-full h-14 bg-stone-800 hover:bg-stone-900 text-white text-lg"
            >
              {addingToCart ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  מוסיף לסל...
                </>
              ) : addedToCart ? (
                <>
                  <CheckCircle className="w-5 h-5 ml-2" />
                  נוסף לסל!
                </>
              ) : !item.is_available ? (
                'אזל מהמלאי'
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 ml-2" />
                  הוסף לסל
                </>
              )}
            </Button>

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

            {/* Source Link */}
            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-rose-600 hover:underline block"
              >
                צפייה באתר המקורי ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
