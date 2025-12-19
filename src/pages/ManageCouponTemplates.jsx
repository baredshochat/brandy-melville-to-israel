import React, { useState, useEffect } from 'react';
import { CouponTemplate } from '@/entities/CouponTemplate';
import { UserCoupon } from '@/entities/UserCoupon';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Send, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CouponTemplateForm from '../components/admin/CouponTemplateForm';
import UserSelector from '../components/admin/UserSelector';
import { toast } from 'sonner';

export default function ManageCouponTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await CouponTemplate.list('-created_date');
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('שגיאה בטעינת תבניות הקופונים');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (formData) => {
    try {
      if (editingTemplate) {
        await CouponTemplate.update(editingTemplate.id, formData);
        toast.success('התבנית עודכנה בהצלחה');
      } else {
        await CouponTemplate.create(formData);
        toast.success('התבנית נוצרה בהצלחה');
      }
      setShowForm(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('שגיאה בשמירת התבנית');
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    try {
      await CouponTemplate.delete(templateToDelete.id);
      toast.success('התבנית נמחקה בהצלחה');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('שגיאה במחיקת התבנית');
    }
  };

  const handleToggleActive = async (template) => {
    try {
      await CouponTemplate.update(template.id, { is_active: !template.is_active });
      toast.success(template.is_active ? 'התבנית הושבתה' : 'התבנית הופעלה');
      loadTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      toast.error('שגיאה בעדכון סטטוס התבנית');
    }
  };

  const handleSendCoupons = async () => {
    if (!selectedTemplate || selectedUserIds.length === 0) {
      toast.error('יש לבחור משתמשים');
      return;
    }

    try {
      setSending(true);
      const response = await base44.functions.invoke('generateAndSendPersonalCoupon', {
        template_id: selectedTemplate.id,
        user_ids: selectedUserIds
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowSendDialog(false);
        setSelectedTemplate(null);
        setSelectedUserIds([]);
      } else {
        toast.error(response.data.error || 'שגיאה בשליחת הקופונים');
      }
    } catch (error) {
      console.error('Error sending coupons:', error);
      toast.error('שגיאה בשליחת הקופונים');
    } finally {
      setSending(false);
    }
  };

  const getEventTypeLabel = (type) => {
    const labels = {
      signup: 'הצטרפות למועדון',
      birthday: 'יום הולדת',
      campaign: 'קמפיין',
      admin_manual: 'ידני'
    };
    return labels[type] || type;
  };

  const getDiscountDisplay = (template) => {
    if (template.discount_type === 'percentage') {
      return `${template.discount_value}%`;
    } else if (template.discount_type === 'fixed') {
      return `₪${template.discount_value}`;
    } else if (template.discount_type === 'buy_x_get_y') {
      return `קנה ${template.buy_quantity} קבל ${template.get_quantity}`;
    }
    return 'לא הוגדר';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">ניהול תבניות קופונים</h1>
          <p className="text-stone-600 mt-1">צור ונהל תבניות לקופונים אישיים</p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setShowForm(true); }} className="bg-rose-500 hover:bg-rose-600">
          <Plus className="w-4 h-4 ml-2" />
          צור תבנית חדשה
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-stone-500 mb-4">אין עדיין תבניות קופונים</p>
          <Button onClick={() => setShowForm(true)} variant="outline">
            צור תבנית ראשונה
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <div key={template.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-stone-900">{template.name}</h3>
                    <span className={`px-2 py-1 text-xs rounded ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'}`}>
                      {template.is_active ? 'פעיל' : 'מושבת'}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                      {getEventTypeLabel(template.event_type)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-stone-600">
                    <div>
                      <span className="font-medium">הנחה:</span> {getDiscountDisplay(template)}
                    </div>
                    <div>
                      <span className="font-medium">תוקף:</span> {template.valid_days ? `${template.valid_days} ימים` : template.valid_until || 'לא הוגדר'}
                    </div>
                    <div>
                      <span className="font-medium">פורמט קוד:</span> {template.code_prefix}{template.code_suffix_template}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(template)}
                    title={template.is_active ? 'השבת תבנית' : 'הפעל תבנית'}
                  >
                    {template.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedTemplate(template); setShowSendDialog(true); }}
                    disabled={!template.is_active}
                    title="שלח קופונים"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingTemplate(template); setShowForm(true); }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setTemplateToDelete(template); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'עריכת תבנית קופון' : 'יצירת תבנית קופון חדשה'}</DialogTitle>
          </DialogHeader>
          <CouponTemplateForm
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => { setShowForm(false); setEditingTemplate(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>שליחת קופונים מתבנית: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              בחרי משתמשים שיקבלו קופון אישי
            </DialogDescription>
          </DialogHeader>
          <UserSelector
            onSelectionChange={setSelectedUserIds}
            initialSelection={selectedUserIds}
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={handleSendCoupons}
              disabled={selectedUserIds.length === 0 || sending}
              className="bg-rose-500 hover:bg-rose-600"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 ml-2" />
                  שלח קופונים ({selectedUserIds.length})
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תבנית קופון</AlertDialogTitle>
            <AlertDialogDescription>
              האם את בטוחה שברצונך למחוק את התבנית "{templateToDelete?.name}"? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}