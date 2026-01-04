import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Package, X, Printer } from 'lucide-react';

export default function PackingListDisplay({ orders, open, onClose }) {
  if (!orders || orders.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              רשימת אריזה ({orders.length} הזמנות)
            </DialogTitle>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="w-4 h-4 ml-2" />
                הדפס
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 pt-2" id="packing-list-content">
          {orders.map((order, orderIdx) => (
            <div key={order.id} className="p-2 border border-stone-400 bg-white">
              {/* Order Header - Compact */}
              <div className="flex justify-between items-center mb-1 pb-1 border-b border-stone-300">
                <div className="text-sm font-bold text-stone-900">
                  #{orderIdx + 1} • {order.order_number}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-stone-900">{order.customer_name}</span>
                  {order.customer_phone && <span className="text-xs text-stone-600 mr-2">{order.customer_phone}</span>}
                </div>
              </div>

              {/* Items Table - Compact */}
              <table className="w-full border border-stone-300 mb-1 text-xs" dir="rtl">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="border border-stone-300 px-1 py-0.5 text-right font-semibold">#</th>
                    <th className="border border-stone-300 px-1 py-0.5 text-right font-semibold">שם מוצר</th>
                    <th className="border border-stone-300 px-1 py-0.5 text-right font-semibold">צבע</th>
                    <th className="border border-stone-300 px-1 py-0.5 text-right font-semibold">מידה</th>
                    <th className="border border-stone-300 px-1 py-0.5 text-center font-semibold">כמות</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx}>
                      <td className="border border-stone-300 px-1 py-0.5 text-center">{idx + 1}</td>
                      <td className="border border-stone-300 px-1 py-0.5">{item.product_name}</td>
                      <td className="border border-stone-300 px-1 py-0.5">{item.color || '—'}</td>
                      <td className="border border-stone-300 px-1 py-0.5 text-center">{item.size || '—'}</td>
                      <td className="border border-stone-300 px-1 py-0.5 text-center font-semibold">{item.quantity || 1}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Address - Compact */}
              <div className="bg-amber-50 p-1.5 border border-amber-400 text-xs">
                <span className="font-semibold">כתובת:</span> {order.shipping_address}{order.city && `, ${order.city}`}
                {order.notes && <div className="mt-0.5 text-stone-600"><strong>הערות:</strong> {order.notes}</div>}
              </div>
            </div>
          ))}
        </div>

        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #packing-list-content, #packing-list-content * {
              visibility: visible;
            }
            #packing-list-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}