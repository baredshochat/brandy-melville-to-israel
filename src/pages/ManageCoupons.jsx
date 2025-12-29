import React, { useState, useEffect } from 'react';
import { CouponTemplate } from '@/entities/CouponTemplate';
import { UserCoupon } from '@/entities/UserCoupon';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Send, Loader2, ToggleLeft, ToggleRight, FileText, Tag } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CouponTemplateForm from '../components/admin/CouponTemplateForm';
import UserSelector from '../components/admin/UserSelector';
import ManageGeneralCoupons from '../components/admin/ManageGeneralCoupons';
import ManageStoreCredit from '../components/admin/ManageStoreCredit';
import ManageGiftCards from '../components/admin/ManageGiftCards';
import { toast } from 'sonner';

export default function ManageCoupons() {
  const [couponTemplates, setCouponTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('coupons');

  useEffect(() => {
    loadCouponTemplates();
  }, []);

  const loadCouponTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await CouponTemplate.list('-created_date');
      setCouponTemplates(data || []);
    } catch (error) {
      console.error('Error loading coupon templates:', error);
      toast.error('שגיאה בטעינת תבניות הקופונים');
    } finally {
      setLoadingTemplates(false);
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
      setShowTemplateForm(false);
      setEditingTemplate(null);
      loadCouponTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('שגיאה בשמירת התבנית');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await CouponTemplate.delete(templateToDelete.id);
      toast.success('התבנית נמחקה בהצלחה');
      setDeleteTemplateDialogOpen(false);
      setTemplateToDelete(null);
      loadCouponTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('שגיאה במחיקת התבנית');
    }
  };

  const handleToggleTemplateActive = async (template) => {
    try {
      await CouponTemplate.update(template.id, { is_active: !template.is_active });
      toast.success(template.is_active ? 'התבנית הושבתה' : 'התבנית הופעלה');
      loadCouponTemplates();
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

  return (
    <div className="max-w-7xl mx-auto p-6" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">ניהול קופונים והטבות</h1>
          <p className="text-stone-600 mt-1">צור ונהל קופונים אישיים וכלליים</p>
        </div>
      </div>

      <Tabs defaultValue="coupons" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="coupons">
            <Tag className="w-4 h-4 ml-2" />
            קודי קופון
          </TabsTrigger>
          <TabsTrigger value="credit">
            <FileText className="w-4 h-4 ml-2" />
            קרדיט
          </TabsTrigger>
          <TabsTrigger value="giftcard">
            <FileText className="w-4 h-4 ml-2" />
            גיפטקארד
          </TabsTrigger>
        </TabsList>

        {/* ========= קופונים ========= */}
        <TabsContent value="coupons">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                setEditingTemplate(null);
                setShowTemplateForm(true);
              }}
              className="bg-rose-500 hover:bg-rose-600"
            >
              <Plus className="w-4 h-4 ml-2" />
              קוד קופון חדש
            </Button>
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
            </div>
          ) : couponTemplates.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-stone-500 mb-4">אין עדיין קודי קופון</p>
              <Button variant="outline" onClick={() => setShowTemplateForm(true)}>
                צור קוד ראשון
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {couponTemplates.map((template) => (
                <div
                  key={template.id}
                  className="border rounded-lg p-4 bg-white flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-stone-500">
                      הנחה: {getDiscountDisplay(template)} ·
                      {template.is_active ? ' פעיל' : ' מושבת'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleTemplateActive(template)}
                    >
                      {template.is_active ? (
                        <ToggleRight className="w-4 h-4" />
                      ) : (
                        <ToggleLeft className="w-4 h-4" />
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateForm(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTemplateToDelete(template);
                        setDeleteTemplateDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ========= קרדיט ========= */}
        <TabsContent value="credit">
          <ManageStoreCredit />
        </TabsContent>

        {/* ========= גיפטקארד ========= */}
        <TabsContent value="giftcard">
          <ManageGiftCards />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'עריכת תבנית קופון' : 'יצירת תבנית קופון חדשה'}</DialogTitle>
          </DialogHeader>
          <CouponTemplateForm
            template={editingTemplate}
            onSave={handleSaveTemplate}
            onCancel={() => { setShowTemplateForm(false); setEditingTemplate(null); }}
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
      <AlertDialog open={deleteTemplateDialogOpen} onOpenChange={setDeleteTemplateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תבנית קופון</AlertDialogTitle>
            <AlertDialogDescription>
              האם את בטוחה שברצונך למחוק את התבנית "{templateToDelete?.name}"? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} className="bg-red-500 hover:bg-red-600">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}