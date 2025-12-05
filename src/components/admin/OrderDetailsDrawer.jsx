import React, { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { InvokeLLM } from "@/integrations/Core";
import {
  Package,
  User,
  Truck,
  Calculator,
  Clock,
  MapPin,
  Mail,
  Phone,
  Copy,
  Edit,
  Save,
  X,
  Info,
  AlertTriangle,
  BarChart3,
  ExternalLink,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';

export default function OrderDetailsDrawer({ order, open, onOpenChange, onUpdateOrder, onDeleteOrder, statusConfig }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editingItems, setEditingItems] = useState([]);
  const [savingItems, setSavingItems] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(null); // index of item being fetched

  if (!order) return null;

  const fetchProductFromUrl = async (index, url) => {
    if (!url || !url.includes('brandymelville')) return;
    
    setFetchingProduct(index);
    try {
      const siteMatch = url.match(/(us|eu|uk)\.brandymelville/);
      const site = siteMatch ? siteMatch[1] : 'eu';
      const currency = site === 'us' ? 'USD' : site === 'uk' ? 'GBP' : 'EUR';

      const raw = await InvokeLLM({
        prompt: `Extract product data from this Brandy Melville URL: ${url}

EXTRACT:
- product_name: The product name (from og:title or h1)
- product_sku: The exact SKU/product code if found
- price: The numeric price only
- available_colors: Array of color options
- available_sizes: Array of size options

Return valid JSON only.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            product_sku: { type: ["string", "null"] },
            price: { type: "number" },
            available_colors: { type: "array", items: { type: "string" } },
            available_sizes: { type: "array", items: { type: "string" } }
          },
          required: ["product_name", "price"]
        }
      });

      const result = typeof raw === 'string' ? JSON.parse(raw) : (raw?.data || raw);
      
      if (result?.product_name) {
        setEditingItems(prev => prev.map((item, i) => 
          i === index ? {
            ...item,
            product_name: result.product_name || item.product_name,
            product_sku: result.product_sku || item.product_sku,
            original_price: result.price || item.original_price,
            original_currency: currency,
            available_colors: result.available_colors || [],
            available_sizes: result.available_sizes || []
          } : item
        ));
      }
    } catch (e) {
      console.error('Error fetching product:', e);
      alert('לא הצלחנו לשלוף את פרטי המוצר');
    } finally {
      setFetchingProduct(null);
    }
  };

  const handleEdit = () => {
    setEditData({
      status: order.status,
      payment_status: order.payment_status || 'pending',
      internal_notes: order.internal_notes || '',
      customer_name: order.customer_name || '',
      customer_email: order.customer_email || '',
      customer_phone: order.customer_phone || '',
      shipping_address: order.shipping_address || '',
      city: order.city || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    await onUpdateOrder(order.id, editData);
    setIsEditing(false);
  };

  const handleEditItems = () => {
    setEditingItems((order.items || []).map(item => ({ ...item })));
    setIsEditingItems(true);
  };

  const handleSaveItems = async () => {
    setSavingItems(true);
    try {
      await onUpdateOrder(order.id, { items: editingItems });
      setIsEditingItems(false);
    } catch (e) {
      console.error('Error saving items:', e);
      alert('שגיאה בשמירה');
    } finally {
      setSavingItems(false);
    }
  };

  const updateItem = (index, field, value) => {
    setEditingItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addNewItem = () => {
    setEditingItems(prev => [...prev, {
      product_name: '',
      product_url: '',
      product_sku: '',
      color: '',
      size: '',
      quantity: 1,
      original_price: '',
      original_currency: 'EUR'
    }]);
  };

  const removeItem = (index) => {
    setEditingItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleDelete = async () => {
    await onDeleteOrder(order.id);
    setShowDeleteConfirm(false); // Close dialog after action
    onOpenChange(false); // Close the drawer after deletion
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const calculateETA = (status) => {
    // Mock ETA calculation based on status
    const etaDays = {
      pending: 21,
      ordered: 18,
      warehouse: 14,
      shipping_to_israel: 10,
      in_israel: 5,
      shipping_to_customer: 2,
      delivered: 0
    };
    return etaDays[status] || 0;
  };

  const renderPricingBreakdown = () => {
    if (!order.calculatedPricing?.breakdown) {
      return <div className="text-sm text-stone-500">נתוני תמחור לא זמינים</div>;
    }

    const breakdown = order.calculatedPricing.breakdown;
    const netProfit = breakdown.net_profit_ils;
    const marginPct = breakdown.profit_pct_of_final * 100;

    return (
      <div className="space-y-4">
        <div className="bg-stone-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">מחיר סופי</h4>
            <span className="text-2xl font-bold">₪{order.calculatedPricing.finalPriceILS?.toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-stone-600">רווח נטו</span>
              <div className="font-semibold text-green-600">₪{netProfit?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div>
              <span className="text-sm text-stone-600">מרווח</span>
              <div className="font-semibold">{marginPct?.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: 'מחיר מוצרים בשקלים', value: breakdown.baseILS, key: 'baseILS' },
            { label: 'עמלת המרת מטבע', value: breakdown.fxCost, key: 'fxCost' },
            { label: 'משלוח בינלאומי', value: breakdown.intlShip, key: 'intlShip' },
            { label: 'מכס ואגרות', value: breakdown.customsILS, key: 'customsILS' },
            { label: 'מע״מ יבוא', value: breakdown.importVAT_ILS, key: 'importVAT' },
            { label: 'עמלות קבועות', value: breakdown.fixed_fees_ils, key: 'fixedFees' },
            { label: 'באפר ביטחון', value: breakdown.bufferILS, key: 'buffer' },
            { label: 'עמלות סליקה', value: breakdown.processor_fees, key: 'processorFees' },
            { label: 'משלוח פנים ארצי', value: breakdown.domestic_charge_to_customer, key: 'domestic' }
          ].map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.label}</span>
                {item.value > 0 && (
                  <button className="text-stone-400 hover:text-stone-600">
                    <Info className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="font-medium">₪{item.value?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[600px] sm-[800px] overflow-y-auto">
        <SheetHeader className="border-b pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <SheetTitle className="flex items-center gap-3">
                הזמנה #{order.order_number}
                <button onClick={() => copyToClipboard(order.order_number)}>
                  <Copy className="w-4 h-4 text-stone-400 hover:text-stone-600" />
                </button>
              </SheetTitle>
              <SheetDescription>
                נוצרה ב-{format(new Date(order.created_date), "dd/MM/yyyy HH:mm")}
              </SheetDescription>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button onClick={handleEdit} size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    עריכה
                  </Button>
                  <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        מחק הזמנה
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                        <AlertDialogDescription>
                          פעולה זו אינה הפיכה ותמחק לצמיתות את הזמנה מספר {' '}
                          <span className="font-bold">{order.order_number}</span>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
                          מחק
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-2" />
                    ביטול
                  </Button>
                  <Button onClick={handleSave} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    שמירה
                  </Button>
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">סקירה</TabsTrigger>
            <TabsTrigger value="items">פריטים</TabsTrigger>
            <TabsTrigger value="logistics">לוגיסטיקה</TabsTrigger>
            <TabsTrigger value="pricing">תמחור</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  פרטי לקוח
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>שם מלא</Label>
                        <Input
                          value={editData.customer_name}
                          onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                          placeholder="שם הלקוח"
                        />
                      </div>
                      <div>
                        <Label>אימייל</Label>
                        <Input
                          type="email"
                          value={editData.customer_email}
                          onChange={(e) => setEditData({ ...editData, customer_email: e.target.value })}
                          placeholder="אימייל"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label>טלפון</Label>
                        <Input
                          value={editData.customer_phone}
                          onChange={(e) => setEditData({ ...editData, customer_phone: e.target.value })}
                          placeholder="טלפון"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label>עיר</Label>
                        <Input
                          value={editData.city}
                          onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                          placeholder="עיר"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>כתובת משלוח</Label>
                      <Input
                        value={editData.shipping_address}
                        onChange={(e) => setEditData({ ...editData, shipping_address: e.target.value })}
                        placeholder="רחוב, מספר בית, דירה"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>שם מלא</Label>
                        <div className="flex items-center gap-2">
                          <span>{order.customer_name}</span>
                          <button onClick={() => copyToClipboard(order.customer_name)}>
                            <Copy className="w-3 h-3 text-stone-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <Label>אימייל</Label>
                        <div className="flex items-center gap-2">
                          <span>{order.customer_email}</span>
                          <button onClick={() => copyToClipboard(order.customer_email)}>
                            <Copy className="w-3 h-3 text-stone-400" />
                          </button>
                          <a href={`mailto:${order.customer_email}`}>
                            <Mail className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                          </a>
                        </div>
                      </div>
                      <div>
                        <Label>טלפון</Label>
                        <div className="flex items-center gap-2">
                          <span>{order.customer_phone}</span>
                          {order.customer_phone && (
                            <a href={`tel:${order.customer_phone}`}>
                              <Phone className="w-4 h-4 text-green-500 hover:text-green-700" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label>כתובת משלוח</Label>
                      <div className="flex items-start gap-2">
                        <div>
                          <div>{order.shipping_address}</div>
                          <div>{order.city}</div>
                        </div>
                        <MapPin className="w-4 h-4 text-stone-400 mt-0.5" />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Order Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  סטטוס הזמנה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>סטטוס נוכחי</Label>
                    {isEditing ? (
                      <Select value={editData.status} onValueChange={(value) => setEditData({ ...editData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>{config.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={statusConfig[order.status]?.style}>
                        {statusConfig[order.status]?.label}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <Label>זמן הגעה משוער</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-stone-400" />
                      <span>{calculateETA(order.status)} ימים</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>הערות פנימיות</Label>
                  {isEditing ? (
                    <Textarea
                      value={editData.internal_notes}
                      onChange={(e) => setEditData({ ...editData, internal_notes: e.target.value })}
                      placeholder="הערות למנהל..."
                    />
                  ) : (
                    <div className="p-3 bg-stone-50 rounded border min-h-[60px]">
                      {order.internal_notes || "אין הערות"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>פריטים בהזמנה ({isEditingItems ? editingItems.length : (order.items?.length || 0)})</CardTitle>
                {!isEditingItems ? (
                  <Button size="sm" variant="outline" onClick={handleEditItems}>
                    <Edit className="w-4 h-4 ml-1" />
                    עריכת פריטים
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsEditingItems(false)}>
                      <X className="w-4 h-4 ml-1" />
                      ביטול
                    </Button>
                    <Button size="sm" onClick={handleSaveItems} disabled={savingItems}>
                      {savingItems ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
                      שמירה
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isEditingItems ? (
                  <div className="space-y-4">
                    {editingItems.map((item, index) => (
                      <div key={index} className="p-4 bg-stone-50 rounded-lg border space-y-3">
                        <div className="flex justify-between items-start">
                          <Input
                            placeholder="שם המוצר"
                            value={item.product_name || ''}
                            onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                            className="flex-1 font-medium"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 mr-2"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* קישור למוצר */}
                        <div className="flex gap-2 items-center">
                          <div className="flex-1">
                            <Label className="text-xs">קישור למוצר</Label>
                            <Input
                              placeholder="הדביקי קישור למוצר..."
                              value={item.product_url || ''}
                              onChange={(e) => updateItem(index, 'product_url', e.target.value)}
                              onBlur={(e) => {
                                const url = e.target.value;
                                if (url && url.includes('brandymelville') && !item.product_name) {
                                  fetchProductFromUrl(index, url);
                                }
                              }}
                              className="text-xs"
                              dir="ltr"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 mt-5"
                            onClick={() => fetchProductFromUrl(index, item.product_url)}
                            disabled={!item.product_url || fetchingProduct === index}
                            title="שלוף פרטי מוצר"
                          >
                            {fetchingProduct === index ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              "שלוף"
                            )}
                          </Button>
                          {item.product_url && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 mt-5"
                                onClick={() => {
                                  navigator.clipboard.writeText(item.product_url);
                                  alert('הקישור הועתק!');
                                }}
                                title="העתק קישור"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <a href={item.product_url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 mt-5" title="פתח קישור">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </a>
                            </>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <Label className="text-xs">SKU</Label>
                            <Input
                              placeholder="מק״ט"
                              value={item.product_sku || ''}
                              onChange={(e) => updateItem(index, 'product_sku', e.target.value)}
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">צבע</Label>
                            <Input
                              placeholder="צבע"
                              value={item.color || ''}
                              onChange={(e) => updateItem(index, 'color', e.target.value)}
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">מידה</Label>
                            <Input
                              placeholder="מידה"
                              value={item.size || ''}
                              onChange={(e) => updateItem(index, 'size', e.target.value)}
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">כמות</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity || 1}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">מחיר</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.original_price || ''}
                              onChange={(e) => updateItem(index, 'original_price', e.target.value)}
                            />
                          </div>
                          <div className="w-24">
                            <Label className="text-xs">מטבע</Label>
                            <Select 
                              value={item.original_currency || 'EUR'} 
                              onValueChange={(v) => updateItem(index, 'original_currency', v)}
                            >
                              <SelectTrigger>
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
                      </div>
                    ))}

                    <Button variant="outline" onClick={addNewItem} className="w-full">
                      <Plus className="w-4 h-4 ml-1" />
                      הוסף פריט חדש
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex justify-between items-start p-4 bg-stone-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.product_name}</h4>
                          <div className="text-sm text-stone-600 space-y-1 mt-1">
                            <div>SKU: {item.product_sku}</div>
                            <div>צבע: {item.color} | מידה: {item.size}</div>
                            <div>כמות: {item.quantity}</div>
                          </div>
                          {item.product_url && (
                            <div className="flex items-center gap-2 mt-2">
                              <a
                                href={item.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                צפה במוצר
                              </a>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(item.product_url);
                                  alert('הקישור הועתק!');
                                }}
                                className="text-stone-400 hover:text-stone-600"
                                title="העתק קישור"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{item.original_currency} {item.original_price}</div>
                          <div className="text-sm text-stone-600">ליח׳</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logistics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  פרטי לוגיסטיקה
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>משקל כולל</Label>
                    <span>{order.total_weight_kg?.toFixed(2)} ק״ג</span>
                  </div>
                  <div>
                    <Label>אתר מקור</Label>
                    <span>{order.site?.toUpperCase()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  פירוט תמחור מלא
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderPricingBreakdown()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}