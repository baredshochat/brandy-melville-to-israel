import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { X, Save, Edit, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const paymentStatusConfig = {
  pending: { label: "ממתין לתשלום", style: "bg-yellow-100 text-yellow-800" },
  completed: { label: "שולם", style: "bg-green-100 text-green-800" },
  failed: { label: "נכשל", style: "bg-red-100 text-red-800" }
};

export default function OrderDetailsModal({ order, onClose, onUpdateOrder, statusConfig }) {
  const [editableData, setEditableData] = useState({
    internal_notes: order.internal_notes || '',
    payment_status: order.payment_status || 'pending',
    status: order.status || 'pending'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Reset state if order changes
    setEditableData({
      internal_notes: order.internal_notes || '',
      payment_status: order.payment_status || 'pending',
      status: order.status || 'pending'
    });
    setIsEditing(false);
  }, [order]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateOrder(order.id, editableData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save changes", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const siteInfo = {
    us: { name: 'ארה״ב', flag: '🇺🇸' },
    eu: { name: 'אירופה', flag: '🇪🇺' },
    uk: { name: 'בריטניה', flag: '🇬🇧' }
  };

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl rounded-none">
        <DialogHeader>
          <DialogTitle>פרטי הזמנה #{order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto">
          {/* Left Column - Order & Customer Details */}
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">פרטי לקוח</h3>
              <div className="text-sm space-y-1">
                <p><strong>שם:</strong> {order.customer_name}</p>
                <p><strong>אימייל:</strong> {order.customer_email}</p>
                <p><strong>טלפון:</strong> {order.customer_phone}</p>
                <p><strong>כתובת:</strong> {order.shipping_address}, {order.city}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">פרטי הזמנה</h3>
              <div className="text-sm space-y-1">
                <p><strong>תאריך:</strong> {format(new Date(order.created_date), 'dd/MM/yyyy')}</p>
                <p><strong>אתר:</strong> {siteInfo[order.site]?.flag} {siteInfo[order.site]?.name}</p>
                <p><strong>סה״כ:</strong> ₪{order.total_price_ils?.toLocaleString()}</p>
              </div>
            </div>

             {/* Editable Fields */}
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label>סטטוס הזמנה</Label>
                {isEditing ? (
                  <Select value={editableData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                   <Badge variant="outline" className={`${statusConfig[order.status]?.style} border-0 font-medium rounded-none text-base mt-1`}>
                      {statusConfig[order.status]?.label || order.status}
                  </Badge>
                )}
              </div>
              
              <div>
                <Label>סטטוס תשלום</Label>
                 {isEditing ? (
                  <Select value={editableData.payment_status} onValueChange={(value) => handleChange('payment_status', value)}>
                    <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentStatusConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`${paymentStatusConfig[order.payment_status]?.style} border-0 font-medium rounded-none text-base mt-1`}>
                      {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                  </Badge>
                )}
              </div>

              <div>
                <Label htmlFor="internal_notes">הערות פנימיות (למנהל)</Label>
                {isEditing ? (
                  <Textarea
                    id="internal_notes"
                    value={editableData.internal_notes}
                    onChange={(e) => handleChange('internal_notes', e.target.value)}
                    placeholder="הערות שרלוונטיות רק לך..."
                    className="mt-1 rounded-none"
                  />
                ) : (
                  <p className="text-sm mt-1 p-2 bg-stone-50 border h-20">{order.internal_notes || "אין הערות."}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Items List */}
          <div>
            <h3 className="font-semibold mb-2">פריטים ({order.items?.length || 0})</h3>
            <div className="space-y-3">
              {order.items?.map((item, index) => (
                <div key={index} className="p-2 border bg-stone-50/50 text-sm">
                  <p className="font-medium">{item.product_name}</p>
                  <p><strong>כמות:</strong> {item.quantity}</p>
                  <p><strong>מידה:</strong> {item.size}</p>
                  <p><strong>צבע:</strong> {item.color}</p>
                  <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                    צפייה במוצר המקורי
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={onClose} className="rounded-none">
                <X className="w-4 h-4 ml-2" />
                סגור
            </Button>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none">
                <Edit className="w-4 h-4 ml-2" />
                ערוך הזמנה
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white rounded-none">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />}
                שמור שינויים
              </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}