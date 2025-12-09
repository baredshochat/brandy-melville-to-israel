import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/entities/Order";
import { Truck, PackageSearch, ArrowRightLeft, CheckCircle2, Trash2, Edit } from "lucide-react";

const statusOptions = [
  { value: "ordered", label: "הוזמן" },
  { value: "in_transit", label: "בדרך למחסן/לישראל" },
  { value: "warehouse", label: "הגיע למחסן" },
  { value: "shipped_to_customer", label: "נשלח ללקוחה" },
  { value: "delivered", label: "נמסר ללקוחה" }
];

export default function SupplierTrackingTab({ orders, onUpdated }) {
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("ordered");
  const [search, setSearch] = useState("");
  const [editingRow, setEditingRow] = useState(null);

  const rows = useMemo(() => {
    const out = [];
    (orders || []).forEach((order) => {
      const site = order.site;
      (order.items || []).forEach((it, idx) => {
        const ps = it.purchase_status || "needs_order";
        if (["ordered", "in_transit", "warehouse", "shipped_to_customer"].includes(ps)) {
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
            supplier_order_ref: it.supplier_order_ref || "",
            tracking_number: it.tracking_number || "",
            carrier: it.carrier || "",
            eta_date: it.eta_date || ""
          });
        }
      });
    });

    let arr = out;
    if (siteFilter !== "all") arr = arr.filter(r => r.site === siteFilter);
    if (statusFilter) arr = arr.filter(r => r.purchase_status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(r =>
        (r.product_name || "").toLowerCase().includes(q) ||
        (r.product_sku || "").toLowerCase().includes(q) ||
        (r.tracking_number || "").toLowerCase().includes(q) ||
        (r.order_number || "").toLowerCase().includes(q)
      );
    }
    return arr.sort((a,b) => (a.site||"").localeCompare(b.site||"") || (a.order_number||"").localeCompare(b.order_number||""));
  }, [orders, siteFilter, statusFilter, search]);

  const updateRow = async (row, changes) => {
    const order = orders.find(o => o.id === row.order_id);
    if (!order) return;
    const newItems = (order.items || []).map((it, i) => {
      if (i === row.index) {
        return { ...it, ...changes };
      }
      return it;
    });
    await Order.update(order.id, { items: newItems });
    if (onUpdated) onUpdated();
  };

  const deleteItem = async (row) => {
    if (!confirm(`האם למחוק את הפריט ${row.product_name} מההזמנה #${row.order_number}?`)) return;
    const order = orders.find(o => o.id === row.order_id);
    if (!order) return;
    const newItems = (order.items || []).filter((it, i) => i !== row.index);
    await Order.update(order.id, { items: newItems });
    if (onUpdated) onUpdated();
  };

  const startEditing = (row) => {
    setEditingRow({
      key: `${row.order_id}-${row.index}`,
      ...row
    });
  };

  const saveEdit = async () => {
    if (!editingRow) return;
    const { key, order_id, index, ...changes } = editingRow;
    const order = orders.find(o => o.id === order_id);
    if (!order) return;
    const newItems = (order.items || []).map((it, i) => {
      if (i === index) {
        return { ...it, ...changes };
      }
      return it;
    });
    await Order.update(order_id, { items: newItems });
    setEditingRow(null);
    if (onUpdated) onUpdated();
  };

  const cancelEdit = () => setEditingRow(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            מעקב ספקים/משלוחים
          </CardTitle>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="סטטוס ספק" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="חיפוש מוצר / SKU / מס׳ מעקב / מס׳ הזמנה"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-stone-500">אין פריטים לתצוגה בסטטוס זה.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b">
                  <tr>
                    <th className="text-right p-3">הזמנת לקוחה</th>
                    <th className="text-right p-3">מוצר</th>
                    <th className="text-right p-3">SKU</th>
                    <th className="text-right p-3">צבע</th>
                    <th className="text-right p-3">מידה</th>
                    <th className="text-right p-3">כמות</th>
                    <th className="text-right p-3">אתר</th>
                    <th className="text-right p-3">סטטוס ספק</th>
                    <th className="text-right p-3">מס׳ הזמנת ספק</th>
                    <th className="text-right p-3">חברת שילוח</th>
                    <th className="text-right p-3">מס׳ מעקב</th>
                    <th className="text-right p-3">ETA</th>
                    <th className="text-right p-3">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const rowKey = `${r.order_id}-${r.index}`;
                    const isEditing = editingRow?.key === rowKey;
                    
                    return (
                      <tr key={rowKey} className="border-b hover:bg-stone-50">
                        <td className="p-3">#{r.order_number}</td>
                        <td className="p-3">
                          {isEditing ? (
                            <Input
                              value={editingRow.product_name}
                              onChange={(e) => setEditingRow({...editingRow, product_name: e.target.value})}
                              className="w-full"
                            />
                          ) : r.product_name}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <Input
                              value={editingRow.product_sku}
                              onChange={(e) => setEditingRow({...editingRow, product_sku: e.target.value})}
                              className="w-full"
                            />
                          ) : (r.product_sku || "-")}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <Input
                              value={editingRow.color}
                              onChange={(e) => setEditingRow({...editingRow, color: e.target.value})}
                              className="w-full"
                            />
                          ) : (r.color || "-")}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <Input
                              value={editingRow.size}
                              onChange={(e) => setEditingRow({...editingRow, size: e.target.value})}
                              className="w-full"
                            />
                          ) : (r.size || "-")}
                        </td>
                        <td className="p-3">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editingRow.quantity}
                              onChange={(e) => setEditingRow({...editingRow, quantity: parseInt(e.target.value) || 1})}
                              className="w-20"
                            />
                          ) : r.quantity}
                        </td>
                        <td className="p-3">{r.site?.toUpperCase()}</td>
                        <td className="p-3">
                          <Select
                            value={isEditing ? editingRow.purchase_status : r.purchase_status}
                            onValueChange={(val) => {
                              if (isEditing) {
                                setEditingRow({...editingRow, purchase_status: val});
                              } else {
                                updateRow(r, { purchase_status: val });
                              }
                            }}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Input
                            value={isEditing ? editingRow.supplier_order_ref : r.supplier_order_ref}
                            onChange={(e) => {
                              if (isEditing) {
                                setEditingRow({...editingRow, supplier_order_ref: e.target.value});
                              } else {
                                updateRow(r, { supplier_order_ref: e.target.value });
                              }
                            }}
                            placeholder="לדוג׳ BM-12345"
                            className="w-40"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={isEditing ? editingRow.carrier : r.carrier}
                            onChange={(e) => {
                              if (isEditing) {
                                setEditingRow({...editingRow, carrier: e.target.value});
                              } else {
                                updateRow(r, { carrier: e.target.value });
                              }
                            }}
                            placeholder="DHL / UPS"
                            className="w-36"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            value={isEditing ? editingRow.tracking_number : r.tracking_number}
                            onChange={(e) => {
                              if (isEditing) {
                                setEditingRow({...editingRow, tracking_number: e.target.value});
                              } else {
                                updateRow(r, { tracking_number: e.target.value });
                              }
                            }}
                            placeholder="מס׳ מעקב"
                            className="w-40"
                          />
                        </td>
                        <td className="p-3">
                          <Input
                            type="date"
                            value={isEditing ? editingRow.eta_date : (r.eta_date || "")}
                            onChange={(e) => {
                              if (isEditing) {
                                setEditingRow({...editingRow, eta_date: e.target.value});
                              } else {
                                updateRow(r, { eta_date: e.target.value });
                              }
                            }}
                            className="w-40"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <Button variant="default" size="sm" onClick={saveEdit}>
                                  שמור
                                </Button>
                                <Button variant="outline" size="sm" onClick={cancelEdit}>
                                  ביטול
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" onClick={() => startEditing(r)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteItem(r)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
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