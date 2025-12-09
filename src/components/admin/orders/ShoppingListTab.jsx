import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Order } from "@/entities/Order";
import { Package, Check, Filter, ListOrdered, Truck, ExternalLink, Trash2 } from "lucide-react";

function groupKey(item, site, orderId) {
  const base = [
    item.product_sku || "",
    (item.product_name || "").toLowerCase().trim(),
    (item.color || "").toLowerCase().trim(),
    (item.size || "").toLowerCase().trim(),
    site || "",
    orderId || "" // הפרדה לפי הזמנה/לקוח
  ];
  return base.join("|");
}

const ORDER_COLORS = [
  'bg-rose-50 border-r-4 border-r-rose-300',
  'bg-blue-50 border-r-4 border-r-blue-300',
  'bg-green-50 border-r-4 border-r-green-300',
  'bg-amber-50 border-r-4 border-r-amber-300',
  'bg-purple-50 border-r-4 border-r-purple-300',
  'bg-cyan-50 border-r-4 border-r-cyan-300',
  'bg-orange-50 border-r-4 border-r-orange-300',
  'bg-indigo-50 border-r-4 border-r-indigo-300',
];

export default function ShoppingListTab({ orders, onUpdated }) {
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("needs_order");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const out = [];
    (orders || []).forEach((order) => {
      const site = order.site;
      const orderStatus = order.status;
      
      // רק הזמנות מחו"ל (בריטניה או אירופה) שסטטוס שלהן pending
      const isValidOrder = (site === 'uk' || site === 'eu') && orderStatus === 'pending';
      if (!isValidOrder) return;
      
      (order.items || []).forEach((it, idx) => {
        const ps = it.purchase_status || "needs_order";
        // מציגים פריטים בסטטוסים: needs_order, ordered, warehouse
        if (["needs_order", "ordered", "warehouse"].includes(ps)) {
          out.push({
            order_id: order.id,
            order_number: order.order_number,
            site,
            index: idx,
            product_name: it.product_name,
            product_sku: it.product_sku,
            color: it.color,
            size: it.size,
            quantity: it.quantity || 1,
            purchase_status: ps,
            last_purchase_status_date: it.last_purchase_status_date || null,
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            created_date: order.created_date,
            product_url: it.product_url
          });
        }
      });
    });

    let arr = out;
    if (siteFilter !== "all") arr = arr.filter(r => r.site === siteFilter);
    if (statusFilter !== "all") arr = arr.filter(r => r.purchase_status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(r =>
        (r.product_name || "").toLowerCase().includes(q) ||
        (r.product_sku || "").toLowerCase().includes(q) ||
        (r.color || "").toLowerCase().includes(q) ||
        (r.size || "").toLowerCase().includes(q) ||
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.order_number || "").toLowerCase().includes(q)
      );
    }
    
    return arr.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  }, [orders, siteFilter, statusFilter, search]);

  const deleteGroup = async (group) => {
    if (!confirm(`למחוק את כל הפריטים של "${group.product_name}" מרשימת הקניות?`)) return;
    
    const ordersMap = new Map();
    group.orders.forEach(({ order_id, item_index }) => {
      if (!ordersMap.has(order_id)) ordersMap.set(order_id, []);
      ordersMap.get(order_id).push(item_index);
    });

    const promises = [];
    ordersMap.forEach((indexes, orderId) => {
      const o = orders.find(x => x.id === orderId);
      if (!o) return;
      // Remove items by filtering out the indexes
      const newItems = (o.items || []).filter((it, i) => !indexes.includes(i));
      promises.push(Order.update(orderId, { items: newItems }));
    });

    await Promise.all(promises);
    if (onUpdated) onUpdated();
  };

  const markGroupAsOrdered = async (group) => {
    // מיד מסתיר את הפריט מהתצוגה
    setHiddenGroups(prev => new Set([...prev, group.key]));
    
    // מעדכן את כל הפריטים התואמים בכל ההזמנות ל-ordered + שומר רפרנס ספק אם הוזן
    const ordersMap = new Map();
    group.orders.forEach(({ order_id, item_index }) => {
      if (!ordersMap.has(order_id)) ordersMap.set(order_id, []);
      ordersMap.get(order_id).push(item_index);
    });

    const promises = [];
    ordersMap.forEach((indexes, orderId) => {
      const o = orders.find(x => x.id === orderId);
      if (!o) return;
      const newItems = (o.items || []).map((it, i) => {
        if (indexes.includes(i)) {
          return {
            ...it,
            purchase_status: "ordered",
            supplier_order_ref: updateRef || it.supplier_order_ref || ""
          };
        }
        return it;
      });
      promises.push(Order.update(orderId, { items: newItems }));
    });

    await Promise.all(promises);
    if (onUpdated) onUpdated();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <ListOrdered className="w-5 h-5" />
            רשימת קניות - מה צריך להזמין מהספק
          </CardTitle>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-stone-500" />
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="אתר" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל האתרים</SelectItem>
                  <SelectItem value="eu">🇪🇺 אירופה</SelectItem>
                  <SelectItem value="uk">🇬🇧 בריטניה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="חיפוש לפי מוצר / SKU / לקוחה"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-stone-500">אין פריטים ברשימת הקניות בסטטוס זה.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="text-right p-3">מוצר</th>
                    <th className="text-right p-3">SKU</th>
                    <th className="text-right p-3">צבע</th>
                    <th className="text-right p-3">מידה</th>
                    <th className="text-right p-3">כמות</th>
                    <th className="text-right p-3">אתר</th>
                    <th className="text-right p-3">לקוחה</th>
                    <th className="text-right p-3">מס׳ הזמנה</th>
                    <th className="text-right p-3">סטטוס</th>
                    <th className="text-right p-3">תאריך סטטוס</th>
                    <th className="text-right p-3">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isOrdered = r.purchase_status === 'ordered';
                    const isWarehouse = r.purchase_status === 'warehouse';
                    const rowBgClass = isWarehouse ? 'bg-stone-200' : isOrdered ? 'bg-stone-100' : 'bg-white';
                    
                    return (
                      <tr key={`${r.order_id}-${r.index}`} className={`border-b hover:bg-stone-50 ${rowBgClass}`}>
                        <td className="p-3">
                          {r.product_url ? (
                            <a
                              href={r.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              {r.product_name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            r.product_name
                          )}
                        </td>
                        <td className="p-3 font-mono text-sm">{r.product_sku || "-"}</td>
                        <td className="p-3">{r.color || "-"}</td>
                        <td className="p-3">{r.size || "-"}</td>
                        <td className="p-3 font-semibold">{r.quantity}</td>
                        <td className="p-3">{r.site?.toUpperCase()}</td>
                        <td className="p-3">
                          <div className="font-medium text-sm">{r.customer_name || '—'}</div>
                          <div className="text-xs text-stone-500">{r.customer_email || ''}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">#{r.order_number}</Badge>
                        </td>
                        <td className="p-3">
                          <Select
                            value={r.purchase_status}
                            onValueChange={(val) => updateRow(r, { purchase_status: val })}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3 text-xs text-stone-600">
                          {r.last_purchase_status_date 
                            ? new Date(r.last_purchase_status_date).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })
                            : '—'
                          }
                        </td>
                        <td className="p-3">
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => deleteItem(r)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}