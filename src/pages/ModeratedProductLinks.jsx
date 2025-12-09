import React, { useState, useEffect } from "react";
import { ModeratedProductLink } from "@/entities/ModeratedProductLink";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Pencil, 
  Trash2, 
  Plus, 
  ExternalLink, 
  Check, 
  X,
  Link as LinkIcon 
} from "lucide-react";

export default function ModeratedProductLinksPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [currentLink, setCurrentLink] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const data = await ModeratedProductLink.list('-last_moderated_date');
      setLinks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading moderated links:", error);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentLink?.original_url || !currentLink?.moderated_price || !currentLink?.moderated_currency || !currentLink?.site) {
      alert("נא למלא את כל השדות הנדרשים");
      return;
    }

    try {
      if (currentLink.id) {
        await ModeratedProductLink.update(currentLink.id, {
          ...currentLink,
          last_moderated_date: new Date().toISOString()
        });
      } else {
        await ModeratedProductLink.create({
          ...currentLink,
          last_moderated_date: new Date().toISOString()
        });
      }
      setEditDialog(false);
      setCurrentLink(null);
      loadLinks();
    } catch (error) {
      console.error("Error saving link:", error);
      alert("שגיאה בשמירת הקישור");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("האם למחוק קישור זה?")) return;
    try {
      await ModeratedProductLink.delete(id);
      loadLinks();
    } catch (error) {
      console.error("Error deleting link:", error);
      alert("שגיאה במחיקת הקישור");
    }
  };

  const handleToggleActive = async (link) => {
    try {
      await ModeratedProductLink.update(link.id, { is_active: !link.is_active });
      loadLinks();
    } catch (error) {
      console.error("Error toggling active status:", error);
    }
  };

  const filteredLinks = links.filter(link => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (link.product_name || '').toLowerCase().includes(q) ||
      (link.product_sku || '').toLowerCase().includes(q) ||
      (link.original_url || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5" />
            ניהול קישורים עם מחירים מתוקנים
          </CardTitle>
          <Button 
            onClick={() => {
              setCurrentLink({
                original_url: '',
                product_name: '',
                product_sku: '',
                moderated_price: 0,
                moderated_currency: 'EUR',
                site: 'eu',
                admin_notes: '',
                is_active: true
              });
              setEditDialog(true);
            }}
            className="bg-rose-500 hover:bg-rose-600"
          >
            <Plus className="w-4 h-4 ml-2" />
            הוסף קישור חדש
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="חיפוש לפי שם מוצר, SKU או קישור..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-stone-500">טוען...</div>
          ) : filteredLinks.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              {searchQuery ? "לא נמצאו קישורים התואמים לחיפוש" : "אין קישורים מתוקנים במערכת"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="text-right p-3">מוצר</th>
                    <th className="text-right p-3">SKU</th>
                    <th className="text-right p-3">אתר</th>
                    <th className="text-right p-3">מחיר מתוקן</th>
                    <th className="text-right p-3">קישור</th>
                    <th className="text-right p-3">תאריך עדכון</th>
                    <th className="text-right p-3">סטטוס</th>
                    <th className="text-right p-3">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((link) => (
                    <tr key={link.id} className="border-b hover:bg-stone-50">
                      <td className="p-3">{link.product_name || '—'}</td>
                      <td className="p-3 font-mono text-sm">{link.product_sku || '—'}</td>
                      <td className="p-3">
                        <Badge variant="secondary">{link.site?.toUpperCase()}</Badge>
                      </td>
                      <td className="p-3 font-semibold">
                        {link.moderated_currency === 'USD' && '$'}
                        {link.moderated_currency === 'EUR' && '€'}
                        {link.moderated_currency === 'GBP' && '£'}
                        {link.moderated_price}
                      </td>
                      <td className="p-3">
                        <a 
                          href={link.original_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                        >
                          צפה במוצר
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="p-3 text-sm text-stone-600">
                        {link.last_moderated_date 
                          ? new Date(link.last_moderated_date).toLocaleDateString('he-IL')
                          : '—'
                        }
                      </td>
                      <td className="p-3">
                        <Button
                          size="sm"
                          variant={link.is_active ? "default" : "outline"}
                          onClick={() => handleToggleActive(link)}
                          className="text-xs"
                        >
                          {link.is_active ? <Check className="w-3 h-3 ml-1" /> : <X className="w-3 h-3 ml-1" />}
                          {link.is_active ? 'פעיל' : 'לא פעיל'}
                        </Button>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentLink(link);
                              setEditDialog(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(link.id)}
                          >
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

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {currentLink?.id ? 'עריכת קישור מתוקן' : 'הוספת קישור מתוקן'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">קישור למוצר *</label>
              <Input
                value={currentLink?.original_url || ''}
                onChange={(e) => setCurrentLink({...currentLink, original_url: e.target.value})}
                placeholder="https://..."
                className="ltr text-left"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">שם המוצר</label>
                <Input
                  value={currentLink?.product_name || ''}
                  onChange={(e) => setCurrentLink({...currentLink, product_name: e.target.value})}
                  placeholder="שם המוצר"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">SKU</label>
                <Input
                  value={currentLink?.product_sku || ''}
                  onChange={(e) => setCurrentLink({...currentLink, product_sku: e.target.value})}
                  placeholder="SKU"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">אתר *</label>
                <Select
                  value={currentLink?.site || 'eu'}
                  onValueChange={(val) => setCurrentLink({...currentLink, site: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eu">🇪🇺 אירופה</SelectItem>
                    <SelectItem value="uk">🇬🇧 בריטניה</SelectItem>
                    <SelectItem value="us">🇺🇸 ארה"ב</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">מחיר מתוקן *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentLink?.moderated_price || ''}
                  onChange={(e) => setCurrentLink({...currentLink, moderated_price: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">מטבע *</label>
                <Select
                  value={currentLink?.moderated_currency || 'EUR'}
                  onValueChange={(val) => setCurrentLink({...currentLink, moderated_currency: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">€ יורו</SelectItem>
                    <SelectItem value="GBP">£ פאונד</SelectItem>
                    <SelectItem value="USD">$ דולר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">הערות פנימיות</label>
              <Textarea
                value={currentLink?.admin_notes || ''}
                onChange={(e) => setCurrentLink({...currentLink, admin_notes: e.target.value})}
                placeholder="הערות למנהלים..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} className="bg-rose-500 hover:bg-rose-600">
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}