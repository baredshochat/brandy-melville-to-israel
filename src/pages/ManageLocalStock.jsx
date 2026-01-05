import React, { useState, useEffect } from "react";
import { LocalStockItem } from "@/entities/LocalStockItem";
import { BackInStockNotification } from "@/entities/BackInStockNotification";
import { User } from "@/entities/User";
import { UploadFile, InvokeLLM } from "@/integrations/Core";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Plus, Edit, Trash2, Loader2, Link as LinkIcon, Image as ImageIcon, AlertTriangle, Eye, Copy, Bell, MoreHorizontal, History, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import StockHistoryDialog from '../components/admin/StockHistoryDialog';
import BulkActionsToolbar from '../components/admin/BulkActionsToolbar';
import BulkUpdateDialog from '../components/admin/BulkUpdateDialog';
import ExportDialog from '../components/admin/ExportDialog';
import WaitingListDialog from '../components/admin/WaitingListDialog';
import BackInStockNotificationsTab from '../components/admin/BackInStockNotificationsTab';
import { AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, FileDown } from 'lucide-react';

const categoryNames = {
  tops: "חולצות וטופים",
  bottoms: "מכנסיים וחצאיות",
  dresses: "שמלות",
  sweaters: "סוודרים וסווטשירטים",
  accessories: "אביזרים",
  other: "אחר"
};

const emptyItem = {
  product_name: '',
  product_description: '',
  image_url: '',
  price_ils: 0,
  color: '',
  size: '',
  quantity_available: 0,
  is_available: true,
  is_hidden: false,
  available_from: '',
  free_shipping: false,
  category: 'other',
  internal_sku: '',
  source_url: '',
  weight_kg: 0.3,
  additional_images: []
};

export default function ManageLocalStock() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ ...emptyItem });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [extractingFromUrl, setExtractingFromUrl] = useState(false);
  const [suggestedPriceInfo, setSuggestedPriceInfo] = useState(null);
  const [waitingCounts, setWaitingCounts] = useState({});
  const [editingQuantity, setEditingQuantity] = useState(null);
  const [editingUrl, setEditingUrl] = useState(null);
  const [editingColor, setEditingColor] = useState(null);
  const [extractingColor, setExtractingColor] = useState(null);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);
  const [historyDialog, setHistoryDialog] = useState({ open: false, itemId: null, itemName: '' });
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkUpdateDialogOpen, setBulkUpdateDialogOpen] = useState(false);
  const [currentBulkUpdateType, setCurrentBulkUpdateType] = useState(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [waitingListDialog, setWaitingListDialog] = useState({ open: false, itemId: null, itemName: '' });

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUserRole(user.role);
        loadItems();
      } catch (error) {
        window.location.href = createPageUrl('Home');
      }
    };
    checkAccess();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await LocalStockItem.list('-created_date');
      setItems(data);
      
      // Load waiting counts for each item
      const notifications = await BackInStockNotification.filter({ notified: false });
      const counts = {};
      notifications.forEach(notif => {
        counts[notif.local_stock_item_id] = (counts[notif.local_stock_item_id] || 0) + 1;
      });
      setWaitingCounts(counts);
      
      setReorderSuggestions([]);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const newImageUrls = results.map(result => result.file_url);
      
      // If no main image yet, first uploaded becomes main
      if (!formData.image_url) {
        setFormData({
          ...formData,
          image_url: newImageUrls[0],
          additional_images: [...(formData.additional_images || []), ...newImageUrls.slice(1)]
        });
      } else {
        // Otherwise add all to additional
        setFormData({
          ...formData,
          additional_images: [...(formData.additional_images || []), ...newImageUrls]
        });
      }
    } catch (error) {
      alert("שגיאה בהעלאת תמונות");
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index) => {
    // index 0 = main image, index 1+ = additional images
    if (index === 0) {
      // Remove main image, promote first additional to main
      const additionalImages = formData.additional_images || [];
      setFormData({
        ...formData,
        image_url: additionalImages[0] || '',
        additional_images: additionalImages.slice(1)
      });
    } else {
      // Remove from additional images
      const additionalImages = formData.additional_images || [];
      setFormData({
        ...formData,
        additional_images: additionalImages.filter((_, i) => i !== index - 1)
      });
    }
  };

  const handleExtractFromUrl = async () => {
    if (!formData.source_url) {
      alert("אנא הזיני קישור למוצר");
      return;
    }

    setExtractingFromUrl(true);
    try {
      const result = await InvokeLLM({
        prompt: `חלץ מידע על מוצר מהקישור הבא: ${formData.source_url}

        החזר JSON עם השדות הבאים:
        - product_name: שם המוצר
        - product_description: תיאור קצר
        - color: צבע (אם יש)
        - size: מידה (אם יש)
        - image_url: קישור לתמונה הראשית
        - original_price: המחיר המקורי במטבע המקורי (מספר בלבד)
        - currency: המטבע (USD, EUR, GBP)

        אם משהו לא נמצא, החזר null עבור השדה הזה.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            product_name: { type: ["string", "null"] },
            product_description: { type: ["string", "null"] },
            color: { type: ["string", "null"] },
            size: { type: ["string", "null"] },
            image_url: { type: ["string", "null"] },
            original_price: { type: ["number", "null"] },
            currency: { type: ["string", "null"] }
          }
        }
      });

      if (result) {
        // Calculate suggested price
        let suggestedPrice = null;
        if (result.original_price && result.currency) {
          const fxRates = { USD: 3.8, EUR: 4.0, GBP: 4.5 };
          const rate = fxRates[result.currency] || 4.0;
          const priceILS = result.original_price * rate;
          
          // Strategic pricing: 40-55% margin, round to attractive number
          let margin = 0.45;
          if (priceILS < 80) margin = 0.55;
          else if (priceILS < 150) margin = 0.45;
          else margin = 0.35;
          
          const rawPrice = priceILS * (1 + margin);
          // Round to nearest 5 or 9 for attractive pricing
          suggestedPrice = Math.round(rawPrice / 5) * 5 - 1; // e.g., 149, 199, 249
          if (suggestedPrice < 50) suggestedPrice = Math.ceil(rawPrice / 10) * 10 - 1;
        }

        setFormData(prev => ({
          ...prev,
          product_name: result.product_name || prev.product_name,
          product_description: result.product_description || prev.product_description,
          color: result.color || prev.color,
          size: result.size || prev.size,
          image_url: result.image_url || prev.image_url,
          price_ils: suggestedPrice || prev.price_ils
        }));
        
        if (suggestedPrice) {
          setSuggestedPriceInfo({
            originalPrice: result.original_price,
            currency: result.currency,
            suggested: suggestedPrice
          });
        } else if (result.original_price) {
          // If we got a price but couldn't calculate (missing currency)
          setSuggestedPriceInfo({
            originalPrice: result.original_price,
            currency: result.currency || '?',
            suggested: null
          });
        }
      }
    } catch (error) {
      console.error("Error extracting from URL:", error);
      alert("שגיאה בחילוץ מידע מהקישור");
    } finally {
      setExtractingFromUrl(false);
    }
  };

  const handleSave = async () => {
    if (!formData.product_name || !formData.price_ils) {
      alert("אנא מלאי לפחות שם ומחיר");
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await LocalStockItem.update(editingItem.id, formData);
      } else {
        await LocalStockItem.create(formData);
      }
      loadItems();
      setDialogOpen(false);
      setEditingItem(null);
      setFormData({ ...emptyItem });
    } catch (error) {
      alert("שגיאה בשמירת הפריט");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    // Ensure additional_images is always an array when editing
    setFormData({ ...item, additional_images: item.additional_images || [], free_shipping: item.free_shipping || false });
    setSuggestedPriceInfo(null);
    setDialogOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (!confirm("את בטוחה שאת רוצה למחוק את הפריט?")) return;

    try {
      await LocalStockItem.delete(itemId);
      loadItems();
    } catch (error) {
      alert("שגיאה במחיקת הפריט");
    }
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setFormData({ ...emptyItem });
    setSuggestedPriceInfo(null);
    setDialogOpen(true);
  };

  const handleDuplicate = (item) => {
    setEditingItem(null);
    setFormData({
      ...item,
      id: undefined,
      product_name: `${item.product_name} (העתק)`,
      additional_images: item.additional_images || []
    });
    setSuggestedPriceInfo(null);
    setDialogOpen(true);
  };

  const toggleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filteredItems = items.filter(item => !searchQuery || item.product_name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (selectedItems.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`למחוק ${selectedItems.size} פריטים?`)) return;
    
    try {
      await Promise.all(Array.from(selectedItems).map(id => LocalStockItem.delete(id)));
      setSelectedItems(new Set());
      loadItems();
    } catch (error) {
      alert('שגיאה במחיקת פריטים');
    }
  };

  const openBulkUpdateDialog = (type) => {
    setCurrentBulkUpdateType(type);
    setBulkUpdateDialogOpen(true);
  };

  const handleBulkUpdateOperation = async (operation, value) => {
    setIsBulkUpdating(true);

    try {
      if (currentBulkUpdateType === 'price') {
        const itemsToUpdate = items.filter(item => selectedItems.has(item.id));
        const updates = itemsToUpdate.map(item => {
          let newPrice = item.price_ils;
          if (operation === 'set') newPrice = value;
          if (operation === 'increase_by') newPrice += value;
          if (operation === 'decrease_by') newPrice -= value;
          if (operation === 'multiply_by') newPrice *= value;
          return LocalStockItem.update(item.id, { price_ils: Math.max(0, newPrice) });
        });
        await Promise.all(updates);
      } else if (currentBulkUpdateType === 'quantity') {
        const itemsToUpdate = items.filter(item => selectedItems.has(item.id));
        const { StockTransaction } = await import('@/entities/StockTransaction');
        
        const updates = itemsToUpdate.map(async item => {
          let newQuantity = item.quantity_available;
          if (operation === 'set') newQuantity = value;
          if (operation === 'increase_by') newQuantity += value;
          if (operation === 'decrease_by') newQuantity -= value;
          newQuantity = Math.max(0, Math.round(newQuantity));
          
          const quantityChange = newQuantity - item.quantity_available;
          
          await StockTransaction.create({
            local_stock_item_id: item.id,
            product_name: item.product_name,
            transaction_type: quantityChange > 0 ? 'inbound' : quantityChange < 0 ? 'outbound' : 'adjustment',
            quantity_change: quantityChange,
            quantity_before: item.quantity_available,
            quantity_after: newQuantity,
            notes: 'עדכון כמות בבת אחת מממשק הניהול',
            performed_by: userRole || 'admin'
          });
          
          return LocalStockItem.update(item.id, { quantity_available: newQuantity });
        });
        await Promise.all(updates);
      }

      setSelectedItems(new Set());
      loadItems();
      setBulkUpdateDialogOpen(false);
    } catch (error) {
      alert('שגיאה בעדכון פריטים');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await Promise.all(Array.from(selectedItems).map(id => LocalStockItem.update(id, updates)));
      setSelectedItems(new Set());
      loadItems();
    } catch (error) {
      alert('שגיאה בעדכון פריטים');
    }
  };

  const handleQuickQuantityUpdate = async (itemId, newQuantity) => {
    if (newQuantity < 0) return;
    
    try {
      // Get current item to log the transaction
      const currentItem = items.find(i => i.id === itemId);
      if (currentItem) {
        const quantityChange = newQuantity - currentItem.quantity_available;
        
        // Import StockTransaction entity
        const { StockTransaction } = await import('@/entities/StockTransaction');
        
        // Log the transaction
        await StockTransaction.create({
          local_stock_item_id: itemId,
          product_name: currentItem.product_name,
          transaction_type: quantityChange > 0 ? 'inbound' : quantityChange < 0 ? 'outbound' : 'adjustment',
          quantity_change: quantityChange,
          quantity_before: currentItem.quantity_available,
          quantity_after: newQuantity,
          notes: 'עדכון ידני מממשק הניהול',
          performed_by: userRole || 'admin'
        });
      }
      
      await LocalStockItem.update(itemId, { quantity_available: newQuantity });
      loadItems();
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert("שגיאה בעדכון הכמות");
    }
  };

  const handleQuickUrlUpdate = async (itemId, newUrl) => {
    try {
      await LocalStockItem.update(itemId, { source_url: newUrl });
      loadItems();
      setEditingUrl(null);
    } catch (error) {
      console.error("Error updating URL:", error);
      alert("שגיאה בעדכון הלינק");
    }
  };

  const handleQuickColorUpdate = async (itemId, colorName, colorHex) => {
    try {
      await LocalStockItem.update(itemId, { color: colorName, color_hex: colorHex });
      loadItems();
      setEditingColor(null);
    } catch (error) {
      console.error("Error updating color:", error);
      alert("שגיאה בעדכון הצבע");
    }
  };

  const handleExtractColorFromImage = async (itemId) => {
    const item = items.find(i => i.id === itemId);
    if (!item?.image_url) {
      alert("אין תמונה לפריט זה");
      return;
    }

    setExtractingColor(itemId);
    try {
      const result = await InvokeLLM({
        prompt: `נתח את התמונה הזו של בגד/אביזר ומצא את הצבע העיקרי שלו.
        
        החזר JSON עם:
        - color_name: שם הצבע בעברית (לדוגמה: "שחור", "לבן", "ורוד", "כחול", "אדום", "ירוק", "אפור", "בז'", "חום", "סגול")
        - color_hex: קוד צבע HEX (לדוגמה: "#000000", "#FFFFFF", "#FFC0CB")
        
        תן את הצבע הדומיננטי ביותר בבגד.`,
        file_urls: [item.image_url],
        response_json_schema: {
          type: "object",
          properties: {
            color_name: { type: "string" },
            color_hex: { type: "string" }
          }
        }
      });

      if (result?.color_name && result?.color_hex) {
        await handleQuickColorUpdate(itemId, result.color_name, result.color_hex);
      }
    } catch (error) {
      console.error("Error extracting color:", error);
      alert("שגיאה בזיהוי הצבע");
    } finally {
      setExtractingColor(null);
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-stone-900 mb-2">ניהול מלאי מקומי</h1>
        <p className="text-lg text-stone-600">הוספה ועריכה של פריטים זמינים במלאי</p>
      </div>

      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="stock">ניהול מלאי</TabsTrigger>
          <TabsTrigger value="notifications">התראות חזרה למלאי</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3">
            <Button 
              onClick={() => setExportDialogOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              ייצוא לאקסל
            </Button>
            <Button 
              onClick={() => window.location.href = createPageUrl('LocalStock')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              צפייה בעמוד המלאי
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNewItem} className="bg-black hover:bg-stone-800">
                <Plus className="w-4 h-4 ml-2" />
                פריט חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'עריכת פריט' : 'פריט חדש'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Extract from URL */}
                <div className="space-y-2 p-4 bg-stone-50 rounded-lg">
                  <Label>חילוץ מידע מקישור (אופציונלי)</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="הדבק קישור למוצר באתר ברנדי מלוויל..."
                      value={formData.source_url}
                      onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                    />
                    <Button
                      onClick={handleExtractFromUrl}
                      disabled={extractingFromUrl || !formData.source_url}
                      variant="outline"
                    >
                      {extractingFromUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Images Upload */}
                <div className="space-y-2">
                  <Label>תמונות מוצר</Label>
                  <p className="text-xs text-stone-500 mb-2">התמונה הראשונה תהיה התמונה הראשית</p>
                  
                  {/* Display all images */}
                  {(formData.image_url || (formData.additional_images && formData.additional_images.length > 0)) && (
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {/* Main image first */}
                      {formData.image_url && (
                        <div className="relative">
                          <img src={formData.image_url} alt="Main" className="w-full h-24 object-cover rounded" />
                          <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded">ראשית</div>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(0)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      )}
                      {/* Additional images */}
                      {(formData.additional_images || []).map((img, index) => (
                        <div key={index} className="relative">
                          <img src={img} alt={`Image ${index + 2}`} className="w-full h-24 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index + 1)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImagesUpload}
                      disabled={uploadingImage}
                      className="flex-1"
                    />
                    {uploadingImage && <Loader2 className="w-6 h-6 animate-spin" />}
                  </div>
                  <p className="text-xs text-stone-500">ניתן לבחור מספר תמונות בו זמנית</p>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>שם המוצר *</Label>
                    <Input
                      value={formData.product_name}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <Label>תיאור</Label>
                    <Textarea
                      value={formData.product_description}
                      onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>מחיר (₪) *</Label>
                    <Input
                      type="number"
                      value={formData.price_ils}
                      onChange={(e) => {
                        setFormData({ ...formData, price_ils: parseFloat(e.target.value) || 0 });
                        setSuggestedPriceInfo(null);
                      }}
                    />
                    {suggestedPriceInfo && suggestedPriceInfo.suggested && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-700 font-medium">
                          💡 מחיר מומלץ: ₪{suggestedPriceInfo.suggested}
                        </p>
                        <p className="text-xs text-green-600">
                          מקור: {suggestedPriceInfo.originalPrice} {suggestedPriceInfo.currency} • כולל מרווח אסטרטגי
                        </p>
                      </div>
                    )}
                    {suggestedPriceInfo && !suggestedPriceInfo.suggested && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ לא הצלחנו לחשב מחיר מומלץ (מקור: {suggestedPriceInfo.originalPrice} {suggestedPriceInfo.currency})
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>כמות במלאי *</Label>
                    <Input
                      type="number"
                      value={formData.quantity_available}
                      onChange={(e) => setFormData({ ...formData, quantity_available: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label>צבע</Label>
                    <div className="flex gap-2">
                      <Select 
                        value={formData.color || ''} 
                        onValueChange={(val) => {
                          const colorMap = {
                            'שחור': '#000000',
                            'לבן': '#FFFFFF',
                            'אדום': '#DC2626',
                            'כחול': '#2563EB',
                            'ירוק': '#16A34A',
                            'צהוב': '#EAB308',
                            'ורוד': '#EC4899',
                            'סגול': '#9333EA',
                            'אפור': '#6B7280',
                            'חום': '#92400E',
                            'בז׳': '#D4A574',
                            'תכלת': '#0EA5E9',
                            'כתום': '#F97316',
                            'בורדו': '#7C2D12'
                          };
                          setFormData({ ...formData, color: val, color_hex: colorMap[val] || '#CCCCCC' });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר צבע">
                            {formData.color && (
                              <div className="flex items-center gap-2">
                                {formData.color_hex && (
                                  <div 
                                    className="w-4 h-4 border border-stone-300" 
                                    style={{ backgroundColor: formData.color_hex }}
                                  />
                                )}
                                <span>{formData.color}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>ללא צבע</SelectItem>
                          <SelectItem value="שחור">⬛ שחור</SelectItem>
                          <SelectItem value="לבן">⬜ לבן</SelectItem>
                          <SelectItem value="אדום">🟥 אדום</SelectItem>
                          <SelectItem value="כחול">🟦 כחול</SelectItem>
                          <SelectItem value="ירוק">🟩 ירוק</SelectItem>
                          <SelectItem value="צהוב">🟨 צהוב</SelectItem>
                          <SelectItem value="ורוד">🩷 ורוד</SelectItem>
                          <SelectItem value="סגול">🟪 סגול</SelectItem>
                          <SelectItem value="אפור">⬜ אפור</SelectItem>
                          <SelectItem value="חום">🟫 חום</SelectItem>
                          <SelectItem value="בז׳">🟨 בז׳</SelectItem>
                          <SelectItem value="תכלת">🔷 תכלת</SelectItem>
                          <SelectItem value="כתום">🟧 כתום</SelectItem>
                          <SelectItem value="בורדו">🟥 בורדו</SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.image_url && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            setExtractingFromUrl(true);
                            try {
                              const result = await InvokeLLM({
                                prompt: `נתח את התמונה הזו של בגד/אביזר ומצא את הצבע העיקרי שלו.
                                
                                החזר JSON עם:
                                - color_name: שם הצבע בעברית (לדוגמה: "שחור", "לבן", "ורוד", "כחול", "אדום", "ירוק", "אפור", "בז'", "חום", "סגול")
                                - color_hex: קוד צבע HEX (לדוגמה: "#000000", "#FFFFFF", "#FFC0CB")
                                
                                תן את הצבע הדומיננטי ביותר בבגד.`,
                                file_urls: [formData.image_url],
                                response_json_schema: {
                                  type: "object",
                                  properties: {
                                    color_name: { type: "string" },
                                    color_hex: { type: "string" }
                                  }
                                }
                              });

                              if (result?.color_name && result?.color_hex) {
                                setFormData({ ...formData, color: result.color_name, color_hex: result.color_hex });
                              }
                            } catch (error) {
                              alert("שגיאה בזיהוי הצבע");
                            } finally {
                              setExtractingFromUrl(false);
                            }
                          }}
                          disabled={extractingFromUrl}
                        >
                          {extractingFromUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>מידה</Label>
                    <Input
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>קטגוריה</Label>
                    <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryNames).map(([key, name]) => (
                          <SelectItem key={key} value={key}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>משקל (ק״ג)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || 0.3 })}
                    />
                  </div>

                  <div>
                    <Label>מק״ט פנימי</Label>
                    <Input
                      value={formData.internal_sku}
                      onChange={(e) => setFormData({ ...formData, internal_sku: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      checked={formData.is_available}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                    />
                    <Label>זמין למכירה</Label>
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      checked={formData.free_shipping}
                      onCheckedChange={(checked) => setFormData({ ...formData, free_shipping: checked })}
                    />
                    <Label>ללא עלות משלוח (מוצר ניסיון)</Label>
                  </div>
                </div>

                {/* Scheduled Availability */}
                <div className="space-y-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-stone-900">תזמון זמינות</h3>
                  <div>
                    <Label>זמין מתאריך (אופציונלי)</Label>
                    <Input
                      type="datetime-local"
                      value={formData.available_from || ''}
                      onChange={(e) => setFormData({ ...formData, available_from: e.target.value })}
                    />
                    <p className="text-xs text-stone-500 mt-1">אם מוגדר, הפריט יופיע ללקוחות רק מתאריך זה</p>
                  </div>
                </div>


              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  ביטול
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                  שמור
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>



      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-3 w-5 h-5 text-stone-400" />
          <Input
            placeholder="חיפוש לפי שם מוצר..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>פריטים במלאי ({items.filter(item => !searchQuery || item.product_name.toLowerCase().includes(searchQuery.toLowerCase())).length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-stone-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-stone-300" />
              <p>עדיין לא הוספת פריטים למלאי</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 w-12">
                      <div className="flex justify-start">
                        <Checkbox
                          checked={selectedItems.size === items.filter(item => !searchQuery || item.product_name.toLowerCase().includes(searchQuery.toLowerCase())).length && items.filter(item => !searchQuery || item.product_name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </div>
                    </th>
                    <th className="text-right p-2">תמונה</th>
                    <th className="text-right p-2">שם</th>
                    <th className="text-right p-2">לינק</th>
                    <th className="text-right p-2">מחיר</th>
                    <th className="text-right p-2">כמות</th>
                    <th className="text-right p-2">ממתינים</th>
                    <th className="text-right p-2">צבע</th>
                    <th className="text-right p-2">מידה</th>
                    <th className="text-right p-2">סטטוס</th>
                    <th className="text-right p-2">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(item => !searchQuery || item.product_name.toLowerCase().includes(searchQuery.toLowerCase())).map(item => (
                    <tr key={item.id} className="border-b hover:bg-stone-50">
                      <td className="p-2">
                        <div className="flex justify-start">
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.product_name} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-stone-200 rounded flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-stone-400" />
                            </div>
                          )}
                          {item.image_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={async () => {
                                const newShowImage = !item.show_image;
                                await LocalStockItem.update(item.id, { show_image: newShowImage });
                                loadItems();
                              }}
                            >
                              {item.show_image ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="p-2 font-medium text-right">{item.product_name}</td>
                      <td className="p-2 text-right">
                        {editingUrl === item.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="url"
                              defaultValue={item.source_url || ''}
                              onBlur={(e) => {
                                handleQuickUrlUpdate(item.id, e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleQuickUrlUpdate(item.id, e.target.value);
                                } else if (e.key === 'Escape') {
                                  setEditingUrl(null);
                                }
                              }}
                              className="h-8 text-sm w-32"
                              placeholder="https://..."
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingUrl(item.id)}
                            className="hover:underline text-right flex items-center gap-1"
                          >
                            {item.source_url ? (
                              <>
                                <LinkIcon className="w-3 h-3 text-blue-600" />
                                <span className="text-blue-600 text-xs">יש</span>
                              </>
                            ) : (
                              <span className="text-stone-400 text-xs">+ הוסף</span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-2 text-right">₪{item.price_ils}</td>
                      <td className="p-2 text-right">
                        {editingQuantity === item.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              defaultValue={item.quantity_available}
                              onBlur={(e) => {
                                handleQuickQuantityUpdate(item.id, parseInt(e.target.value) || 0);
                                setEditingQuantity(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleQuickQuantityUpdate(item.id, parseInt(e.target.value) || 0);
                                  setEditingQuantity(null);
                                }
                              }}
                              className="w-16 h-8 text-sm"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingQuantity(item.id)}
                            className={`hover:underline ${item.quantity_available === 0 ? 'text-red-600 font-bold' : ''}`}
                          >
                            {item.quantity_available}
                          </button>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {waitingCounts[item.id] > 0 && (
                          <button
                            onClick={() => setWaitingListDialog({ open: true, itemId: item.id, itemName: item.product_name })}
                            className="flex items-center gap-1 text-amber-600 hover:text-amber-700 hover:underline"
                          >
                            <Bell className="w-3 h-3" />
                            {waitingCounts[item.id]}
                          </button>
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {editingColor === item.id ? (
                          <div className="flex items-center gap-1">
                            <select
                              defaultValue={item.color || ''}
                              onChange={(e) => {
                                const colorName = e.target.value;
                                const colorMap = {
                                  'שחור': '#000000',
                                  'לבן': '#FFFFFF',
                                  'אדום': '#DC2626',
                                  'כחול': '#2563EB',
                                  'ירוק': '#16A34A',
                                  'צהוב': '#EAB308',
                                  'ורוד': '#EC4899',
                                  'סגול': '#9333EA',
                                  'אפור': '#6B7280',
                                  'חום': '#92400E',
                                  'בז׳': '#D4A574',
                                  'תכלת': '#0EA5E9',
                                  'כתום': '#F97316',
                                  'בורדו': '#7C2D12'
                                };
                                handleQuickColorUpdate(item.id, colorName, colorMap[colorName] || '#CCCCCC');
                                setEditingColor(null);
                              }}
                              onBlur={() => setEditingColor(null)}
                              className="h-8 text-sm px-2 border rounded"
                              autoFocus
                            >
                              <option value="">ללא צבע</option>
                              <option value="שחור">שחור</option>
                              <option value="לבן">לבן</option>
                              <option value="אדום">אדום</option>
                              <option value="כחול">כחול</option>
                              <option value="ירוק">ירוק</option>
                              <option value="צהוב">צהוב</option>
                              <option value="ורוד">ורוד</option>
                              <option value="סגול">סגול</option>
                              <option value="אפור">אפור</option>
                              <option value="חום">חום</option>
                              <option value="בז׳">בז׳</option>
                              <option value="תכלת">תכלת</option>
                              <option value="כתום">כתום</option>
                              <option value="בורדו">בורדו</option>
                            </select>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingColor(item.id)}
                            className="hover:underline flex items-center gap-2"
                          >
                            {item.color ? (
                              <>
                                {item.color_hex && (
                                  <div 
                                    className="w-4 h-4 border border-stone-300 flex-shrink-0" 
                                    style={{ backgroundColor: item.color_hex }}
                                  />
                                )}
                                <span className="text-xs">{item.color}</span>
                              </>
                            ) : (
                              <span className="text-stone-400 text-xs">+ צבע</span>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-2 text-right text-stone-500">
                        {item.size || '—'}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex flex-col gap-1 items-end">
                          {item.is_available ? (
                            <span className="text-green-600 text-xs">✓ זמין</span>
                          ) : (
                            <span className="text-red-600 text-xs">✗ לא זמין</span>
                          )}
                          {item.is_hidden && (
                            <Badge variant="outline" className="text-xs bg-stone-100 flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="w-4 h-4 ml-2" />
                              עריכה
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setHistoryDialog({ open: true, itemId: item.id, itemName: item.product_name })}>
                              <History className="w-4 h-4 ml-2" />
                              היסטוריית מלאי
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => LocalStockItem.update(item.id, { is_hidden: !item.is_hidden }).then(() => loadItems())}>
                              <Eye className="w-4 h-4 ml-2" />
                              {item.is_hidden ? 'הצג ללקוחות' : 'הסתר מלקוחות'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(item)}>
                              <Copy className="w-4 h-4 ml-2" />
                              שכפול
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleExtractColorFromImage(item.id)}
                              disabled={!item.image_url || extractingColor === item.id}
                            >
                              {extractingColor === item.id ? (
                                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                              ) : (
                                <ImageIcon className="w-4 h-4 ml-2" />
                              )}
                              זהה צבע מתמונה
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={async () => {
                                const count = waitingCounts[item.id] || 0;
                                if (!confirm(`לשלוח התראות ל-${count} לקוחות?`)) return;
                                try {
                                  const { base44 } = await import('@/api/base44Client');
                                  const response = await base44.functions.invoke('sendBackInStockNotifications', { item_id: item.id });
                                  console.log('Response from sendBackInStockNotifications:', response);

                                  // Handle different response formats
                                  const result = response?.data || response;
                                  const sentCount = result?.sent || 0;
                                  const totalCount = result?.total || count;
                                  const errors = result?.errors || [];

                                  if (errors.length > 0) {
                                    alert(`נשלחו ${sentCount} מתוך ${totalCount} התראות.\n\nשגיאות:\n${errors.map(e => `${e.email}: ${e.error}`).join('\n')}`);
                                  } else {
                                    alert(`נשלחו ${sentCount} התראות בהצלחה! ✅`);
                                  }
                                  loadItems();
                                } catch (error) {
                                  console.error('Send notifications error:', error);
                                  alert(`שגיאה בשליחת ההתראות: ${error.message || 'שגיאה לא ידועה'}`);
                                }
                              }}
                              disabled={!waitingCounts[item.id] || waitingCounts[item.id] === 0}
                            >
                              <Bell className="w-4 h-4 ml-2" />
                              שלח התראות מלאי ({waitingCounts[item.id] || 0})
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600 focus:text-red-600">
                              <Trash2 className="w-4 h-4 ml-2" />
                              מחיקה
                            </DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      <AnimatePresence>
        {selectedItems.size > 0 && (
          <BulkActionsToolbar
            selectedCount={selectedItems.size}
            onDelete={handleBulkDelete}
            onHide={() => handleBulkUpdate({ is_hidden: true })}
            onUnhide={() => handleBulkUpdate({ is_hidden: false })}
            onMakeAvailable={() => handleBulkUpdate({ is_available: true })}
            onMakeUnavailable={() => handleBulkUpdate({ is_available: false })}
            onPriceUpdate={() => openBulkUpdateDialog('price')}
            onQuantityUpdate={() => openBulkUpdateDialog('quantity')}
            onClear={() => setSelectedItems(new Set())}
          />
        )}
      </AnimatePresence>

      {/* Stock History Dialog */}
      <StockHistoryDialog
        itemId={historyDialog.itemId}
        itemName={historyDialog.itemName}
        open={historyDialog.open}
        onOpenChange={(open) => setHistoryDialog({ ...historyDialog, open })}
      />

      {/* Bulk Update Dialog */}
      <BulkUpdateDialog
        isOpen={bulkUpdateDialogOpen}
        onClose={() => setBulkUpdateDialogOpen(false)}
        onUpdate={handleBulkUpdateOperation}
        updateType={currentBulkUpdateType}
        selectedCount={selectedItems.size}
        isUpdating={isBulkUpdating}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      {/* Waiting List Dialog */}
      <WaitingListDialog
        open={waitingListDialog.open}
        onOpenChange={(open) => setWaitingListDialog({ ...waitingListDialog, open })}
        itemId={waitingListDialog.itemId}
        itemName={waitingListDialog.itemName}
        />
        </TabsContent>

        <TabsContent value="notifications">
        <BackInStockNotificationsTab />
        </TabsContent>
        </Tabs>
        </motion.div>
        );
        }