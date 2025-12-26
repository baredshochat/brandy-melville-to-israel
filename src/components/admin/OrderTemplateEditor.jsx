import React, { useState, useEffect } from "react";
import { OrderTemplate } from "@/entities/OrderTemplate";
import { getOrdersForDocuments } from "../services/OrdersService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Save, FileText, Eye, Download, Search, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

// Sample data for preview
const SAMPLE_ORDER_DATA = {
  order_number: "BM1234567890",
  created_date: new Date().toLocaleDateString('he-IL'),
  customer_name: "שרה כהן",
  customer_email: "sarah@example.com",
  customer_phone: "050-1234567",
  shipping_address: "רחוב הרצל 123",
  city: "תל אביב",
  total_price_ils: 450,
  items: [
    { product_name: "חולצת ברנדי קלאסית", color: "לבן", size: "S", quantity: 1, customer_price_ils: 180 },
    { product_name: "ג'ינס סקיני", color: "כחול", size: "M", quantity: 2, customer_price_ils: 270 }
  ],
  subtotal: 380,
  shipping_cost: 35,
  vat: 70,
  total: 450
};

// Document blocks that can be toggled
const DOCUMENT_BLOCKS = [
  {
    id: 'header',
    label: 'כותרת ראשית',
    description: 'שם העסק ולוגו',
    defaultEnabled: true,
    html: `
      <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">Brandy Melville to Israel</h1>
        <p style="margin: 5px 0 0 0; color: #666;">מסמך הזמנה</p>
      </div>
    `
  },
  {
    id: 'order_info',
    label: 'פרטי הזמנה',
    description: 'מספר הזמנה ותאריך',
    defaultEnabled: true,
    html: `
      <div style="margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <div><strong>מספר הזמנה:</strong> {{order_number}}</div>
          <div><strong>תאריך:</strong> {{created_date}}</div>
        </div>
      </div>
    `
  },
  {
    id: 'customer_info',
    label: 'פרטי לקוחה',
    description: 'שם, אימייל, טלפון וכתובת',
    defaultEnabled: true,
    html: `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">פרטי לקוחה</h2>
        <div style="margin-top: 10px;">
          <div><strong>שם:</strong> {{customer_name}}</div>
          <div><strong>אימייל:</strong> {{customer_email}}</div>
          <div><strong>טלפון:</strong> {{customer_phone}}</div>
          <div><strong>כתובת משלוח:</strong> {{shipping_address}}, {{city}}</div>
        </div>
      </div>
    `
  },
  {
    id: 'items_table',
    label: 'טבלת פריטים',
    description: 'רשימת המוצרים בהזמנה',
    defaultEnabled: true,
    html: `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">פריטים בהזמנה</h2>
        {{items_table}}
      </div>
    `
  },
  {
    id: 'payment_summary',
    label: 'סיכום תשלום',
    description: 'פירוט מחירים וסה״כ',
    defaultEnabled: true,
    html: `
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">סיכום תשלום</h2>
        <div style="margin-top: 10px;">
          <div style="display: flex; justify-content: space-between;"><span>סכום ביניים:</span><span>₪{{subtotal}}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>משלוח:</span><span>₪{{shipping_cost}}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>מע״מ (18%):</span><span>₪{{vat}}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000;">
            <span>סה״כ לתשלום:</span><span>₪{{total}}</span>
          </div>
        </div>
      </div>
    `
  },
  {
    id: 'footer',
    label: 'סיום ותודה',
    description: 'הודעת תודה בתחתית',
    defaultEnabled: true,
    html: `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 12px;">
        <p>תודה שבחרת בנו! 💖</p>
        <p>Brandy Melville to Israel - הדרך הקלה להזמין ברנדי</p>
      </div>
    `
  }
];



export default function OrderTemplateEditor() {
  const [template, setTemplate] = useState(null);
  const [enabledBlocks, setEnabledBlocks] = useState(() => 
    DOCUMENT_BLOCKS.reduce((acc, block) => ({ ...acc, [block.id]: block.defaultEnabled }), {})
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('editor');
  const [orders, setOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    loadTemplate();
    loadOrders();
  }, []);

  const loadTemplate = async () => {
    setLoading(true);
    try {
      const templates = await OrderTemplate.list();
      if (templates && templates.length > 0) {
        setTemplate(templates[0]);
        // Try to parse enabled blocks from content
        if (templates[0].content) {
          try {
            const parsed = JSON.parse(templates[0].content);
            if (parsed.enabledBlocks) {
              setEnabledBlocks(parsed.enabledBlocks);
            }
          } catch {
            // If not JSON, it's old format - enable all blocks
            setEnabledBlocks(DOCUMENT_BLOCKS.reduce((acc, block) => ({ ...acc, [block.id]: true }), {}));
          }
        }
      } else {
        // Create default template
        const defaultBlocks = DOCUMENT_BLOCKS.reduce((acc, block) => ({ ...acc, [block.id]: block.defaultEnabled }), {});
        const newTemplate = await OrderTemplate.create({
          template_name: "מסמך הזמנה ברירת מחדל",
          content: JSON.stringify({ enabledBlocks: defaultBlocks }),
          is_active: true
        });
        setTemplate(newTemplate);
        setEnabledBlocks(defaultBlocks);
      }
    } catch (error) {
      console.error("Error loading template:", error);
    } finally {
      setLoading(false);
    }
  };

const loadOrders = async () => {
  try {
    const data = await getOrdersForDocuments();

    const allowedStatuses = [
      "pending",
      "ordered",
      "warehouse",
      "shipping_to_israel",
      "paid"
    ];

    const receivedOrders = (data || []).filter(order =>
      allowedStatuses.includes(order.status)
    );

    setOrders(receivedOrders);
  } catch (error) {
    console.error("Error loading orders:", error);
  }
};


  const handleSave = async () => {
    setSaving(true);
    try {
      const content = JSON.stringify({ enabledBlocks });
      if (template && template.id) {
        await OrderTemplate.update(template.id, { content });
      } else {
        const newTemplate = await OrderTemplate.create({
          template_name: "מסמך הזמנה ברירת מחדל",
          content,
          is_active: true
        });
        setTemplate(newTemplate);
      }
      alert('✅ הטמפלייט נשמר בהצלחה!');
    } catch (error) {
      console.error("Error saving template:", error);
      alert('שגיאה בשמירת הטמפלייט');
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = (blockId) => {
    setEnabledBlocks(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const buildDocumentHTML = (blocks = enabledBlocks) => {
    const enabledBlocksHTML = DOCUMENT_BLOCKS
      .filter(block => blocks[block.id])
      .map(block => block.html)
      .join('\n');
    
    return `
      <div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif; direction: rtl;">
        ${enabledBlocksHTML}
      </div>
    `;
  };

  const handleDownloadPdfs = async () => {
    if (selectedOrderIds.size === 0) {
      alert('❌ אנא בחרי לפחות הזמנה אחת להפקה');
      return;
    }

    setDownloadingPdf(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      const response = await base44.functions.invoke('generateOrderPdf', { 
        order_ids: Array.from(selectedOrderIds) 
      });
      
      // Check if response is a zip or pdf
      const contentType = selectedOrderIds.size > 1 ? 'application/zip' : 'application/pdf';
      const filename = selectedOrderIds.size > 1 
        ? `orders_${new Date().toISOString().split('T')[0]}.zip`
        : `order.pdf`;
      
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      // Success message
      const message = selectedOrderIds.size === 1 
        ? '✅ מסמך PDF הורד בהצלחה!'
        : `✅ ${selectedOrderIds.size} מסמכי PDF הורדו בהצלחה (בתוך קובץ ZIP)`;
      alert(message);
      
      setSelectedOrderIds(new Set());
    } catch (error) {
      console.error('Error downloading PDFs:', error);
      alert('❌ שגיאה בהורדת הקבצים. נסי שוב.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const toggleSelectAll = () => {
    const filtered = filteredOrders();
    if (selectedOrderIds.size === filtered.length && filtered.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(filtered.map(o => o.id)));
    }
  };

  const filteredOrders = () => {
    return orders.filter(order => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        order.order_number?.toLowerCase().includes(query) ||
        order.customer_name?.toLowerCase().includes(query) ||
        order.customer_email?.toLowerCase().includes(query)
      );
    });
  };

  const processPreview = (html) => {
    let processed = html;
    
    // Replace placeholders with sample data
    processed = processed.replace(/{{order_number}}/g, SAMPLE_ORDER_DATA.order_number);
    processed = processed.replace(/{{created_date}}/g, SAMPLE_ORDER_DATA.created_date);
    processed = processed.replace(/{{customer_name}}/g, SAMPLE_ORDER_DATA.customer_name);
    processed = processed.replace(/{{customer_email}}/g, SAMPLE_ORDER_DATA.customer_email);
    processed = processed.replace(/{{customer_phone}}/g, SAMPLE_ORDER_DATA.customer_phone);
    processed = processed.replace(/{{shipping_address}}/g, SAMPLE_ORDER_DATA.shipping_address);
    processed = processed.replace(/{{city}}/g, SAMPLE_ORDER_DATA.city);
    processed = processed.replace(/{{subtotal}}/g, SAMPLE_ORDER_DATA.subtotal);
    processed = processed.replace(/{{shipping_cost}}/g, SAMPLE_ORDER_DATA.shipping_cost);
    processed = processed.replace(/{{vat}}/g, SAMPLE_ORDER_DATA.vat);
    processed = processed.replace(/{{total}}/g, SAMPLE_ORDER_DATA.total);

    // Process items table
    if (processed.includes('{{items_table}}')) {
      const itemsTableHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">מוצר</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">צבע</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">מידה</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">כמות</th>
              <th style="text-align: right; padding: 8px; border: 1px solid #ddd;">מחיר</th>
            </tr>
          </thead>
          <tbody>
            ${SAMPLE_ORDER_DATA.items.map(item => `
              <tr>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.product_name}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.color}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.size}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
                <td style="text-align: right; padding: 8px; border: 1px solid #ddd;">₪${item.customer_price_ils}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      processed = processed.replace(/{{items_table}}/g, itemsTableHtml);
    }

    return processed;
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ]
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">עריכת מסמך הזמנה</h2>
          <p className="text-stone-600 mt-1">בחרי אילו קטעים יופיעו במסמך PDF</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 text-lg px-6 py-6"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-5 h-5 ml-2" />
              שמור שינויים
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="editor">
            <FileText className="w-4 h-4 ml-2" />
            בחירת קטעים
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 ml-2" />
            תצוגה מקדימה
          </TabsTrigger>
          <TabsTrigger value="generate">
            <Download className="w-4 h-4 ml-2" />
            הפקת מסמכים
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-stone-900 mb-2 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              איך זה עובד?
            </h3>
            <p className="text-stone-700">
              סמני V ליד כל קטע שאת רוצה שיופיע במסמך ההזמנה. כל קטע שלא מסומן פשוט לא יופיע במסמך הסופי.
            </p>
          </div>

          <div className="grid gap-4">
            {DOCUMENT_BLOCKS.map((block, index) => (
              <Card 
                key={block.id}
                className={`transition-all cursor-pointer hover:shadow-lg ${
                  enabledBlocks[block.id] 
                    ? 'border-2 border-green-400 bg-green-50' 
                    : 'border-2 border-stone-200 bg-white opacity-60'
                }`}
                onClick={() => toggleBlock(block.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <Checkbox
                        checked={enabledBlocks[block.id]}
                        onCheckedChange={() => toggleBlock(block.id)}
                        className="w-6 h-6"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <h3 className="text-xl font-bold text-stone-900">
                          {block.label}
                        </h3>
                        {enabledBlocks[block.id] && (
                          <Badge className="bg-green-600 text-white">
                            מופיע במסמך ✓
                          </Badge>
                        )}
                      </div>
                      <p className="text-stone-600 text-sm">
                        {block.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 mt-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <h4 className="font-bold text-amber-900 mb-1">טיפ מקצועי</h4>
                <p className="text-sm text-amber-800">
                  הקטעים יופיעו במסמך בדיוק לפי הסדר הזה. אם את רוצה מסמך מינימליסטי, בטלי את הסימון של קטעים מיותרים!
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>תצוגה מקדימה (עם נתוני דוגמה)</CardTitle>
              <p className="text-sm text-stone-500 mt-2">
                כך המסמך ייראה עם הקטעים שבחרת • {Object.values(enabledBlocks).filter(Boolean).length} מתוך {DOCUMENT_BLOCKS.length} קטעים מופיעים
              </p>
            </CardHeader>
            <CardContent>
              <div 
                className="border-2 border-stone-300 rounded-lg p-8 bg-white shadow-inner"
                style={{ minHeight: '500px' }}
                dangerouslySetInnerHTML={{ __html: processPreview(buildDocumentHTML()) }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>הפקת מסמכים להזמנות</span>
                {selectedOrderIds.size > 0 && (
                  <Badge className="bg-green-100 text-green-800 text-base">
                    {selectedOrderIds.size} הזמנות נבחרו
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-5">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  איך זה עובד?
                </h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p>✅ <strong>סמני הזמנות</strong> מהטבלה למטה</p>
                  <p>✅ <strong>לחצי "הפק מסמכים"</strong></p>
                  <p>✅ <strong>קבלי קובץ PDF</strong> (או ZIP עם מספר PDFs)</p>
                </div>
                <div className="mt-3 pt-3 border-t border-blue-300 text-xs text-blue-700">
                  💡 כל PDF מכיל את המסמך שעיצבת עם הנתונים המדויקים של ההזמנה
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute right-3 top-3 w-4 h-4 text-stone-400" />
                    <Input
                      placeholder="חיפוש הזמנה..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    {selectedOrderIds.size > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedOrderIds(new Set())}
                        className="border-stone-300"
                      >
                        ✕ נקה הכל
                      </Button>
                    )}
                    <Button 
                      onClick={handleDownloadPdfs}
                      disabled={selectedOrderIds.size === 0 || downloadingPdf}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6"
                      size="lg"
                    >
                      {downloadingPdf ? (
                        <>
                          <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                          מייצר מסמכים...
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5 ml-2" />
                          {selectedOrderIds.size === 0 ? 'הפק מסמכים' : `הפק ${selectedOrderIds.size} מסמכים`}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {selectedOrderIds.size > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    ✓ נבחרו {selectedOrderIds.size} הזמנות • 
                    {selectedOrderIds.size === 1 ? ' יורד קובץ PDF אחד' : ` יורד קובץ ZIP עם ${selectedOrderIds.size} קבצי PDF`}
                  </div>
                )}
              </div>

              <div className="border-2 border-stone-200 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-stone-100 border-b-2 border-stone-200">
                      <tr>
                        <th className="p-3 text-right w-12">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={filteredOrders().length > 0 && selectedOrderIds.size === filteredOrders().length}
                              onCheckedChange={toggleSelectAll}
                            />
                            <span className="text-xs text-stone-500 hidden sm:inline">הכל</span>
                          </div>
                        </th>
                        <th className="text-right p-3 font-semibold">מס׳ הזמנה</th>
                        <th className="text-right p-3 font-semibold">לקוח</th>
                        <th className="text-right p-3 font-semibold">תאריך</th>
                        <th className="text-right p-3 font-semibold">סכום</th>
                        <th className="text-right p-3 font-semibold">פריטים</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders().map(order => (
                        <tr 
                          key={order.id} 
                          className={`border-b transition-colors ${
                            selectedOrderIds.has(order.id) 
                              ? 'bg-green-50 hover:bg-green-100' 
                              : 'hover:bg-stone-50'
                          }`}
                        >
                          <td className="p-3">
                            <Checkbox
                              checked={selectedOrderIds.has(order.id)}
                              onCheckedChange={(checked) => {
                                setSelectedOrderIds(prev => {
                                  const next = new Set(prev);
                                  if (checked) {
                                    next.add(order.id);
                                  } else {
                                    next.delete(order.id);
                                  }
                                  return next;
                                });
                              }}
                            />
                          </td>
                          <td className="p-3">
                            <code className="bg-stone-100 px-2 py-1 rounded text-xs font-mono">
                              {order.order_number}
                            </code>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-stone-900">{order.customer_name}</div>
                            <div className="text-xs text-stone-500">{order.customer_email}</div>
                          </td>
                          <td className="p-3 text-xs text-stone-600">
                            {order.created_date ? new Date(order.created_date).toLocaleDateString('he-IL') : '—'}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-stone-900">
                              ₪{(order.total_price_ils || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {order.items?.length || 0} פריטים
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {filteredOrders().length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-12 text-center">
                            <Package className="w-12 h-12 mx-auto mb-3 text-stone-300" />
                            <p className="text-stone-500 font-medium">לא נמצאו הזמנות</p>
                            <p className="text-xs text-stone-400 mt-1">נסי לשנות את מילות החיפוש</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}