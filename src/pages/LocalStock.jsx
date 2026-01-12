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
            <p className="text-sm text-stone-500 font-light mt-4"></p>
            <p className="text-sm text-stone-500 font-light"></p>
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

        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <Heart className="w-16 h-16 text-rose-300 mb-6 fill-rose-300" />
          <h1 className="text-3xl font-semibold text-stone-800 mb-4">עמוד המלאי יתעדכן בהקדם</h1>
          <p className="text-lg text-stone-600 mb-2">אנחנו עובדים על משהו מדהים!</p>
          <p className="text-stone-500">נחזור בקרוב עם חוויה מושלמת 💖</p>
        </div>

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