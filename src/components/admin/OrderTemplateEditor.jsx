import React, { useState, useEffect } from "react";
import { OrderTemplate } from "@/entities/OrderTemplate";
import { getOrdersForDocuments } from "../services/OrdersService";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Loader2, Save, FileText, Eye, Download, Search, Package } from "lucide-react";

/* ---------------------------------------------------- */
/* קומפוננטה */
/* ---------------------------------------------------- */

export default function OrderTemplateEditor() {
  const [template, setTemplate] = useState(null);
  const [enabledBlocks, setEnabledBlocks] = useState({});
  const [orders, setOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");

  /* ---------- init ---------- */
  useEffect(() => {
    loadTemplate();
    loadOrders();
  }, []);

  /* ---------- load template ---------- */
  async function loadTemplate() {
    setLoading(true);
    try {
      const templates = await OrderTemplate.list();
      if (templates?.length) {
        setTemplate(templates[0]);
        const parsed = JSON.parse(templates[0].content || "{}");
        setEnabledBlocks(parsed.enabledBlocks || {});
      }
    } finally {
      setLoading(false);
    }
  }

  /* ---------- load orders (רק הזמנות שהתקבלו!) ---------- */
  async function loadOrders() {
    try {
      const data = await getOrdersForDocuments();
      setOrders(data || []);
    } catch (err) {
      console.error("Failed loading orders", err);
    }
  }

  /* ---------- helpers ---------- */
  function filteredOrders() {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(o =>
      o.order_number?.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q) ||
      o.customer_email?.toLowerCase().includes(q)
    );
  }

  function toggleSelectAll() {
    const visible = filteredOrders();
    if (selectedOrderIds.size === visible.length) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(visible.map(o => o.id)));
    }
  }

  /* ---------- download ---------- */
  async function handleDownloadPdfs() {
    if (!selectedOrderIds.size) return;
    setDownloadingPdf(true);

    try {
      const { base44 } = await import("@/api/base44Client");
      await base44.functions.invoke("generateOrderPdf", {
        order_ids: Array.from(selectedOrderIds)
      });
      setSelectedOrderIds(new Set());
    } finally {
      setDownloadingPdf(false);
    }
  }

  /* ---------- UI ---------- */
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="editor">עריכת מסמך</TabsTrigger>
        <TabsTrigger value="preview">תצוגה מקדימה</TabsTrigger>
        <TabsTrigger value="generate">הפקת מסמכים</TabsTrigger>
      </TabsList>

      {/* ---------- GENERATE ---------- */}
      <TabsContent value="generate">
        <Card>
          <CardHeader>
            <CardTitle>הזמנות שהתקבלו</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              placeholder="חיפוש הזמנה..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />

            <Button
              disabled={!selectedOrderIds.size || downloadingPdf}
              onClick={handleDownloadPdfs}
              className="bg-green-600 text-white"
            >
              {downloadingPdf ? "מפיק..." : `הפק ${selectedOrderIds.size} מסמכים`}
            </Button>

            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>
                    <Checkbox
                      checked={
                        filteredOrders().length > 0 &&
                        selectedOrderIds.size === filteredOrders().length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th>מס׳ הזמנה</th>
                  <th>לקוחה</th>
                  <th>סכום</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders().map(order => (
                  <tr key={order.id}>
                    <td>
                      <Checkbox
                        checked={selectedOrderIds.has(order.id)}
                        onCheckedChange={checked => {
                          const next = new Set(selectedOrderIds);
                          checked ? next.add(order.id) : next.delete(order.id);
                          setSelectedOrderIds(next);
                        }}
                      />
                    </td>
                    <td>{order.order_number}</td>
                    <td>{order.customer_name}</td>
                    <td>₪{order.total_price_ils}</td>
                  </tr>
                ))}

                {!filteredOrders().length && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-400">
                      <Package className="mx-auto mb-2" />
                      אין הזמנות שהתקבלו
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
