import React, { useState, useEffect } from "react";
import { LocalStockItem } from "@/entities/LocalStockItem";
import { CartItem } from "@/entities/CartItem";
import { User } from "@/entities/User";
import { BackInStockNotification } from "@/entities/BackInStockNotification";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Search, ArrowRight, Loader2, CheckCircle, Plus, Settings, Bell, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import DiscountBanner from '../components/home/DiscountBanner';

const categoryNames = {
  tops: "חולצות וטופים",
  bottoms: "מכנסיים וחצאיות",
  dresses: "שמלות",
  sweaters: "סוודרים וסווטשירטים",
  accessories: "אביזרים",
  other: "אחר"
};

export default function LocalStock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addingToCart, setAddingToCart] = useState({});
  const [addedItems, setAddedItems] = useState(new Set());
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [selectedItemForNotify, setSelectedItemForNotify] = useState(null);
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notifyName, setNotifyName] = useState('');
  const [submittingNotification, setSubmittingNotification] = useState(false);
  const [allItems, setAllItems] = useState([]);

  useEffect(() => {
    User.me().then((u) => {
      setUser(u);
      // Check if user is admin - if not, redirect to home
      if (!u || u.role !== 'admin') {
        window.location.href = createPageUrl('Home');
        return;
      }
      if (u) {
        setNotifyEmail(u.email || '');
        setNotifyName(u.full_name || '');
      }
      setCheckingAuth(false);
    }).catch(() => {
      // User not logged in or error - redirect to home
      window.location.href = createPageUrl('Home');
    });
    loadItems();

    // Check for highlighted item from email
    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight');
    if (highlightId) {
      setTimeout(() => {
        const element = document.getElementById(`item-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-rose-400', 'ring-offset-4');
        }
      }, 500);
    }
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await LocalStockItem.list();
      setAllItems(data);

      const now = new Date();

      // Filter: not hidden and available_from has passed (show both in-stock and out-of-stock items)
      const visibleItems = data.filter((item) => {
        const isVisibleToCustomer = user && user.role === 'admin' || !item.is_hidden;

        // Check if scheduled availability has passed
        const isScheduledAvailable = !item.available_from || new Date(item.available_from) <= now;

        return isVisibleToCustomer && isScheduledAvailable;
      });

      // Sort: available for sale first, then unavailable
      // Secondary sort: by updated_date (newest first) within each group
      visibleItems.sort((a, b) => {
        // Primary: is_available (true first)
        if (a.is_available !== b.is_available) {
          return a.is_available ? -1 : 1;
        }
        // Secondary: updated_date (newest first)
        return new Date(b.updated_date) - new Date(a.updated_date);
      });

      setItems(visibleItems);
    } catch (error) {
      console.error("Error loading local stock items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (item, goToCart = false) => {
    setAddingToCart((prev) => ({ ...prev, [item.id]: true }));

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

      window.dispatchEvent(new CustomEvent('refreshCart'));

      if (goToCart) {
        // לרכישה - עבור ישירות לסל
        window.location.href = createPageUrl('Home') + '?site=local&step=4';
      } else {
        // הוספה לסל - הישאר בדף המלאי המקומי
        setAddedItems((prev) => new Set([...prev, item.id]));
        setTimeout(() => {
          setAddedItems((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
        }, 1500);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("שגיאה בהוספת הפריט לסל.");
    } finally {
      setAddingToCart((prev) => ({ ...prev, [item.id]: false }));
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = !searchQuery ||
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.product_description && item.product_description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleNotifyRequest = (item) => {
    setSelectedItemForNotify(item);
    setNotifyDialogOpen(true);
  };

  const handleSubmitNotification = async () => {
    if (!notifyEmail || !selectedItemForNotify) return;

    setSubmittingNotification(true);
    try {
      await BackInStockNotification.create({
        local_stock_item_id: selectedItemForNotify.id,
        product_name: selectedItemForNotify.product_name,
        customer_email: notifyEmail,
        customer_name: notifyName,
        notified: false
      });

      alert('נרשמת בהצלחה! נעדכן אותך כשהפריט יחזור למלאי 💖');
      setNotifyDialogOpen(false);
      setSelectedItemForNotify(null);
    } catch (error) {
      console.error('Error submitting notification:', error);
      alert('שגיאה בשמירת הבקשה');
    } finally {
      setSubmittingNotification(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-rose-50/30 to-stone-100 pb-12">
      <DiscountBanner />
      <div className="bg-gradient-to-r from-rose-100/50 to-pink-100/50 py-6 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center">
            <h1 className="text-2xl sm:text-3xl font-light text-stone-800 mb-2">זמין במלאי</h1>
            <p className="text-sm text-stone-500 font-light">אספקה מהירה עד הבית תוך 3-7 ימי עסקים.</p>
            <p className="text-sm text-stone-500 font-light mt-4">למען שמירה על זכויות יוצרים, הסרנו את כל התמונות</p>
            <p className="text-sm text-stone-500 font-light">לינק לפריט המקורי מופיע בתיאור כל פריט</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {user && user.role === 'admin' && <div className="mb-6 flex justify-end gap-3">
            <Button onClick={() => window.location.href = createPageUrl('ManageLocalStock')} className="bg-stone-800 hover:bg-stone-900 text-white flex items-center gap-2">
              <Settings className="w-4 h-4" />
              ניהול מלאי
            </Button>
          </div>
        }

        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 w-5 h-5 text-stone-400" />
            <Input
              placeholder="חיפוש פריטים..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 bg-white/80 backdrop-blur-sm" />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-white/80 backdrop-blur-sm">
              <SelectValue placeholder="כל הקטגוריות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הקטגוריות</SelectItem>
              {Object.entries(categoryNames).map(([key, name]) =>
              <SelectItem key={key} value={key}>{name}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {loading ?
        <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
          </div> :
        filteredItems.length === 0 ?
        <div className="text-center py-20">
            <p className="text-stone-500 text-lg">לא נמצאו פריטים במלאי</p>
          </div> :

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            <AnimatePresence>
              {filteredItems.map((item, index) =>
            <motion.div
              key={item.id}
              id={`item-${item.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}>

                  <Card
                className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 bg-white cursor-pointer group border-0 shadow-none"
                onClick={() => window.location.href = createPageUrl('LocalStockItemDetail') + '?id=' + item.id}>

                    <CardContent className="p-0 relative">
                      <div className="w-full bg-white overflow-hidden relative flex items-center justify-center" style={{ minHeight: '280px' }}>
                          <Heart className="w-20 h-20 text-rose-200 fill-rose-200" />

                          {item.quantity_available === 0 || !item.is_available ?
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNotifyRequest(item);
                      }}
                      className="absolute bottom-1 left-1 w-6 h-6 bg-white/80 hover:bg-white flex items-center justify-center rounded-full shadow-sm transition-all duration-200">

                              <Bell className="w-3 h-3 text-stone-800" />
                            </button> :

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(item);
                      }}
                      disabled={addingToCart[item.id] || addedItems.has(item.id)}
                      className="absolute bottom-1 left-1 w-6 h-6 bg-white/80 hover:bg-white flex items-center justify-center rounded-full shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">

                              {addingToCart[item.id] ?
                      <Loader2 className="w-3 h-3 animate-spin text-stone-800" /> :
                      addedItems.has(item.id) ?
                      <CheckCircle className="w-3 h-3 text-green-600" /> :

                      <Plus className="w-3 h-3 text-stone-800" />
                      }
                            </button>
                    }
                        </div>
                      <div className="px-4 py-3">
                        <div className="space-y-2">
                          <h3 className="font-medium text-sm text-stone-800">
                            {item.product_name}
                          </h3>
                          {(item.color || item.size) && (
                            <div className="flex items-center gap-2">
                              {item.color && item.color_hex && (
                                <div 
                                  className="w-4 h-4 border border-stone-300 flex-shrink-0" 
                                  style={{ backgroundColor: item.color_hex }}
                                  title={item.color}
                                />
                              )}
                              <p className="text-xs text-stone-500">
                                {[item.color, item.size].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          )}
                          <p className="text-stone-800 text-lg font-semibold">
                            ₪{item.price_ils}
                          </p>

                          {item.source_url && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-600 hover:text-blue-700 underline block"
                            >
                              🔗 לפריט באתר המקורי
                            </a>
                          )}
                          
                          {!item.show_image &&
                      <div className="flex gap-2">
                              {item.quantity_available === 0 || !item.is_available ?
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotifyRequest(item);
                          }}
                          className="flex-1 px-3 py-2 bg-stone-100 hover:bg-stone-200 flex items-center justify-center gap-2 transition-all duration-200 text-sm">
                                  <Bell className="w-4 h-4 text-stone-800" />
                                  עדכן אותי
                                </button> :
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                          }}
                          disabled={addingToCart[item.id] || addedItems.has(item.id)}
                          className="flex-1 px-3 py-2 bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                                  {addingToCart[item.id] ?
                          <Loader2 className="w-4 h-4 animate-spin" /> :
                          addedItems.has(item.id) ?
                          <CheckCircle className="w-4 h-4" /> :
                          <Plus className="w-4 h-4" />
                          }
                                  {addedItems.has(item.id) ? 'נוסף' : 'הוסף'}
                                </button>
                        }
                            </div>
                      }
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
            )}
            </AnimatePresence>
          </div>
        }

        <div className="mt-12 text-center">
          <Button
            variant="outline"
            onClick={() => window.location.href = createPageUrl('Home')}
            className="gap-2">
            <ArrowRight className="w-4 h-4" />
            חזרה לבחירת אתר
          </Button>
        </div>
      </div>

      {/* Notify Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>עדכון כשחוזר למלאי</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-stone-600">
              נעדכן אותך במייל ברגע ש{selectedItemForNotify?.product_name} יחזור למלאי! 💖
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