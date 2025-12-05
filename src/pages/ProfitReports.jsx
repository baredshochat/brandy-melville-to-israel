import React, { useState, useEffect, useMemo } from "react";
import { Order } from "@/entities/Order";
import { User } from "@/entities/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Calendar,
  Edit2,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter
} from "lucide-react";

// שערי המרה קבועים (אפשר לשפר בהמשך לשערים דינמיים)
const EXCHANGE_RATES = {
  ILS: 1,
  USD: 3.7,
  EUR: 4.0,
  GBP: 4.6
};

const convertToILS = (amount, currency) => {
  if (!amount || !currency) return 0;
  return Number(amount) * (EXCHANGE_RATES[currency] || 1);
};

export default function ProfitReports() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingItems, setEditingItems] = useState([]);
  const [editingShipping, setEditingShipping] = useState({ cost: 0, currency: 'ILS' });
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const init = async () => {
      try {
        const u = await User.me();
        if (u?.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(u);
        await loadOrders();
      } catch (e) {
        console.error(e);
        window.location.href = '/';
      }
    };
    init();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await Order.list('-created_date', 100);
      setOrders(data || []);
    } catch (e) {
      console.error('Error loading orders:', e);
    } finally {
      setLoading(false);
    }
  };

  // סינון הזמנות לפי תאריך וסטטוס
  const filteredOrders = useMemo(() => {
    let result = [...orders];
    
    // סינון לפי תאריך
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate;
      switch (dateFilter) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case '3months':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        default:
          startDate = null;
      }
      if (startDate) {
        result = result.filter(o => new Date(o.created_date) >= startDate);
      }
    }
    
    // סינון לפי סטטוס
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    
    return result;
  }, [orders, dateFilter, statusFilter]);

  // חישוב רווח לפריט בודד
  const calculateItemProfit = (item) => {
    const soldPrice = convertToILS(item.original_price, item.original_currency) * (item.quantity || 1);
    const costPrice = convertToILS(item.actual_cost_price, item.actual_cost_currency || 'ILS') * (item.quantity || 1);
    const profit = soldPrice - costPrice;
    const hasCost = item.actual_cost_price != null && item.actual_cost_price > 0;
    return { soldPrice, costPrice, profit, hasCost };
  };

  // חישוב רווח להזמנה שלמה
  const calculateOrderProfit = (order) => {
    const totalRevenue = order.total_price_ils || 0;
    let totalCost = 0;
    let allItemsHaveCost = true;
    
    (order.items || []).forEach(item => {
      const itemCost = convertToILS(item.actual_cost_price, item.actual_cost_currency || 'ILS') * (item.quantity || 1);
      totalCost += itemCost;
      if (!item.actual_cost_price || item.actual_cost_price <= 0) {
        allItemsHaveCost = false;
      }
    });
    
    // הוספת עלות משלוח
    const shippingCost = convertToILS(order.actual_shipping_cost, order.actual_shipping_currency || 'ILS');
    totalCost += shippingCost;
    
    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    
    return { totalRevenue, totalCost, profit, profitMargin, allItemsHaveCost };
  };

  // סיכום כולל
  const totals = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let ordersWithFullCost = 0;
    let ordersWithPartialCost = 0;
    
    filteredOrders.forEach(order => {
      const { totalRevenue: rev, totalCost: cost, allItemsHaveCost } = calculateOrderProfit(order);
      totalRevenue += rev;
      totalCost += cost;
      if (allItemsHaveCost) ordersWithFullCost++;
      else if (cost > 0) ordersWithPartialCost++;
    });
    
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    return { totalRevenue, totalCost, totalProfit, avgMargin, ordersWithFullCost, ordersWithPartialCost };
  }, [filteredOrders]);

  const toggleExpand = (orderId) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const openEditDialog = (order) => {
    setEditingOrder(order);
    setEditingItems((order.items || []).map(item => ({
      ...item,
      actual_cost_price: item.actual_cost_price || '',
      actual_cost_currency: item.actual_cost_currency || 'ILS'
    })));
    setEditingShipping({
      cost: order.actual_shipping_cost || '',
      currency: order.actual_shipping_currency || 'ILS'
    });
  };

  const handleSave = async () => {
    if (!editingOrder) return;
    setSaving(true);
    try {
      await Order.update(editingOrder.id, {
        items: editingItems.map(item => ({
          ...item,
          actual_cost_price: item.actual_cost_price ? Number(item.actual_cost_price) : null
        })),
        actual_shipping_cost: editingShipping.cost ? Number(editingShipping.cost) : null,
        actual_shipping_currency: editingShipping.currency
      });
      await loadOrders();
      setEditingOrder(null);
    } catch (e) {
      console.error('Error saving:', e);
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const updateItemCost = (index, field, value) => {
    setEditingItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-stone-800">דוחות רווח נקי</h1>
        <div className="flex flex-wrap gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הזמנים</SelectItem>
              <SelectItem value="week">שבוע אחרון</SelectItem>
              <SelectItem value="month">חודש אחרון</SelectItem>
              <SelectItem value="3months">3 חודשים</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <Filter className="w-4 h-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="pending">ממתין</SelectItem>
              <SelectItem value="ordered">הוזמן</SelectItem>
              <SelectItem value="delivered">נמסר</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* כרטיסי סיכום */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">הכנסות</p>
                <p className="text-xl font-bold text-blue-800">₪{totals.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-orange-600">עלויות</p>
                <p className="text-xl font-bold text-orange-800">₪{totals.totalCost.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={totals.totalProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {totals.totalProfit >= 0 ? 
                <TrendingUp className="w-8 h-8 text-green-600" /> :
                <TrendingDown className="w-8 h-8 text-red-600" />
              }
              <div>
                <p className={`text-sm ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>רווח נקי</p>
                <p className={`text-xl font-bold ${totals.totalProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  ₪{totals.totalProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600">מרווח ממוצע</p>
                <p className="text-xl font-bold text-purple-800">{totals.avgMargin.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* הודעה על הזמנות חסרות נתונים */}
      {totals.ordersWithPartialCost > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 text-amber-800">
          <p className="text-sm">
            ⚠️ יש {filteredOrders.length - totals.ordersWithFullCost} הזמנות ללא נתוני עלות מלאים. 
            לחצי על "עריכת עלויות" להוספת הנתונים החסרים.
          </p>
        </div>
      )}

      {/* טבלת הזמנות */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">פירוט הזמנות ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b">
                <tr>
                  <th className="text-right p-3 w-10"></th>
                  <th className="text-right p-3">מס׳ הזמנה</th>
                  <th className="text-right p-3">תאריך</th>
                  <th className="text-right p-3">לקוחה</th>
                  <th className="text-right p-3">הכנסה</th>
                  <th className="text-right p-3">עלות</th>
                  <th className="text-right p-3">רווח</th>
                  <th className="text-right p-3">מרווח</th>
                  <th className="text-right p-3">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => {
                  const { totalRevenue, totalCost, profit, profitMargin, allItemsHaveCost } = calculateOrderProfit(order);
                  const isExpanded = expandedOrders.has(order.id);
                  
                  return (
                    <React.Fragment key={order.id}>
                      <tr className={`border-b hover:bg-stone-50 ${!allItemsHaveCost ? 'bg-amber-50/50' : ''}`}>
                        <td className="p-3">
                          <button onClick={() => toggleExpand(order.id)} className="p-1 hover:bg-stone-200 rounded">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">#{order.order_number}</Badge>
                        </td>
                        <td className="p-3 text-sm">
                          {new Date(order.created_date).toLocaleDateString('he-IL')}
                        </td>
                        <td className="p-3">
                          <div className="text-sm font-medium">{order.customer_name}</div>
                        </td>
                        <td className="p-3 font-medium text-blue-700">
                          ₪{totalRevenue.toLocaleString()}
                        </td>
                        <td className="p-3 font-medium text-orange-700">
                          {totalCost > 0 ? `₪${totalCost.toLocaleString()}` : '-'}
                        </td>
                        <td className={`p-3 font-bold ${profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {totalCost > 0 ? `₪${profit.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3">
                          {totalCost > 0 ? (
                            <Badge className={profitMargin >= 20 ? 'bg-green-100 text-green-800' : profitMargin >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                              {profitMargin.toFixed(1)}%
                            </Badge>
                          ) : '-'}
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(order)}>
                            <Edit2 className="w-4 h-4 ml-1" />
                            עריכה
                          </Button>
                        </td>
                      </tr>
                      
                      {/* פירוט פריטים */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0">
                            <div className="bg-stone-100 p-4">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-stone-600">
                                    <th className="text-right pb-2">פריט</th>
                                    <th className="text-right pb-2">צבע / מידה</th>
                                    <th className="text-right pb-2">כמות</th>
                                    <th className="text-right pb-2">מחיר מכירה</th>
                                    <th className="text-right pb-2">עלות בפועל</th>
                                    <th className="text-right pb-2">רווח</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(order.items || []).map((item, idx) => {
                                    const { soldPrice, costPrice, profit: itemProfit, hasCost } = calculateItemProfit(item);
                                    return (
                                      <tr key={idx} className="border-t border-stone-200">
                                        <td className="py-2">{item.product_name}</td>
                                        <td className="py-2">{[item.color, item.size].filter(Boolean).join(' / ') || '-'}</td>
                                        <td className="py-2">{item.quantity || 1}</td>
                                        <td className="py-2 text-blue-700">₪{soldPrice.toFixed(0)}</td>
                                        <td className="py-2 text-orange-700">
                                          {hasCost ? `₪${costPrice.toFixed(0)}` : <span className="text-amber-500">לא הוזן</span>}
                                        </td>
                                        <td className={`py-2 font-medium ${itemProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                          {hasCost ? `₪${itemProfit.toFixed(0)}` : '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {order.actual_shipping_cost > 0 && (
                                    <tr className="border-t border-stone-300">
                                      <td colSpan={4} className="py-2 font-medium">עלות משלוח</td>
                                      <td className="py-2 text-orange-700">
                                        ₪{convertToILS(order.actual_shipping_cost, order.actual_shipping_currency || 'ILS').toFixed(0)}
                                      </td>
                                      <td></td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* דיאלוג עריכת עלויות */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>עריכת עלויות - הזמנה #{editingOrder?.order_number}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <h3 className="font-semibold text-stone-700">עלויות פריטים</h3>
            {editingItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-stone-50 border space-y-2">
                <div className="font-medium text-sm">{item.product_name}</div>
                <div className="text-xs text-stone-500">
                  {[item.color, item.size].filter(Boolean).join(' / ')} • כמות: {item.quantity || 1}
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">עלות בפועל</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.actual_cost_price}
                      onChange={(e) => updateItemCost(idx, 'actual_cost_price', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">מטבע</Label>
                    <Select 
                      value={item.actual_cost_currency} 
                      onValueChange={(v) => updateItemCost(idx, 'actual_cost_currency', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ILS">₪ ILS</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="EUR">€ EUR</SelectItem>
                        <SelectItem value="GBP">£ GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-stone-700 mb-2">עלות משלוח</h3>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">עלות משלוח בפועל</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={editingShipping.cost}
                    onChange={(e) => setEditingShipping(prev => ({ ...prev, cost: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="w-24">
                  <Label className="text-xs">מטבע</Label>
                  <Select 
                    value={editingShipping.currency} 
                    onValueChange={(v) => setEditingShipping(prev => ({ ...prev, currency: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ILS">₪ ILS</SelectItem>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="EUR">€ EUR</SelectItem>
                      <SelectItem value="GBP">£ GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditingOrder(null)} disabled={saving}>
              <X className="w-4 h-4 ml-1" />
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-stone-900 hover:bg-black">
              {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
              שמירה
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}