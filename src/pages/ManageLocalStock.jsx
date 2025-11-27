import React, { useState, useEffect } from "react";
import { LocalStockItem } from "@/entities/LocalStockItem";
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
import { Package, Plus, Edit, Trash2, Loader2, Link as LinkIcon, Image as ImageIcon, AlertTriangle, Eye } from "lucide-react";
import { motion } from "framer-motion";

const categoryNames = {
  tops: "חולצות וטופים",
  bottoms: "מכנסיים וחצאיות",
  dresses: "שמלות",
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
  category: 'other',
  internal_sku: '',
  source_url: '',
  weight_kg: 0.3,
  additional_images: [] // Added for additional images
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
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await UploadFile({ file });
      setFormData({ ...formData, image_url: result.file_url });
    } catch (error) {
      alert("שגיאה בהעלאת תמונה");
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Clear the input field
    }
  };

  const handleAdditionalImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await UploadFile({ file });
      const currentImages = formData.additional_images || [];
      setFormData({
        ...formData,
        additional_images: [...currentImages, result.file_url]
      });
    } catch (error) {
      alert("שגיאה בהעלאת תמונה נוספת");
    } finally {
      setUploadingImage(false);
      e.target.value = ''; // Clear the input field
    }
  };

  const handleRemoveAdditionalImage = (index) => {
    const currentImages = formData.additional_images || [];
    setFormData({
      ...formData,
      additional_images: currentImages.filter((_, i) => i !== index)
    });
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

        אם משהו לא נמצא, החזר null עבור השדה הזה.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            product_name: { type: ["string", "null"] },
            product_description: { type: ["string", "null"] },
            color: { type: ["string", "null"] },
            size: { type: ["string", "null"] },
            image_url: { type: ["string", "null"] }
          }
        }
      });

      if (result) {
        setFormData(prev => ({
          ...prev,
          product_name: result.product_name || prev.product_name,
          product_description: result.product_description || prev.product_description,
          color: result.color || prev.color,
          size: result.size || prev.size,
          image_url: result.image_url || prev.image_url
        }));
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
    setFormData({ ...item, additional_images: item.additional_images || [] });
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
    setDialogOpen(true);
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-stone-900 mb-2">ניהול מלאי מקומי</h1>
          <p className="text-lg text-stone-600">הוספה ועריכה של פריטים זמינים במלאי</p>
        </div>
        <div className="flex gap-3">
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

                {/* Main Image Upload */}
                <div className="space-y-2">
                  <Label>תמונה ראשית</Label>
                  {formData.image_url && (
                    <div className="mb-2">
                      <img src={formData.image_url} alt="Preview" className="w-32 h-32 object-cover rounded" />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="flex-1"
                    />
                    {uploadingImage && <Loader2 className="w-6 h-6 animate-spin" />}
                  </div>
                </div>

                {/* Additional Images Upload */}
                <div className="space-y-2">
                  <Label>תמונות נוספות (עד 4)</Label>
                  {formData.additional_images && formData.additional_images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {formData.additional_images.map((img, index) => (
                        <div key={index} className="relative">
                          <img src={img} alt={`Additional ${index + 1}`} className="w-full h-24 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => handleRemoveAdditionalImage(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!formData.additional_images || formData.additional_images.length < 4) && (
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAdditionalImageUpload}
                      disabled={uploadingImage}
                    />
                  )}
                  {formData.additional_images && formData.additional_images.length >= 4 && (
                    <p className="text-sm text-stone-500">הגעת למקסימום 4 תמונות נוספות</p>
                  )}
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
                      onChange={(e) => setFormData({ ...formData, price_ils: parseFloat(e.target.value) || 0 })}
                    />
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
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
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

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>פריטים במלאי ({items.length})</CardTitle>
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-2">תמונה</th>
                    <th className="text-right p-2">תמונות</th>
                    <th className="text-right p-2">שם</th>
                    <th className="text-right p-2">מחיר</th>
                    <th className="text-right p-2">כמות</th>
                    <th className="text-right p-2">צבע/מידה</th>
                    <th className="text-right p-2">זמין</th>
                    <th className="text-right p-2">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className="border-b hover:bg-stone-50">
                      <td className="p-2">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.product_name} className="w-12 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-12 h-12 bg-stone-200 rounded flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-stone-400" />
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-sm text-stone-600">
                          {1 + (item.additional_images?.length || 0)}/5
                        </span>
                      </td>
                      <td className="p-2 font-medium">{item.product_name}</td>
                      <td className="p-2">₪{item.price_ils}</td>
                      <td className="p-2">
                        <span className={item.quantity_available === 0 ? 'text-red-600' : ''}>
                          {item.quantity_available}
                        </span>
                      </td>
                      <td className="p-2 text-stone-500">
                        {[item.color, item.size].filter(Boolean).join(' / ') || '—'}
                      </td>
                      <td className="p-2">
                        {item.is_available ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-600">✗</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}