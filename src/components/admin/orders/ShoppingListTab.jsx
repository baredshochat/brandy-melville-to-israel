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

export default function ShoppingListTab({ orders, onUpdated }) {
  const [siteFilter, setSiteFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updateRef, setUpdateRef] = useState("");

  const rows = useMemo(() => {
    const dict = {};
    (orders || []).forEach((order) => {
      const site = order.site;
      (order.items || []).forEach((it, idx) => {
        const ps = it.purchase_status || "needs_order";
        // מראים רק פריטים שצריך להזמין (או שלא סומנו עדיין)
        if (ps === "needs_order") {
          const key = groupKey(it, site);
          if (!dict[key]) {
            dict[key] = {
              key,
              site,
              product_name: it.product_name,
              product_sku: it.product_sku,
              color: it.color,
              size: it.size,
              product_url: "", // Default to empty
              urls: [], // Array to store unique URLs for this group
              total_qty: 0,
              orders: []
            };
          }
          dict[key].total_qty += Number(it.quantity || 1);
          dict[key].orders.push({ order_id: order.id, item_index: idx, order_number: order.order_number, created_date: order.created_date });
          // collect urls
          if (it.product_url) {
            // Set the first product_url found as the main one for the group
            if (!dict[key].product_url) dict[key].product_url = it.product_url;
            // Collect all unique URLs for this group
            if (!dict[key].urls.includes(it.product_url)) dict[key].urls.push(it.product_url);
          }
        }
      });
    });

    let arr = Object.values(dict);
    if (siteFilter !== "all") arr = arr.filter(r => r.site === siteFilter);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(r =>
        (r.product_name || "").toLowerCase().includes(q) ||
        (r.product_sku || "").toLowerCase().includes(q) ||
        (r.color || "").toLowerCase().includes(q) ||
        (r.size || "").toLowerCase().includes(q)
      );
    }
    // סדר לפי אתר ואז שם מוצר
    return arr.sort((a,b) => (a.site||"").localeCompare(b.site||"") || (a.product_name||"").localeCompare(b.product_name||""));
  }, [orders, siteFilter, search]);

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
                  <SelectItem value="us">🇺🇸 ארה״ב</SelectItem>
                  <SelectItem value="eu">🇪🇺 אירופה</SelectItem>
                  <SelectItem value="uk">🇬🇧 בריטניה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="חיפוש לפי מוצר / SKU / צבע / מידה"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Input
              placeholder="מס׳ הזמנה אצל הספק (אופציונלי)"
              value={updateRef}
              onChange={(e) => setUpdateRef(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-stone-500">אין כרגע פריטים שדורשים הזמנה.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="text-right p-3">מוצר</th>
                    <th className="text-right p-3">SKU</th>
                    <th className="text-right p-3">צבע</th>
                    <th className="text-right p-3">מידה</th>
                    <th className="text-right p-3">קישור</th> {/* New column header */}
                    <th className="text-right p-3">אתר</th>
                    <th className="text-right p-3">כמות כוללת</th>
                    <th className="text-right p-3">תאריך הזמנה</th>
                    <th className="text-right p-3">הזמנות מקור</th>
                    <th className="text-right p-3">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-b hover:bg-stone-50">
                      <td className="p-3">{r.product_name}</td>
                      <td className="p-3">{r.product_sku || "-"}</td>
                      <td className="p-3">{r.color || "-"}</td>
                      <td className="p-3">{r.size || "-"}</td>
                      <td className="p-3">
                        {r.urls && r.urls.length > 0 && r.product_url ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={r.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              dir="ltr"
                              className="text-blue-600 hover:underline break-all max-w-[260px] truncate" // Added truncate for long URLs
                              title={r.product_url}
                            >
                              {r.product_url}
                            </a>
                            <ExternalLink className="w-4 h-4 text-stone-500 flex-shrink-0" /> {/* Added flex-shrink-0 to prevent icon from shrinking */}
                            {r.urls.length > 1 && (
                              <Badge variant="outline" className="flex-shrink-0">+{r.urls.length - 1}</Badge> // Added flex-shrink-0
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="p-3">{r.site?.toUpperCase()}</td>
                      <td className="p-3 font-semibold">{r.total_qty}</td>
                      <td className="p-3 text-sm text-stone-600">
                        {r.orders[0]?.created_date ? new Date(r.orders[0].created_date).toLocaleDateString('he-IL') : '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {r.orders.slice(0,4).map(o => (
                            <Badge key={o.order_id} variant="secondary">#{o.order_number}</Badge>
                          ))}
                          {r.orders.length > 4 && (
                            <Badge variant="outline">+{r.orders.length - 4}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => markGroupAsOrdered(r)} className="bg-stone-900 hover:bg-black">
                            סמן כהוזמן <Check className="w-4 h-4 mr-2" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteGroup(r)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
    </div>
  );
}