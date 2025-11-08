import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, Edit } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import OrderDetailsModal from "./OrderDetailsModal";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  pending: { label: "ממתין", style: "bg-stone-200 text-stone-800" },
  ordered: { label: "הוזמן", style: "bg-stone-200 text-stone-800" },
  warehouse: { label: "במחסן", style: "bg-stone-200 text-stone-800" },
  shipping_to_israel: { label: "בדרך לישראל", style: "bg-stone-200 text-stone-800" },
  in_israel: { label: "בארץ", style: "bg-stone-200 text-stone-800" },
  shipping_to_customer: { label: "בדרך ללקוחה", style: "bg-stone-200 text-stone-800" },
  delivered: { label: "נמסר", style: "bg-green-100 text-green-800" }
};
const siteInfo = {
  us: { name: 'ארה״ב', flag: '🇺🇸' },
  eu: { name: 'אירופה', flag: '🇪🇺' },
  uk: { name: 'בריטניה', flag: '🇬🇧' }
};

export default function OrdersTable({ orders, loading, onUpdateOrder }) {
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-none" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-12 text-center">
        <Package className="w-12 h-12 mx-auto text-stone-400 mb-4" />
        <p className="text-stone-500">לא נמצאו הזמנות לפי הסינון הנבחר.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-stone-50 hover:bg-stone-50 border-b border-stone-200">
              <TableHead className="w-[120px]">מספר הזמנה</TableHead>
              <TableHead>לקוח</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>סה״כ</TableHead>
              <TableHead>רווח + מכס</TableHead>
              <TableHead>אתר</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const profit = order.price_breakdown?.net_profit_ils || 0;
              const customs = order.price_breakdown?.customsILS || 0;
              const profitAndCustoms = profit + customs;

              return (
                <TableRow key={order.id} className="hover:bg-stone-50/50 border-b border-stone-200/80">
                  <TableCell className="font-mono text-xs text-stone-800">{order.order_number}</TableCell>
                  <TableCell>
                    <div className="font-medium text-stone-900">{order.customer_name}</div>
                    <div className="text-xs text-stone-500">{order.customer_email}</div>
                  </TableCell>
                  <TableCell className="text-sm text-stone-600">
                    {format(new Date(order.created_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="font-medium text-stone-800">
                    ₪{order.total_price_ils?.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium text-blue-600">
                    ₪{profitAndCustoms > 0 ? profitAndCustoms.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{siteInfo[order.site]?.flag}</span>
                      <span className="text-sm">{siteInfo[order.site]?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                      <Badge variant="outline" className={`${statusConfig[order.status]?.style} border-0 font-medium rounded-none`}>
                          {statusConfig[order.status]?.label || order.status}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)} className="flex items-center gap-2 border-stone-300 rounded-none">
                          <Edit className="w-4 h-4"/>
                          פרטים ועריכה
                      </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)}
          onUpdateOrder={onUpdateOrder}
          statusConfig={statusConfig}
        />
      )}
    </>
  );
}