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
import { ShoppingCart, Search, ArrowRight, Loader2, CheckCircle, Plus, Settings, Bell } from "lucide-react";
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
    User.me().then(u => {
      setUser(u);
      if (u) {
        setNotifyEmail(u.email || '');
        setNotifyName(u.full_name || '');
      }
    }).catch(() => setUser(null));
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await LocalStockItem.list();
      setAllItems(data);
      const inStockItems = data.filter(item => item.quantity_available > 0 && item.is_available);
      setItems(inStockItems);
    } catch (error) {
      console.error("Error loading local stock items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (item, goToCart = false) => {
    setAddingToCart((prev) => ({ ...prev, [item.id]: true }));

    try {
      // Fetch the latest stock info to ensure accuracy
      const latestItem = await LocalStockItem.get(item.id);
      
      // Check if item is still available
      if (!latestItem || latestItem.quantity_available <= 0 || !latestItem.is_available) {
        alert('מצטערים, הפריט אזל מהמלאי');
        setAddingToCart((prev) => ({ ...prev, [item.id]: false }));
        await loadItems(); // Refresh the list
        return;
      }

      await CartItem.create({
        site: 'local',
        product_type: 'local',
        product_url: item.id, // Store LocalStockItem ID here
        product_name: item.product_name,
        product_sku: item.id, // Store LocalStockItem ID here too
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

  const filteredItems = allItems.filter((item) => {
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
            <p className="text-sm text-stone-500 font-light">אספקה מהירה עד הבית</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {user && user.role === 'admin' &&
        <div className="mb-6 flex justify-end gap-3">
            <Button
            onClick={() => window.location.href = createPageUrl('ManageLocalStock')}
            className="bg-stone-800 hover:bg-stone-900 text-white flex items-center gap-2">
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}>
                  <Card
                    className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 bg-white cursor-pointer group border-0 shadow-none"
                    onClick={() => window.location.href = createPageUrl('LocalStockItemDetail') + '?id=' + item.id}>
                      <CardContent className="p-0 relative">
                        {item.image_url &&
                    <div className="w-full bg-stone-50 overflow-hidden relative flex items-center justify-center" style={{ minHeight: '280px' }}>
                            <img
                        src={item.image_url}
                        alt={item.product_name}
                        className={`w-full h-auto object-contain transition-transform duration-300 ${(item.quantity_available > 0 && item.is_available) ? 'group-hover:scale-105' : ''}`}
                        style={{ maxHeight: '320px' }} />
                            {(item.quantity_available === 0 || !item.is_available) ? null : (
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
                            )}
                          </div>
                    }
                        <div className="px-1 py-1">
                          <h3 className="font-medium text-xs text-stone-800 truncate">
                            {item.product_name}
                          </h3>
                          <div className="flex items-center gap-1 flex-wrap">
                            {(item.quantity_available === 0 || !item.is_available) ? (
                              <>
                                <span className="text-[10px] text-stone-600 font-medium">Sold Out</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotifyRequest(item);
                                  }}
                                  className="flex items-center gap-1 text-[10px] text-rose-600 hover:text-rose-700 underline"
                                >
                                  <Bell className="w-3 h-3" />
                                  NOTIFY ME WHEN AVAILABLE
                                </button>
                              </>
                            ) : (
                              <>
                                <p className="text-stone-800 text-sm font-semibold">
                                  ₪{item.price_ils}
                                </p>
                              </>
                            )}
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
                placeholder="השם שלך"
              />
            </div>
            <div className="space-y-2">
              <Label>אימייל *</Label>
              <Input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                placeholder="example@email.com"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleSubmitNotification}
              disabled={!notifyEmail || submittingNotification}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {submittingNotification ? 'שומר...' : 'עדכן אותי'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);
}