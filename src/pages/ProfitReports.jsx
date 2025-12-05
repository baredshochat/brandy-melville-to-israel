import React, { useState, useEffect, useMemo } from "react";
import { Order } from "@/entities/Order";
import { ShipmentBatch } from "@/entities/ShipmentBatch";
import { User } from "@/entities/User";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter,
  Trash2,
  Plus,
  Link2,
  Unlink,
  Copy,
  ExternalLink
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
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [editingOrder, setEditingOrder] = useState(null);
  const [editingItems, setEditingItems] = useState([]);
  const [editingShipping, setEditingShipping] = useState({ cost: 0, currency: 'ILS' });
  const [saving, setSaving] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('orders');
  
  // מצב ליצירת חבילה חדשה
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [newBatch, setNewBatch] = useState({ batch_name: '', total_shipping_cost: '', shipping_currency: 'USD', notes: '' });
  const [editingBatch, setEditingBatch] = useState(null);

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
      const [ordersData, batchesData] = await Promise.all([
        Order.list('-created_date', 100),
        ShipmentBatch.list('-created_date', 50)
      ]);
      setOrders(ordersData || []);
      setBatches(batchesData || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // מציאת חבילה שהזמנה שייכת אליה
  const getOrderBatch = (orderId) => {
    return batches.find(b => (b.order_ids || []).includes(orderId));
  };

  // חישוב עלות משלוח יחסית מחבילה
  const getBatchShippingShare = (orderId) => {
    const batch = getOrderBatch(orderId);
    if (!batch || !batch.total_shipping_cost) return 0;
    const orderCount = (batch.order_ids || []).length;
    if (orderCount === 0) return 0;
    const sharePerOrder = convertToILS(batch.total_shipping_cost, batch.shipping_currency || 'USD') / orderCount;
    return sharePerOrder;
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
    
    // הוספת עלות משלוח (ישיר או מחבילה)
    let shippingCost = convertToILS(order.actual_shipping_cost, order.actual_shipping_currency || 'ILS');
    if (shippingCost === 0) {
      shippingCost = getBatchShippingShare(order.id);
    }
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

  // פונקציות לניהול חבילות
  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleCreateBatch = async () => {
    if (!newBatch.batch_name || !newBatch.total_shipping_cost || selectedOrderIds.size === 0) {
      alert('יש למלא שם חבילה, עלות משלוח ולבחור לפחות הזמנה אחת');
      return;
    }
    setSaving(true);
    try {
      await ShipmentBatch.create({
        batch_name: newBatch.batch_name,
        order_ids: Array.from(selectedOrderIds),
        total_shipping_cost: Number(newBatch.total_shipping_cost),
        shipping_currency: newBatch.shipping_currency,
        notes: newBatch.notes,
        status: 'pending'
      });
      await loadOrders();
      setShowBatchDialog(false);
      setNewBatch({ batch_name: '', total_shipping_cost: '', shipping_currency: 'USD', notes: '' });
      setSelectedOrderIds(new Set());
    } catch (e) {
      console.error('Error creating batch:', e);
      alert('שגיאה ביצירת חבילה');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBatch = async (batchId) => {
    if (!confirm('למחוק את החבילה?')) return;
    try {
      await ShipmentBatch.delete(batchId);
      await loadOrders();
    } catch (e) {
      console.error('Error deleting batch:', e);
    }
  };

  const handleUpdateBatch = async () => {
    if (!editingBatch) return;
    setSaving(true);
    try {
      await ShipmentBatch.update(editingBatch.id, {
        batch_name: editingBatch.batch_name,
        total_shipping_cost: Number(editingBatch.total_shipping_cost),
        shipping_currency: editingBatch.shipping_currency,
        notes: editingBatch.notes
      });
      await loadOrders();
      setEditingBatch(null);
    } catch (e) {
      console.error('Error updating batch:', e);
      alert('שגיאה בעדכון חבילה');
    } finally {
      setSaving(false);
    }
  };

  const removeOrderFromBatch = async (batchId, orderId) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    const newOrderIds = (batch.order_ids || []).filter(id => id !== orderId);
    await ShipmentBatch.update(batchId, { order_ids: newOrderIds });
    await loadOrders();
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
          <Button 
            variant="outline" 
            onClick={() => setShowBatchDialog(true)}
            className="gap-2"
          >
            <Link2 className="w-4 h-4" />
            קישור הזמנות לחבילה
          </Button>
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

      {/* טאבים */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">הזמנות ({filteredOrders.length})</TabsTrigger>
          <TabsTrigger value="batches">חבילות משלוח ({batches.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="batches" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">חבילות משלוח משותפות</CardTitle>
            </CardHeader>
            <CardContent>
              {batches.length === 0 ? (
                <p className="text-stone-500 text-center py-8">אין חבילות משלוח. לחצי על "קישור הזמנות לחבילה" ליצירת חבילה חדשה.</p>
              ) : (
                <div className="space-y-4">
                  {batches.map(batch => {
                    const batchOrders = orders.filter(o => (batch.order_ids || []).includes(o.id));
                    const costPerOrder = batchOrders.length > 0 
                      ? convertToILS(batch.total_shipping_cost, batch.shipping_currency || 'USD') / batchOrders.length 
                      : 0;
                    
                    return (
                      <Card key={batch.id} className="border-2 border-purple-200 bg-purple-50/50">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{batch.batch_name}</h3>
                              <p className="text-sm text-stone-500">
                                {batchOrders.length} הזמנות • 
                                עלות כוללת: {batch.shipping_currency === 'USD' ? '$' : batch.shipping_currency === 'EUR' ? '€' : batch.shipping_currency === 'GBP' ? '£' : '₪'}{batch.total_shipping_cost} • 
                                עלות להזמנה: ₪{costPerOrder.toFixed(0)}
                              </p>
                              {batch.notes && <p className="text-xs text-stone-400 mt-1">{batch.notes}</p>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingBatch(batch)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteBatch(batch.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {batchOrders.map(order => (
                              <Badge key={order.id} variant="secondary" className="flex items-center gap-1">
                                #{order.order_number} - {order.customer_name}
                                <button 
                                  onClick={() => removeOrderFromBatch(batch.id, order.id)}
                                  className="mr-1 hover:text-red-500"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
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
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{order.order_number}</Badge>
                            {getOrderBatch(order.id) && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                📦 {getOrderBatch(order.id).batch_name}
                              </Badge>
                            )}
                          </div>
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
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(order)}>
                              <Edit2 className="w-4 h-4 ml-1" />
                              עריכה
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={async () => {
                                if (confirm(`למחוק את הזמנה #${order.order_number}?`)) {
                                  await Order.delete(order.id);
                                  loadOrders();
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* פירוט פריטים */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0">
                            <div className="bg-stone-100 p-4">
                              <table className="w-full text-sm table-fixed">
                                <thead>
                                  <tr className="text-stone-600">
                                    <th className="text-left pb-2" style={{width: '25%'}}>פריט</th>
                                    <th className="text-right pb-2" style={{width: '15%'}}>צבע / מידה</th>
                                    <th className="text-right pb-2" style={{width: '10%'}}>כמות</th>
                                    <th className="text-right pb-2" style={{width: '12%'}}>מחיר באתר</th>
                                    <th className="text-right pb-2" style={{width: '14%'}}>מחיר ללקוחה</th>
                                    <th className="text-right pb-2" style={{width: '14%'}}>עלות בפועל</th>
                                    <th className="text-right pb-2" style={{width: '10%'}}>רווח</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(order.items || []).map((item, idx) => {
                                    const { costPrice, hasCost } = calculateItemProfit(item);
                                    const currencySymbol = item.original_currency === 'USD' ? '$' : item.original_currency === 'EUR' ? '€' : item.original_currency === 'GBP' ? '£' : '₪';
                                    const originalPriceDisplay = `${currencySymbol}${Number(item.original_price || 0).toFixed(0)}`;
                                    // מחיר ללקוחה - משתמשים בשדה השמור, או הערכה אם לא קיים
                                    const customerPrice = item.customer_price_ils || 0;
                                    const hasCustomerPrice = customerPrice > 0;
                                    // חישוב רווח מול מחיר ללקוחה
                                    const itemProfit = customerPrice - costPrice;
                                    return (
                                      <tr key={idx} className="border-t border-stone-200">
                                        <td className="py-2" style={{width: '25%'}}>{item.product_name}</td>
                                        <td className="py-2" style={{width: '15%'}}>{[item.color, item.size].filter(Boolean).join(' / ') || '-'}</td>
                                        <td className="py-2" style={{width: '10%'}}>{item.quantity || 1}</td>
                                        <td className="py-2 text-stone-600" style={{width: '12%'}}>{originalPriceDisplay}</td>
                                        <td className="py-2 text-blue-700 font-medium" style={{width: '14%'}}>
                                          {hasCustomerPrice ? `₪${customerPrice.toFixed(0)}` : <span className="text-amber-500">לא נשמר</span>}
                                        </td>
                                        <td className="py-2 text-orange-700" style={{width: '14%'}}>
                                          {hasCost ? `₪${costPrice.toFixed(0)}` : <span className="text-amber-500">לא הוזן</span>}
                                        </td>
                                        <td className={`py-2 font-medium ${itemProfit >= 0 ? 'text-green-700' : 'text-red-700'}`} style={{width: '10%'}}>
                                          {hasCost && hasCustomerPrice ? `₪${itemProfit.toFixed(0)}` : '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {(order.actual_shipping_cost > 0 || getBatchShippingShare(order.id) > 0) && (
                                    <tr className="border-t border-stone-300 bg-stone-200/50">
                                      <td style={{width: '25%'}} className="py-2 font-medium">
                                        עלות משלוח
                                        {getBatchShippingShare(order.id) > 0 && !order.actual_shipping_cost && (
                                          <span className="text-xs text-purple-600 mr-2">(מחבילה: {getOrderBatch(order.id)?.batch_name})</span>
                                        )}
                                      </td>
                                      <td style={{width: '15%'}} className="py-2"></td>
                                      <td style={{width: '10%'}} className="py-2"></td>
                                      <td style={{width: '12%'}} className="py-2"></td>
                                      <td style={{width: '14%'}} className="py-2"></td>
                                      <td style={{width: '14%'}} className="py-2 text-orange-700 font-medium">
                                        ₪{(order.actual_shipping_cost ? convertToILS(order.actual_shipping_cost, order.actual_shipping_currency || 'ILS') : getBatchShippingShare(order.id)).toFixed(0)}
                                      </td>
                                      <td style={{width: '10%'}} className="py-2"></td>
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
        </TabsContent>
      </Tabs>

      {/* דיאלוג יצירת חבילה */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>קישור הזמנות לחבילת משלוח משותפת</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>שם החבילה</Label>
                <Input
                  placeholder="לדוגמה: משלוח דצמבר 2024"
                  value={newBatch.batch_name}
                  onChange={(e) => setNewBatch(prev => ({ ...prev, batch_name: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>עלות משלוח כוללת</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newBatch.total_shipping_cost}
                    onChange={(e) => setNewBatch(prev => ({ ...prev, total_shipping_cost: e.target.value }))}
                  />
                </div>
                <div className="w-24">
                  <Label>מטבע</Label>
                  <Select value={newBatch.shipping_currency} onValueChange={(v) => setNewBatch(prev => ({ ...prev, shipping_currency: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="EUR">€ EUR</SelectItem>
                      <SelectItem value="GBP">£ GBP</SelectItem>
                      <SelectItem value="ILS">₪ ILS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div>
              <Label>הערות (אופציונלי)</Label>
              <Input
                placeholder="הערות נוספות..."
                value={newBatch.notes}
                onChange={(e) => setNewBatch(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div>
              <Label className="mb-2 block">בחרי הזמנות לקישור ({selectedOrderIds.size} נבחרו)</Label>
              <div className="max-h-64 overflow-y-auto border p-2 space-y-2">
                {filteredOrders.filter(o => !getOrderBatch(o.id)).map(order => (
                  <div 
                    key={order.id} 
                    className={`flex items-center gap-3 p-2 hover:bg-stone-50 cursor-pointer ${selectedOrderIds.has(order.id) ? 'bg-purple-50 border border-purple-200' : ''}`}
                    onClick={() => toggleOrderSelection(order.id)}
                  >
                    <Checkbox checked={selectedOrderIds.has(order.id)} />
                    <div className="flex-1">
                      <span className="font-medium">#{order.order_number}</span>
                      <span className="text-stone-500 mr-2">- {order.customer_name}</span>
                      <span className="text-xs text-stone-400">{new Date(order.created_date).toLocaleDateString('he-IL')}</span>
                    </div>
                    <span className="text-sm text-stone-600">₪{order.total_price_ils?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedOrderIds.size > 0 && newBatch.total_shipping_cost && (
              <div className="bg-purple-50 p-3 border border-purple-200">
                <p className="text-sm text-purple-800">
                  💡 עלות משלוח להזמנה: ₪{(convertToILS(Number(newBatch.total_shipping_cost), newBatch.shipping_currency) / selectedOrderIds.size).toFixed(0)}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => { setShowBatchDialog(false); setSelectedOrderIds(new Set()); }}>
              ביטול
            </Button>
            <Button onClick={handleCreateBatch} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Plus className="w-4 h-4 ml-1" />}
              יצירת חבילה
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* דיאלוג עריכת חבילה */}
      <Dialog open={!!editingBatch} onOpenChange={() => setEditingBatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת חבילה</DialogTitle>
          </DialogHeader>
          {editingBatch && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>שם החבילה</Label>
                <Input
                  value={editingBatch.batch_name}
                  onChange={(e) => setEditingBatch(prev => ({ ...prev, batch_name: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>עלות משלוח</Label>
                  <Input
                    type="number"
                    value={editingBatch.total_shipping_cost}
                    onChange={(e) => setEditingBatch(prev => ({ ...prev, total_shipping_cost: e.target.value }))}
                  />
                </div>
                <div className="w-24">
                  <Label>מטבע</Label>
                  <Select value={editingBatch.shipping_currency} onValueChange={(v) => setEditingBatch(prev => ({ ...prev, shipping_currency: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">$ USD</SelectItem>
                      <SelectItem value="EUR">€ EUR</SelectItem>
                      <SelectItem value="GBP">£ GBP</SelectItem>
                      <SelectItem value="ILS">₪ ILS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>הערות</Label>
                <Input
                  value={editingBatch.notes || ''}
                  onChange={(e) => setEditingBatch(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingBatch(null)}>ביטול</Button>
                <Button onClick={handleUpdateBatch} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'שמירה'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* דיאלוג עריכת עלויות */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>עריכת הזמנה #{editingOrder?.order_number}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-stone-700">פריטים בהזמנה</h3>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setEditingItems(prev => [...prev, {
                  product_name: '',
                  product_url: '',
                  color: '',
                  size: '',
                  quantity: 1,
                  original_price: '',
                  original_currency: 'EUR',
                  actual_cost_price: '',
                  actual_cost_currency: 'ILS'
                }])}
              >
                <Plus className="w-4 h-4 ml-1" />
                הוסף פריט
              </Button>
            </div>
            {editingItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-stone-50 border space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Input
                      placeholder="שם המוצר"
                      value={item.product_name || ''}
                      onChange={(e) => updateItemCost(idx, 'product_name', e.target.value)}
                      className="h-8 text-sm font-medium"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 mr-2"
                    onClick={() => setEditingItems(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* קישור למוצר */}
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      placeholder="קישור למוצר"
                      value={item.product_url || ''}
                      onChange={(e) => updateItemCost(idx, 'product_url', e.target.value)}
                      className="h-8 text-xs"
                      dir="ltr"
                    />
                  </div>
                  {item.product_url && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          navigator.clipboard.writeText(item.product_url);
                          alert('הקישור הועתק!');
                        }}
                        title="העתק קישור"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="פתח קישור">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </>
                  )}
                </div>

                {/* צבע, מידה, כמות */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">צבע</Label>
                    <Input
                      placeholder="צבע"
                      value={item.color || ''}
                      onChange={(e) => updateItemCost(idx, 'color', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">מידה</Label>
                    <Input
                      placeholder="מידה"
                      value={item.size || ''}
                      onChange={(e) => updateItemCost(idx, 'size', e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">כמות</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e) => updateItemCost(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* מחיר מכירה */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">מחיר מכירה</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.original_price || ''}
                      onChange={(e) => updateItemCost(idx, 'original_price', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">מטבע</Label>
                    <Select 
                      value={item.original_currency || 'EUR'} 
                      onValueChange={(v) => updateItemCost(idx, 'original_currency', v)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">€ EUR</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                        <SelectItem value="GBP">£ GBP</SelectItem>
                        <SelectItem value="ILS">₪ ILS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* עלות בפועל */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">עלות בפועל</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={item.actual_cost_price}
                      onChange={(e) => updateItemCost(idx, 'actual_cost_price', e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">מטבע</Label>
                    <Select 
                      value={item.actual_cost_currency} 
                      onValueChange={(v) => updateItemCost(idx, 'actual_cost_currency', v)}
                    >
                      <SelectTrigger className="h-8">
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