import React, { useState, useEffect } from 'react';
import { Coupon } from '@/entities/Coupon';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Loader2, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import GeneralCouponForm from './GeneralCouponForm';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ManageGeneralCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await Coupon.list('-created_date');
      setCoupons(data || []);
    } catch (error) {
      console.error('Error loading coupons:', error);
      toast.error('שגיאה בטעינת הקופונים הכלליים');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCoupon = async (formData) => {
    try {
      if (editingCoupon) {
        await Coupon.update(editingCoupon.id, formData);
        toast.success('הקופון עודכן בהצלחה');
      } else {
        await Coupon.create(formData);
        toast.success('הקופון נוצר בהצלחה');
      }
      setShowForm(false);
      setEditingCoupon(null);
      loadCoupons();
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast.error('שגיאה בשמירת הקופון');
    }
  };

  const handleDeleteCoupon = async () => {
    if (!couponToDelete) return;
    try {
      await Coupon.delete(couponToDelete.id);
      toast.success('הקופון נמחק בהצלחה');
      setDeleteDialogOpen(false);
      setCouponToDelete(null);
      loadCoupons();
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('שגיאה במחיקת הקופון');
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      await Coupon.update(coupon.id, { is_active: !coupon.is_active });
      toast.success(coupon.is_active ? 'הקופון הושבת' : 'הקופון הופעל');
      loadCoupons();
    } catch (error) {
      console.error('Error toggling coupon status:', error);
      toast.error('שגיאה בעדכון סטטוס הקופון');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('הקוד הועתק ללוח');
  };

  const getDiscountDisplay = (coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}%`;
    } else if (coupon.discount_type === 'fixed') {
      return `₪${coupon.discount_value}`;
    }
    return 'לא הוגדר';
  };

  const getSiteDisplay = (site) => {
    const sites = {
      all: 'כל האתרים',
      us: 'ארה״ב',
      eu: 'אירופה',
      uk: 'בריטניה',
      local: 'מקומי'
    };
    return sites[site] || site;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingCoupon(null); setShowForm(true); }} className="bg-rose-500 hover:bg-rose-600">
          <Plus className="w-4 h-4 ml-2" />
          צור קופון כללי חדש
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-stone-500 mb-4">אין עדיין קופונים כלליים</p>
          <Button onClick={() => setShowForm(true)} variant="outline">
            צור קופון כללי ראשון
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-stone-900 font-mono">{coupon.code}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(coupon.code)}
                      className="h-6 px-2"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <span className={`px-2 py-1 text-xs rounded ${coupon.is_active ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'}`}>
                      {coupon.is_active ? 'פעיל' : 'מושבת'}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                      קופון כללי
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-stone-600">
                    <div>
                      <span className="font-medium">הנחה:</span> {getDiscountDisplay(coupon)}
                    </div>
                    <div>
                      <span className="font-medium">תוקף:</span> {coupon.valid_until ? format(new Date(coupon.valid_until), 'dd/MM/yyyy') : 'ללא תאריך'}
                    </div>
                    <div>
                      <span className="font-medium">שימושים:</span> {coupon.times_used || 0} / {coupon.usage_limit || '∞'}
                    </div>
                    <div>
                      <span className="font-medium">אתר:</span> {getSiteDisplay(coupon.applies_to_site)}
                    </div>
                  </div>
                  {coupon.description && (
                    <p className="text-xs text-stone-500 mt-2">{coupon.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(coupon)}
                    title={coupon.is_active ? 'השבת קופון' : 'הפעל קופון'}
                  >
                    {coupon.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditingCoupon(coupon); setShowForm(true); }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setCouponToDelete(coupon); setDeleteDialogOpen(true); }}
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
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'עריכת קופון כללי' : 'יצירת קופון כללי חדש'}</DialogTitle>
          </DialogHeader>
          <GeneralCouponForm
            coupon={editingCoupon}
            onSave={handleSaveCoupon}
            onCancel={() => { setShowForm(false); setEditingCoupon(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת קופון כללי</AlertDialogTitle>
            <AlertDialogDescription>
              האם את בטוחה שברצונך למחוק את הקופון "{couponToDelete?.code}"? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCoupon} className="bg-red-500 hover:bg-red-600">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}