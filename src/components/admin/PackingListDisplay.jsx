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

        <div className="space-y-6 pt-4" id="packing-list-content">
          {orders.map((order, orderIdx) => (
            <Card key={order.id} className="p-4 border-2 border-stone-300">
              {/* Order Header */}
              <div className="flex justify-between items-start mb-4 pb-3 border-b-2 border-stone-200">
                <div>
                  <div className="text-xl font-bold text-stone-900">
                    #{orderIdx + 1} • הזמנה {order.order_number}
                  </div>
                  <div className="text-sm text-stone-600 mt-1">
                    {order.site === 'us' && '🇺🇸 ארה"ב'}
                    {order.site === 'eu' && '🇪🇺 אירופה'}
                    {order.site === 'uk' && '🇬🇧 בריטניה'}
                    {order.site === 'local' && '🇮🇱 מלאי מקומי'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-stone-900">{order.customer_name}</div>
                  <div className="text-sm text-stone-600">{order.customer_phone || '—'}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-4">
                <div className="font-semibold text-stone-900 mb-2">פריטים:</div>
                <table className="w-full border border-stone-300" dir="rtl">
                  <thead className="bg-stone-100">
                    <tr>
                      <th className="border border-stone-300 p-2 text-right text-sm font-semibold">#</th>
                      <th className="border border-stone-300 p-2 text-right text-sm font-semibold">שם מוצר</th>
                      <th className="border border-stone-300 p-2 text-right text-sm font-semibold">צבע</th>
                      <th className="border border-stone-300 p-2 text-right text-sm font-semibold">מידה</th>
                      <th className="border border-stone-300 p-2 text-right text-sm font-semibold">כמות</th>
                      <th className="border border-stone-300 p-2 text-right text-sm font-semibold">SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(order.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="border border-stone-300 p-2 text-center font-medium">{idx + 1}</td>
                        <td className="border border-stone-300 p-2">{item.product_name}</td>
                        <td className="border border-stone-300 p-2">
                          {item.color || '—'}
                        </td>
                        <td className="border border-stone-300 p-2 text-center">{item.size || '—'}</td>
                        <td className="border border-stone-300 p-2 text-center font-semibold">
                          {item.quantity || 1}
                        </td>
                        <td className="border border-stone-300 p-2 text-xs font-mono">{item.product_sku || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Address */}
              <div className="bg-amber-50 p-3 border-2 border-amber-300 rounded">
                <div className="font-semibold text-stone-900 mb-1">כתובת משלוח:</div>
                <div className="text-stone-800">
                  {order.shipping_address}
                  {order.city && `, ${order.city}`}
                </div>
                {order.notes && (
                  <div className="mt-2 pt-2 border-t border-amber-200">
                    <div className="text-sm text-stone-600">
                      <strong>הערות לקוחה:</strong> {order.notes}
                    </div>
                  </div>
                )}
              </div>
            </Card>
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