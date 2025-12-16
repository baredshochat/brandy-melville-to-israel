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
  ExternalLink,
  Receipt
} from "lucide-react";
import MonthlyExpensesTab from "../components/admin/MonthlyExpensesTab";

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
  const [selectedItems, setSelectedItems] = useState([]); // [{orderId, itemIndex, item}]
  const [newBatch, setNewBatch] = useState({ batch_name: '', total_shipping_cost: '', shipping_currency: 'USD', notes: '' });
  const [editingBatch, setEditingBatch] = useState(null);
  const [addingItemsToBatch, setAddingItemsToBatch] = useState(null); // batch id when adding items to existing batch
  
  // מצב לפריטי מלאי
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showAddInventoryItem, setShowAddInventoryItem] = useState(false);
  const [newInventoryItem, setNewInventoryItem] = useState({
    product_name: '',
    product_sku: '',
    actual_cost_price: '',
    actual_cost_currency: 'ILS',
    quantity: 1,
    color: '',
    size: '',
    source_url: '',
    notes: ''
  });
  const [productSuggestions, setProductSuggestions] = useState([]);
  
  // עריכת פריט בודד בתוך פירוט הזמנה
  const [inlineEditingItem, setInlineEditingItem] = useState(null); // {orderId, itemIndex, data}

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
      const [allOrdersData, batchesData] = await Promise.all([
        Order.list('-created_date', 500),
        ShipmentBatch.list('-created_date', 50)
      ]);
      // Filter out orders that are awaiting payment
      const ordersData = (allOrdersData || []).filter(o => o.status !== 'awaiting_payment');
      setOrders(ordersData);
      setBatches(batchesData || []);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  // מציאת חבילה שפריט שייך אליה
  const getItemBatch = (orderId, itemIndex) => {
    return batches.find(b => 
      (b.item_links || []).some(link => link.order_id === orderId && link.item_index === itemIndex)
    );
  };

  // בדיקה אם פריט כבר משויך לחבילה כלשהי
  const isItemLinkedToBatch = (orderId, itemIndex) => {
    return batches.some(b => 
      (b.item_links || []).some(link => link.order_id === orderId && link.item_index === itemIndex)
    );
  };

  // חישוב עלות משלוח יחסית לכל פריט בחבילה
  const getItemBatchShippingShare = (orderId, itemIndex) => {
    const batch = getItemBatch(orderId, itemIndex);
    if (!batch || !batch.total_shipping_cost) return 0;
    const itemCount = (batch.item_links || []).length + (batch.inventory_items || []).length;
    if (itemCount === 0) return 0;
    const sharePerItem = convertToILS(batch.total_shipping_cost, batch.shipping_currency || 'USD') / itemCount;
    return sharePerItem;
  };

  // חישוב עלות כוללת של פריטי מלאי בחבילה
  const getBatchInventoryCost = (batch) => {
    if (!batch || !batch.inventory_items) return 0;
    return batch.inventory_items.reduce((sum, item) => {
      return sum + convertToILS(item.actual_cost_price, item.actual_cost_currency || 'ILS') * (item.quantity || 1);
    }, 0);
  };

  // חישוב סה״כ עלות משלוח להזמנה (מכל החבילות של הפריטים שלה)
  const getOrderTotalBatchShipping = (order) => {
    if (!order || !order.items) return 0;
    let totalShipping = 0;
    order.items.forEach((item, idx) => {
      totalShipping += getItemBatchShippingShare(order.id, idx);
    });
    return totalShipping;
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
    
    // הוספת עלות משלוח (ישיר או מחבילות)
    let shippingCost = convertToILS(order.actual_shipping_cost, order.actual_shipping_currency || 'ILS');
    if (shippingCost === 0) {
      shippingCost = getOrderTotalBatchShipping(order);
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
    
    // הוספת עלויות פריטי מלאי מכל החבילות
    let totalInventoryCost = 0;
    batches.forEach(batch => {
      totalInventoryCost += getBatchInventoryCost(batch);
    });
    
    totalCost += totalInventoryCost;
    
    const totalProfit = totalRevenue - totalCost;
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    return { totalRevenue, totalCost, totalProfit, avgMargin, ordersWithFullCost, ordersWithPartialCost, totalInventoryCost };
  }, [filteredOrders, batches]);

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

  // עריכת פריט בודד inline
  const startInlineEdit = (order, itemIndex) => {
    const item = order.items[itemIndex];
    setInlineEditingItem({
      orderId: order.id,
      itemIndex,
      data: {
        ...item,
        actual_cost_price: item.actual_cost_price || '',
        actual_cost_currency: item.actual_cost_currency || 'ILS',
        customer_price_ils: item.customer_price_ils || ''
      }
    });
  };

  const updateInlineItem = (field, value) => {
    setInlineEditingItem(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value }
    }));
  };

  const saveInlineItem = async () => {
    if (!inlineEditingItem) return;
    setSaving(true);
    try {
      const order = orders.find(o => o.id === inlineEditingItem.orderId);
      if (!order) return;
      
      const updatedItems = [...order.items];
      updatedItems[inlineEditingItem.itemIndex] = {
        ...updatedItems[inlineEditingItem.itemIndex],
        actual_cost_price: inlineEditingItem.data.actual_cost_price ? Number(inlineEditingItem.data.actual_cost_price) : null,
        actual_cost_currency: inlineEditingItem.data.actual_cost_currency,
        customer_price_ils: inlineEditingItem.data.customer_price_ils ? Number(inlineEditingItem.data.customer_price_ils) : null
      };
      
      await Order.update(inlineEditingItem.orderId, { items: updatedItems });
      await loadOrders();
      setInlineEditingItem(null);
    } catch (e) {
      console.error('Error saving item:', e);
      alert('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditingItem(null);
  };

  // פונקציות לניהול חבילות
  const toggleItemSelection = (orderId, itemIndex, item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.orderId === orderId && i.itemIndex === itemIndex);
      if (exists) {
        return prev.filter(i => !(i.orderId === orderId && i.itemIndex === itemIndex));
      } else {
        return [...prev, { orderId, itemIndex, item, orderNumber: orders.find(o => o.id === orderId)?.order_number }];
      }
    });
  };

  const isItemSelected = (orderId, itemIndex) => {
    return selectedItems.some(i => i.orderId === orderId && i.itemIndex === itemIndex);
  };

  const handleCreateBatch = async () => {
    const hasItems = selectedItems.length > 0 || inventoryItems.length > 0;
    
    if (!newBatch.batch_name || !newBatch.total_shipping_cost || !hasItems) {
      alert('יש למלא שם חבילה, עלות משלוח ולבחור לפחות פריט אחד (מהזמנה או מלאי)');
      return;
    }
    setSaving(true);
    try {
      const batchData = {
        batch_name: newBatch.batch_name,
        total_shipping_cost: Number(newBatch.total_shipping_cost),
        shipping_currency: newBatch.shipping_currency,
        notes: newBatch.notes,
        status: 'pending',
        item_links: selectedItems.map(i => ({
          order_id: i.orderId,
          item_index: i.itemIndex,
          product_name: i.item.product_name
        })),
        inventory_items: inventoryItems.map(item => ({
          ...item,
          actual_cost_price: Number(item.actual_cost_price),
          quantity: Number(item.quantity)
        }))
      };

      const createdBatch = await ShipmentBatch.create(batchData);
      
      // עדכון הפריטים בהזמנות עם מזהה החבילה
      const updatePromises = selectedItems.map(async (selectedItem) => {
        const order = orders.find(o => o.id === selectedItem.orderId);
        if (!order) return;
        
        const updatedItems = [...order.items];
        updatedItems[selectedItem.itemIndex] = {
          ...updatedItems[selectedItem.itemIndex],
          shipment_batch_id: createdBatch.id
        };
        
        await Order.update(order.id, { items: updatedItems });
      });
      
      await Promise.all(updatePromises);
      await loadOrders();
      
      setShowBatchDialog(false);
      setNewBatch({ batch_name: '', total_shipping_cost: '', shipping_currency: 'USD', notes: '' });
      setSelectedItems([]);
      setInventoryItems([]);
    } catch (e) {
      console.error('Error creating batch:', e);
      alert('שגיאה ביצירת חבילה');
    } finally {
      setSaving(false);
    }
  };

  // פונקציות לניהול פריטי מלאי
  const addInventoryItemToBatch = () => {
    if (!newInventoryItem.product_name || !newInventoryItem.actual_cost_price) {
      alert('יש למלא לפחות שם מוצר ועלות');
      return;
    }
    setInventoryItems(prev => [...prev, { ...newInventoryItem }]);
    setNewInventoryItem({
      product_name: '',
      product_sku: '',
      actual_cost_price: '',
      actual_cost_currency: 'ILS',
      quantity: 1,
      color: '',
      size: '',
      source_url: '',
      notes: ''
    });
    setShowAddInventoryItem(false);
  };

  const removeInventoryItem = (index) => {
    setInventoryItems(prev => prev.filter((_, i) => i !== index));
  };

  // מציאת הצעות למוצרים קיימים (לצורך autocomplete)
  const findProductSuggestions = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setProductSuggestions([]);
      return;
    }

    const suggestions = new Map(); // להימנע מכפילויות
    
    // חיפוש בפריטי מלאי קיימים בחבילות
    batches.forEach(batch => {
      (batch.inventory_items || []).forEach(item => {
        if (item.product_name.toLowerCase().includes(searchTerm.toLowerCase())) {
          suggestions.set(item.product_name, item);
        }
      });
    });

    // חיפוש בפריטים מהזמנות עם עלות מתועדת
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        if (item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) && item.actual_cost_price) {
          suggestions.set(item.product_name, item);
        }
      });
    });

    setProductSuggestions(Array.from(suggestions.values()).slice(0, 5));
  };

  const selectProductSuggestion = (suggestion) => {
    setNewInventoryItem(prev => ({
      ...prev,
      product_name: suggestion.product_name,
      product_sku: suggestion.product_sku || prev.product_sku,
      actual_cost_price: suggestion.actual_cost_price || prev.actual_cost_price,
      actual_cost_currency: suggestion.actual_cost_currency || prev.actual_cost_currency,
      color: suggestion.color || prev.color,
      size: suggestion.size || prev.size,
      source_url: suggestion.source_url || prev.source_url
    }));
    setProductSuggestions([]);
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

  const removeItemFromBatch = async (batchId, orderId, itemIndex) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    
    const newItemLinks = (batch.item_links || []).filter(link => 
      !(link.order_id === orderId && link.item_index === itemIndex)
    );
    
    await ShipmentBatch.update(batchId, { item_links: newItemLinks });
    
    // הסרת shipment_batch_id מהפריט
    const order = orders.find(o => o.id === orderId);
    if (order) {
      const updatedItems = [...order.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        shipment_batch_id: null
      };
      await Order.update(orderId, { items: updatedItems });
    }
    
    await loadOrders();
  };

  const addItemsToBatch = async (batchId, newItems) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    
    const currentLinks = batch.item_links || [];
    const newLinks = newItems.map(i => ({
      order_id: i.orderId,
      item_index: i.itemIndex,
      product_name: i.item.product_name
    }));
    
    await ShipmentBatch.update(batchId, { 
      item_links: [...currentLinks, ...newLinks] 
    });
    
    // עדכון הפריטים בהזמנות
    const updatePromises = newItems.map(async (selectedItem) => {
      const order = orders.find(o => o.id === selectedItem.orderId);
      if (!order) return;
      
      const updatedItems = [...order.items];
      updatedItems[selectedItem.itemIndex] = {
        ...updatedItems[selectedItem.itemIndex],
        shipment_batch_id: batchId
      };
      
      await Order.update(order.id, { items: updatedItems });
    });
    
    await Promise.all(updatePromises);
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
          <TabsTrigger value="expenses" className="gap-1">
            <Receipt className="w-4 h-4" />
            הוצאות חודשיות
          </TabsTrigger>
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
                    const itemLinks = batch.item_links || [];
                    const inventoryItems = batch.inventory_items || [];
                    const totalItems = itemLinks.length + inventoryItems.length;
                    const costPerItem = totalItems > 0 
                      ? convertToILS(batch.total_shipping_cost, batch.shipping_currency || 'USD') / totalItems 
                      : 0;
                    const inventoryCost = getBatchInventoryCost(batch);
                    
                    return (
                      <Card key={batch.id} className="border-2 border-purple-200 bg-purple-50/50">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{batch.batch_name}</h3>
                              <p className="text-sm text-stone-500">
                                {itemLinks.length} מהזמנות{inventoryItems.length > 0 && ` + ${inventoryItems.length} מלאי`} • 
                                עלות משלוח: {batch.shipping_currency === 'USD' ? '$' : batch.shipping_currency === 'EUR' ? '€' : batch.shipping_currency === 'GBP' ? '£' : '₪'}{batch.total_shipping_cost}
                                {inventoryCost > 0 && ` • עלות מלאי: ₪${inventoryCost.toFixed(0)}`}
                              </p>
                              {batch.notes && <p className="text-xs text-stone-400 mt-1">{batch.notes}</p>}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                setAddingItemsToBatch(batch.id);
                                setShowBatchDialog(true);
                              }}>
                                <Plus className="w-4 h-4 ml-1" />
                                הוסף פריטים
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingBatch(batch)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteBatch(batch.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* רשימת הפריטים בחבילה */}
                          <div className="space-y-2 mt-3">
                            {/* פריטים מהזמנות */}
                            {itemLinks.length > 0 && (
                              <div className="text-xs font-medium text-stone-600 mb-2">פריטים מהזמנות לקוחות:</div>
                            )}
                            {itemLinks.map((link, idx) => {
                              const order = orders.find(o => o.id === link.order_id);
                              const item = order?.items?.[link.item_index];
                              
                              return (
                                <div key={idx} className="flex items-center justify-between p-2 bg-white border border-purple-100 hover:border-purple-300 transition-colors">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">#{order?.order_number}</Badge>
                                      <span className="text-sm font-medium">{link.product_name}</span>
                                    </div>
                                    {item && (
                                      <div className="text-xs text-stone-500 mt-1">
                                        {order?.customer_name}
                                        {(item.color || item.size) && ` • ${[item.color, item.size].filter(Boolean).join(' / ')}`}
                                        {item.quantity > 1 && ` • כמות: ${item.quantity}`}
                                      </div>
                                    )}
                                  </div>
                                  <Button 
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700 h-7 w-7 p-0"
                                    onClick={() => removeItemFromBatch(batch.id, link.order_id, link.item_index)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              );
                            })}
                            
                            {/* פריטי מלאי */}
                            {inventoryItems.length > 0 && (
                              <>
                                <div className="text-xs font-medium text-stone-600 mt-4 mb-2">פריטי מלאי שנרכשו:</div>
                                {inventoryItems.map((item, idx) => {
                                  const itemCost = convertToILS(item.actual_cost_price, item.actual_cost_currency) * item.quantity;
                                  return (
                                    <div key={`inv-${idx}`} className="flex items-center justify-between p-2 bg-amber-50 border border-amber-200 hover:border-amber-300 transition-colors">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Badge className="bg-amber-100 text-amber-800 text-xs">מלאי</Badge>
                                          <span className="text-sm font-medium">{item.product_name}</span>
                                        </div>
                                        <div className="text-xs text-stone-600 mt-1">
                                          {[item.color, item.size].filter(Boolean).join(' / ')}
                                          {item.quantity > 1 && ` • כמות: ${item.quantity}`}
                                          {' • עלות: ₪'}{itemCost.toFixed(0)}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </>
                            )}
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

        {/* Monthly Expenses Tab */}
        <TabsContent value="expenses" className="mt-4">
          <MonthlyExpensesTab />
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
                    <th className="text-left p-3 w-10"></th>
                    <th className="text-left p-3">מס׳ הזמנה</th>
                    <th className="text-left p-3">תאריך</th>
                    <th className="text-left p-3">לקוחה</th>
                    <th className="text-left p-3">הכנסה</th>
                    <th className="text-left p-3">עלות</th>
                    <th className="text-left p-3">רווח</th>
                    <th className="text-left p-3">מרווח</th>
                    <th className="text-left p-3">פעולות</th>
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">#{order.order_number}</Badge>
                            {/* Site badge */}
                            {order.site && (
                              <Badge className={
                                order.site === 'us' ? 'bg-blue-100 text-blue-700' :
                                order.site === 'eu' ? 'bg-green-100 text-green-700' :
                                order.site === 'uk' ? 'bg-purple-100 text-purple-700' :
                                order.site === 'local' ? 'bg-rose-100 text-rose-700' :
                                'bg-stone-100 text-stone-700'
                              }>
                                {order.site === 'local' ? '🇮🇱' : order.site.toUpperCase()}
                              </Badge>
                            )}
                            {/* Show unique batches for this order's items */}
                            {(() => {
                              const orderBatchIds = new Set();
                              (order.items || []).forEach((item, idx) => {
                                const batch = getItemBatch(order.id, idx);
                                if (batch) orderBatchIds.add(batch.id);
                              });
                              return Array.from(orderBatchIds).map(batchId => {
                                const batch = batches.find(b => b.id === batchId);
                                return batch ? (
                                  <Badge key={batchId} className="bg-purple-100 text-purple-700 text-xs">
                                    📦 {batch.batch_name}
                                  </Badge>
                                ) : null;
                              });
                            })()}
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
                                    <th className="text-left pb-2" style={{width: '20%'}}>פריט</th>
                                    <th className="text-left pb-2" style={{width: '10%'}}>צבע / מידה</th>
                                    <th className="text-left pb-2" style={{width: '6%'}}>כמות</th>
                                    <th className="text-left pb-2" style={{width: '10%'}}>מחיר באתר</th>
                                    <th className="text-left pb-2" style={{width: '12%'}}>מחיר ללקוחה</th>
                                    <th className="text-left pb-2" style={{width: '12%'}}>עלות בפועל</th>
                                    <th className="text-left pb-2" style={{width: '10%'}}>רווח</th>
                                    <th className="text-left pb-2" style={{width: '10%'}}>מרווח</th>
                                    <th className="text-left pb-2" style={{width: '10%'}}>פעולות</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(order.items || []).map((item, idx) => {
                                    const { costPrice, hasCost } = calculateItemProfit(item);
                                    const currencySymbol = item.original_currency === 'USD' ? '$' : item.original_currency === 'EUR' ? '€' : item.original_currency === 'GBP' ? '£' : '₪';
                                    const originalPriceDisplay = `${currencySymbol}${Number(item.original_price || 0).toFixed(0)}`;
                                    const customerPrice = item.customer_price_ils || 0;
                                    const hasCustomerPrice = customerPrice > 0;
                                    const itemProfit = customerPrice - costPrice;
                                    
                                    const isEditingThisItem = inlineEditingItem?.orderId === order.id && inlineEditingItem?.itemIndex === idx;
                                    
                                    const itemMargin = (hasCost && hasCustomerPrice && customerPrice > 0) ? (itemProfit / customerPrice) * 100 : null;
                                    
                                    if (isEditingThisItem) {
                                      return (
                                        <tr key={idx} className="border-t border-stone-200 bg-blue-50">
                                          <td className="py-2 text-left" style={{width: '20%'}}>{item.product_name}</td>
                                          <td className="py-2 text-left" style={{width: '10%'}}>{[item.color, item.size].filter(Boolean).join(' / ') || '-'}</td>
                                          <td className="py-2 text-left" style={{width: '6%'}}>{item.quantity || 1}</td>
                                          <td className="py-2 text-left text-stone-600" style={{width: '10%'}}>{originalPriceDisplay}</td>
                                          <td className="py-2 text-left" style={{width: '12%'}}>
                                            <Input
                                              type="number"
                                              placeholder="מחיר ללקוחה"
                                              value={inlineEditingItem.data.customer_price_ils}
                                              onChange={(e) => updateInlineItem('customer_price_ils', e.target.value)}
                                              className="h-7 w-20 text-xs"
                                            />
                                          </td>
                                          <td className="py-2 text-left" style={{width: '12%'}}>
                                            <div className="flex gap-1">
                                              <Input
                                                type="number"
                                                placeholder="עלות"
                                                value={inlineEditingItem.data.actual_cost_price}
                                                onChange={(e) => updateInlineItem('actual_cost_price', e.target.value)}
                                                className="h-7 w-14 text-xs"
                                              />
                                              <Select 
                                                value={inlineEditingItem.data.actual_cost_currency} 
                                                onValueChange={(v) => updateInlineItem('actual_cost_currency', v)}
                                              >
                                                <SelectTrigger className="h-7 w-14 text-xs">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="ILS">₪</SelectItem>
                                                  <SelectItem value="USD">$</SelectItem>
                                                  <SelectItem value="EUR">€</SelectItem>
                                                  <SelectItem value="GBP">£</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </td>
                                          <td className="py-2 text-left" style={{width: '10%'}}>-</td>
                                          <td className="py-2 text-left" style={{width: '10%'}}>-</td>
                                          <td className="py-2 text-left" style={{width: '10%'}}>
                                            <div className="flex gap-1">
                                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-green-600" onClick={saveInlineItem} disabled={saving}>
                                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                              </Button>
                                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-stone-500" onClick={cancelInlineEdit}>
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    }
                                    
                                    const itemBatch = getItemBatch(order.id, idx);

                                    return (
                                     <tr key={idx} className="border-t border-stone-200 hover:bg-stone-50">
                                       <td className="py-2 text-left" style={{width: '20%'}}>
                                         <div className="flex items-center gap-2">
                                           <span>{item.product_name}</span>
                                           {itemBatch && (
                                             <Badge className="bg-purple-100 text-purple-700 text-xs">
                                               📦 {itemBatch.batch_name}
                                             </Badge>
                                           )}
                                         </div>
                                       </td>
                                       <td className="py-2 text-left" style={{width: '10%'}}>{[item.color, item.size].filter(Boolean).join(' / ') || '-'}</td>
                                       <td className="py-2 text-left" style={{width: '6%'}}>{item.quantity || 1}</td>
                                       <td className="py-2 text-left text-stone-600" style={{width: '10%'}}>{originalPriceDisplay}</td>
                                       <td className="py-2 text-left text-blue-700 font-medium" style={{width: '12%'}}>
                                         {hasCustomerPrice ? `₪${customerPrice.toFixed(0)}` : <span className="text-amber-500">לא נשמר</span>}
                                       </td>
                                       <td className="py-2 text-left text-orange-700" style={{width: '12%'}}>
                                         {hasCost ? `₪${costPrice.toFixed(0)}` : <span className="text-amber-500">לא הוזן</span>}
                                       </td>
                                       <td className={`py-2 text-left font-medium ${itemProfit >= 0 ? 'text-green-700' : 'text-red-700'}`} style={{width: '10%'}}>
                                         {hasCost && hasCustomerPrice ? `₪${itemProfit.toFixed(0)}` : '-'}
                                       </td>
                                       <td className="py-2 text-left" style={{width: '10%'}}>
                                         {itemMargin !== null ? (
                                           <Badge className={itemMargin >= 20 ? 'bg-green-100 text-green-800' : itemMargin >= 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                                             {itemMargin.toFixed(0)}%
                                           </Badge>
                                         ) : '-'}
                                       </td>
                                       <td className="py-2 text-left" style={{width: '10%'}}>
                                         <Button 
                                           size="sm" 
                                           variant="ghost" 
                                           className="h-7 w-7 p-0 text-stone-500 hover:text-stone-700"
                                           onClick={() => startInlineEdit(order, idx)}
                                         >
                                           <Edit2 className="w-3 h-3" />
                                         </Button>
                                       </td>
                                     </tr>
                                    );
                                  })}
                                  {(order.actual_shipping_cost > 0 || getOrderTotalBatchShipping(order) > 0) && (
                                    <tr className="border-t border-stone-300 bg-stone-200/50">
                                      <td style={{width: '20%'}} className="py-2 font-medium">
                                        עלות משלוח
                                        {getOrderTotalBatchShipping(order) > 0 && !order.actual_shipping_cost && (
                                          <span className="text-xs text-purple-600 mr-2">(מחבילות)</span>
                                        )}
                                      </td>
                                      <td style={{width: '10%'}} className="py-2"></td>
                                      <td style={{width: '6%'}} className="py-2"></td>
                                      <td style={{width: '10%'}} className="py-2"></td>
                                      <td style={{width: '12%'}} className="py-2"></td>
                                      <td style={{width: '12%'}} className="py-2 text-orange-700 font-medium">
                                        ₪{(order.actual_shipping_cost ? convertToILS(order.actual_shipping_cost, order.actual_shipping_currency || 'ILS') : getOrderTotalBatchShipping(order)).toFixed(0)}
                                      </td>
                                      <td style={{width: '10%'}} className="py-2"></td>
                                      <td style={{width: '10%'}} className="py-2"></td>
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

      {/* דיאלוג יצירת/עריכת חבילה */}
      <Dialog open={showBatchDialog} onOpenChange={(open) => {
        setShowBatchDialog(open);
        if (!open) {
          setSelectedItems([]);
          setInventoryItems([]);
          setAddingItemsToBatch(null);
          setNewBatch({ batch_name: '', total_shipping_cost: '', shipping_currency: 'USD', notes: '' });
          setShowAddInventoryItem(false);
          setProductSuggestions([]);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {addingItemsToBatch ? `הוספת פריטים ל-${batches.find(b => b.id === addingItemsToBatch)?.batch_name}` : 'קישור פריטים לחבילת משלוח משותפת'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {!addingItemsToBatch && (
              <>
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
              </>
            )}

            {/* כפתור להוספת פריט מלאי */}
            {!addingItemsToBatch && (
              <div className="mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddInventoryItem(!showAddInventoryItem)}
                  className="w-full gap-2 border-dashed border-2 border-amber-300 hover:bg-amber-50"
                >
                  <Plus className="w-4 h-4" />
                  {showAddInventoryItem ? 'סגור הוספת פריט מלאי' : 'הוסף פריט מלאי (רכישה ישירה)'}
                </Button>
              </div>
            )}

            {/* טופס להוספת פריט מלאי */}
            {showAddInventoryItem && !addingItemsToBatch && (
              <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 space-y-3">
                <div className="relative">
                  <Label className="text-xs">שם המוצר *</Label>
                  <Input
                    placeholder="התחילי להקליד..."
                    value={newInventoryItem.product_name}
                    onChange={(e) => {
                      setNewInventoryItem(prev => ({ ...prev, product_name: e.target.value }));
                      findProductSuggestions(e.target.value);
                    }}
                    className="h-8"
                  />
                  {productSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border shadow-lg max-h-48 overflow-y-auto">
                      {productSuggestions.map((suggestion, idx) => (
                        <div
                          key={idx}
                          className="p-2 hover:bg-stone-100 cursor-pointer text-sm"
                          onClick={() => selectProductSuggestion(suggestion)}
                        >
                          <div className="font-medium">{suggestion.product_name}</div>
                          <div className="text-xs text-stone-500">
                            עלות אחרונה: {suggestion.actual_cost_currency === 'USD' ? '$' : suggestion.actual_cost_currency === 'EUR' ? '€' : suggestion.actual_cost_currency === 'GBP' ? '£' : '₪'}
                            {suggestion.actual_cost_price}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">מק"ט</Label>
                    <Input
                      placeholder="אופציונלי"
                      value={newInventoryItem.product_sku}
                      onChange={(e) => setNewInventoryItem(prev => ({ ...prev, product_sku: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">כמות *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newInventoryItem.quantity}
                      onChange={(e) => setNewInventoryItem(prev => ({ ...prev, quantity: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">עלות בפועל *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newInventoryItem.actual_cost_price}
                      onChange={(e) => setNewInventoryItem(prev => ({ ...prev, actual_cost_price: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">מטבע</Label>
                    <Select
                      value={newInventoryItem.actual_cost_currency}
                      onValueChange={(v) => setNewInventoryItem(prev => ({ ...prev, actual_cost_currency: v }))}
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">צבע</Label>
                    <Input
                      placeholder="אופציונלי"
                      value={newInventoryItem.color}
                      onChange={(e) => setNewInventoryItem(prev => ({ ...prev, color: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">מידה</Label>
                    <Input
                      placeholder="אופציונלי"
                      value={newInventoryItem.size}
                      onChange={(e) => setNewInventoryItem(prev => ({ ...prev, size: e.target.value }))}
                      className="h-8"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">קישור למקור</Label>
                  <Input
                    placeholder="https://..."
                    value={newInventoryItem.source_url}
                    onChange={(e) => setNewInventoryItem(prev => ({ ...prev, source_url: e.target.value }))}
                    className="h-8"
                    dir="ltr"
                  />
                </div>

                <div>
                  <Label className="text-xs">הערות</Label>
                  <Input
                    placeholder="הערות נוספות..."
                    value={newInventoryItem.notes}
                    onChange={(e) => setNewInventoryItem(prev => ({ ...prev, notes: e.target.value }))}
                    className="h-8"
                  />
                </div>

                <Button
                  type="button"
                  onClick={addInventoryItemToBatch}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף לחבילה
                </Button>
              </div>
            )}

            {/* רשימת פריטי מלאי שנוספו */}
            {inventoryItems.length > 0 && !addingItemsToBatch && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200">
                <Label className="text-xs font-medium text-amber-800 mb-2 block">
                  פריטי מלאי שנוספו ({inventoryItems.length}):
                </Label>
                <div className="space-y-2">
                  {inventoryItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white border border-amber-200 text-sm">
                      <div className="flex-1">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-stone-500 mr-2">
                          ×{item.quantity} • {item.actual_cost_currency === 'USD' ? '$' : item.actual_cost_currency === 'EUR' ? '€' : item.actual_cost_currency === 'GBP' ? '£' : '₪'}
                          {item.actual_cost_price}
                        </span>
                      </div>
                      <button
                        onClick={() => removeInventoryItem(idx)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="mb-2 block">בחרי פריטים מהזמנות לקוחות ({selectedItems.length} נבחרו)</Label>
              <p className="text-xs text-stone-500 mb-2">💡 בחרי פריטים מהזמנות שונות שנשלחו יחד באותה חבילה</p>
              <div className="max-h-80 overflow-y-auto border p-2 space-y-3">
                {filteredOrders.map(order => {
                  const availableItems = (order.items || []).filter((item, idx) => {
                    // אם מוסיפים לחבילה קיימת, לא להציג פריטים שכבר שייכים לאותה חבילה
                    if (addingItemsToBatch) {
                      const itemBatch = getItemBatch(order.id, idx);
                      return !itemBatch || itemBatch.id !== addingItemsToBatch;
                    }
                    // אחרת, לא להציג פריטים שכבר משויכים לחבילה כלשהי
                    return !isItemLinkedToBatch(order.id, idx);
                  });
                  
                  if (availableItems.length === 0) return null;
                  
                  return (
                    <div key={order.id} className="border-b pb-2 last:border-b-0">
                      <div className="font-medium text-sm text-stone-700 mb-2 flex items-center gap-2">
                        <Badge variant="outline">#{order.order_number}</Badge>
                        <span>{order.customer_name}</span>
                        <Badge className="text-xs">{order.site?.toUpperCase()}</Badge>
                      </div>
                      <div className="space-y-1 mr-4">
                        {(order.items || []).map((item, idx) => {
                          // בדיקה אם הפריט זמין לבחירה
                          if (addingItemsToBatch) {
                            const itemBatch = getItemBatch(order.id, idx);
                            if (itemBatch && itemBatch.id === addingItemsToBatch) return null;
                          } else {
                            if (isItemLinkedToBatch(order.id, idx)) return null;
                          }
                          
                          const isSelected = isItemSelected(order.id, idx);
                          const itemBatch = getItemBatch(order.id, idx);
                          
                          return (
                            <div 
                              key={idx}
                              className={`flex items-center gap-2 p-2 hover:bg-stone-50 cursor-pointer text-sm ${isSelected ? 'bg-purple-50 border border-purple-200' : 'bg-stone-50'}`}
                              onClick={() => toggleItemSelection(order.id, idx, item)}
                            >
                              <Checkbox checked={isSelected} />
                              <div className="flex-1">
                                <span className="font-medium">{item.product_name}</span>
                                {(item.color || item.size) && (
                                  <span className="text-stone-500 mr-2">
                                    ({[item.color, item.size].filter(Boolean).join(' / ')})
                                  </span>
                                )}
                                <span className="text-stone-400 mr-2">×{item.quantity || 1}</span>
                                {itemBatch && itemBatch.id !== addingItemsToBatch && (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs mr-2">
                                    📦 {itemBatch.batch_name}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-stone-500">
                                {item.original_currency === 'USD' ? '$' : item.original_currency === 'EUR' ? '€' : item.original_currency === 'GBP' ? '£' : '₪'}
                                {item.original_price}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {selectedItems.length > 0 && (
                <div className="mt-2 p-2 bg-purple-50 border border-purple-200">
                  <p className="text-xs font-medium text-purple-800 mb-1">פריטים נבחרים:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedItems.map((si, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        #{si.orderNumber} - {si.item.product_name}
                        <button onClick={(e) => { e.stopPropagation(); toggleItemSelection(si.orderId, si.itemIndex, si.item); }} className="mr-1 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(selectedItems.length > 0 || inventoryItems.length > 0) && (addingItemsToBatch || newBatch.total_shipping_cost) && (
              <div className="bg-purple-50 p-3 border border-purple-200">
                <p className="text-sm text-purple-800">
                  💡 עלות משלוח לפריט: ₪{(
                    convertToILS(
                      Number(addingItemsToBatch ? batches.find(b => b.id === addingItemsToBatch)?.total_shipping_cost : newBatch.total_shipping_cost), 
                      addingItemsToBatch ? batches.find(b => b.id === addingItemsToBatch)?.shipping_currency : newBatch.shipping_currency
                    ) / ((addingItemsToBatch ? ((batches.find(b => b.id === addingItemsToBatch)?.item_links?.length || 0) + (batches.find(b => b.id === addingItemsToBatch)?.inventory_items?.length || 0)) : 0) + selectedItems.length + inventoryItems.length)
                  ).toFixed(0)}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => { 
              setShowBatchDialog(false); 
              setSelectedItems([]);
              setInventoryItems([]);
              setAddingItemsToBatch(null);
              setNewBatch({ batch_name: '', total_shipping_cost: '', shipping_currency: 'USD', notes: '' });
              setShowAddInventoryItem(false);
              setProductSuggestions([]);
            }}>
              ביטול
            </Button>
            <Button 
              onClick={async () => {
                if (addingItemsToBatch) {
                  // הוספת פריטים לחבילה קיימת
                  if (selectedItems.length === 0 && inventoryItems.length === 0) {
                    alert('יש לבחור לפחות פריט אחד (מהזמנה או מלאי)');
                    return;
                  }
                  setSaving(true);
                  try {
                    // עדכון החבילה עם הפריטים החדשים
                    const batch = batches.find(b => b.id === addingItemsToBatch);
                    if (batch) {
                      const currentLinks = batch.item_links || [];
                      const currentInventoryItems = batch.inventory_items || [];
                      const newLinks = selectedItems.map(i => ({
                        order_id: i.orderId,
                        item_index: i.itemIndex,
                        product_name: i.item.product_name
                      }));
                      const newInventoryItemsFormatted = inventoryItems.map(item => ({
                        ...item,
                        actual_cost_price: Number(item.actual_cost_price),
                        quantity: Number(item.quantity)
                      }));

                      await ShipmentBatch.update(addingItemsToBatch, { 
                        item_links: [...currentLinks, ...newLinks],
                        inventory_items: [...currentInventoryItems, ...newInventoryItemsFormatted]
                      });

                      // עדכון הפריטים בהזמנות
                      if (selectedItems.length > 0) {
                        const updatePromises = selectedItems.map(async (selectedItem) => {
                          const order = orders.find(o => o.id === selectedItem.orderId);
                          if (!order) return;
                          
                          const updatedItems = [...order.items];
                          updatedItems[selectedItem.itemIndex] = {
                            ...updatedItems[selectedItem.itemIndex],
                            shipment_batch_id: addingItemsToBatch
                          };
                          
                          await Order.update(order.id, { items: updatedItems });
                        });
                        
                        await Promise.all(updatePromises);
                      }

                      await loadOrders();
                    }
                    setShowBatchDialog(false);
                    setSelectedItems([]);
                    setInventoryItems([]);
                    setAddingItemsToBatch(null);
                  } catch (e) {
                    console.error('Error adding items to batch:', e);
                    alert('שגיאה בהוספת פריטים');
                  } finally {
                    setSaving(false);
                  }
                } else {
                  // יצירת חבילה חדשה
                  await handleCreateBatch();
                }
              }} 
              disabled={saving || (selectedItems.length === 0 && inventoryItems.length === 0)} 
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Plus className="w-4 h-4 ml-1" />}
              {addingItemsToBatch ? 'הוסף לחבילה' : 'יצירת חבילה'}
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