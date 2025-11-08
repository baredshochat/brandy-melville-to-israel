import React, { useState, useEffect } from "react";
import { Coupon } from "@/entities/Coupon";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Edit, Tag, Calendar, Percent, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { createPageUrl } from "@/utils";

export default function ManageCoupons() {
  const [user, setUser] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    valid_from: '',
    valid_until: '',
    usage_limit: '',
    minimum_order_amount: '0',
    description: '',
    applies_to_site: 'all',
    is_active: true
  });

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await User.me();
        if (userData.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUser(userData);
        await loadCoupons();
      } catch (error) {
        console.error("Error loading user:", error);
        window.location.href = createPageUrl('Home');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadCoupons = async () => {
    try {
      const couponList = await Coupon.list();
      setCoupons(couponList || []);
    } catch (error) {
      console.error("Error loading coupons:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: '',
      valid_from: '',
      valid_until: '',
      usage_limit: '',
      minimum_order_amount: '0',
      description: '',
      applies_to_site: 'all',
      is_active: true
    });
    setEditingCoupon(null);
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || '',
      discount_type: coupon.discount_type || 'percentage',
      discount_value: coupon.discount_value?.toString() || '',
      valid_from: coupon.valid_from || '',
      valid_until: coupon.valid_until || '',
      usage_limit: coupon.usage_limit?.toString() || '',
      minimum_order_amount: coupon.minimum_order_amount?.toString() || '0',
      description: coupon.description || '',
      applies_to_site: coupon.applies_to_site || 'all',
      is_active: coupon.is_active !== false
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const couponData = {
        code: formData.code.toUpperCase().trim(),
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value),
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        minimum_order_amount: parseFloat(formData.minimum_order_amount || 0),
        description: formData.description,
        applies_to_site: formData.applies_to_site,
        is_active: formData.is_active,
        times_used: editingCoupon ? editingCoupon.times_used : 0
      };

      if (editingCoupon) {
        await Coupon.update(editingCoupon.id, couponData);
      } else {
        await Coupon.create(couponData);
      }

      await loadCoupons();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error saving coupon:", error);
      alert('שגיאה בשמירת הקופון');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (couponId) => {
    if (!confirm('בטוח שרוצה למחוק את הקופון?')) return;
    
    try {
      await Coupon.delete(couponId);
      await loadCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      alert('שגיאה במחיקת הקופון');
    }
  };

  const isFormValid = () => {
    return formData.code && 
           formData.discount_value && 
           formData.valid_from && 
           formData.valid_until &&
           parseFloat(formData.discount_value) > 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  const activeCoupons = coupons.filter(c => c.is_active);
  const inactiveCoupons = coupons.filter(c => !c.is_active);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">ניהול קופונים</h1>
            <p className="text-stone-600">צור והתאם אישית קופוני הנחה ללקוחות</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-rose-500 hover:bg-rose-600 text-white">
                <Plus className="w-4 h-4 ml-2" />
                קופון חדש
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCoupon ? 'עריכת קופון' : 'קופון חדש'}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div>
                  <Label>קוד קופון *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="SUMMER2024"
                    className="font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>סוג הנחה *</Label>
                    <Select 
                      value={formData.discount_type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, discount_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">אחוז (%)</SelectItem>
                        <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>ערך ההנחה *</Label>
                    <Input
                      type="number"
                      value={formData.discount_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                      placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>תוקף מתאריך *</Label>
                    <Input
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label>תוקף עד תאריך *</Label>
                    <Input
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>מגבלת שימוש (אופציונלי)</Label>
                    <Input
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                      placeholder="ללא הגבלה"
                    />
                  </div>

                  <div>
                    <Label>סכום הזמנה מינימלי (₪)</Label>
                    <Input
                      type="number"
                      value={formData.minimum_order_amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimum_order_amount: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <Label>חל על אתר</Label>
                  <Select 
                    value={formData.applies_to_site} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, applies_to_site: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">כל האתרים</SelectItem>
                      <SelectItem value="us">ארצות הברית</SelectItem>
                      <SelectItem value="eu">אירופה</SelectItem>
                      <SelectItem value="uk">בריטניה</SelectItem>
                      <SelectItem value="local">ישראל (מלאי מקומי)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>תיאור (אופציונלי)</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="הנחת קיץ מיוחדת"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">קופון פעיל</Label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={!isFormValid() || saving}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-white"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שמור'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    ביטול
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{activeCoupons.length}</p>
                  <p className="text-sm text-stone-600">קופונים פעילים</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Tag className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{coupons.length}</p>
                  <p className="text-sm text-stone-600">סה״כ קופונים</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Percent className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">
                    {coupons.reduce((sum, c) => sum + (c.times_used || 0), 0)}
                  </p>
                  <p className="text-sm text-stone-600">סה״כ שימושים</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Coupons */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-green-600" />
              קופונים פעילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCoupons.length === 0 ? (
              <p className="text-center text-stone-500 py-8">אין קופונים פעילים כרגע</p>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {activeCoupons.map((coupon) => (
                    <motion.div
                      key={coupon.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl font-bold text-green-800 font-mono">
                              {coupon.code}
                            </span>
                            <span className="text-sm font-semibold text-green-700">
                              {coupon.discount_type === 'percentage' 
                                ? `${coupon.discount_value}%` 
                                : `₪${coupon.discount_value}`}
                            </span>
                          </div>
                          
                          {coupon.description && (
                            <p className="text-sm text-stone-600 mb-2">{coupon.description}</p>
                          )}
                          
                          <div className="flex flex-wrap gap-3 text-xs text-stone-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(coupon.valid_from), 'd/M/yy')} - {format(new Date(coupon.valid_until), 'd/M/yy')}
                            </span>
                            
                            {coupon.minimum_order_amount > 0 && (
                              <span>מינימום: ₪{coupon.minimum_order_amount}</span>
                            )}
                            
                            {coupon.usage_limit && (
                              <span>
                                שימושים: {coupon.times_used || 0}/{coupon.usage_limit}
                              </span>
                            )}
                            
                            {coupon.applies_to_site !== 'all' && (
                              <span>אתר: {coupon.applies_to_site}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(coupon)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(coupon.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inactive Coupons */}
        {inactiveCoupons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-stone-600">
                <Tag className="w-5 h-5" />
                קופונים לא פעילים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inactiveCoupons.map((coupon) => (
                  <div key={coupon.id} className="p-4 bg-stone-100 border border-stone-200 rounded-lg opacity-60">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="text-lg font-bold text-stone-700 font-mono">
                          {coupon.code}
                        </span>
                        {coupon.description && (
                          <p className="text-sm text-stone-600 mt-1">{coupon.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(coupon)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(coupon.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}