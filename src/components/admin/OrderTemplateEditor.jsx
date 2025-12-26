import React, { useState, useEffect } from "react";
import { OrderTemplate } from "@/entities/OrderTemplate";
import { Order } from "@/entities/Order";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Save, FileText, Eye, Download, Search } from "lucide-react";
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

const DEFAULT_TEMPLATE = `
<div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif; direction: rtl;">
  <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">Brandy Melville to Israel</h1>
    <p style="margin: 5px 0 0 0; color: #666;">מסמך הזמנה</p>
  </div>

  <div style="margin-bottom: 30px;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <div><strong>מספר הזמנה:</strong> {{order_number}}</div>
      <div><strong>תאריך:</strong> {{created_date}}</div>
    </div>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">פרטי לקוחה</h2>
    <div style="margin-top: 10px;">
      <div><strong>שם:</strong> {{customer_name}}</div>
      <div><strong>אימייל:</strong> {{customer_email}}</div>
      <div><strong>טלפון:</strong> {{customer_phone}}</div>
      <div><strong>כתובת משלוח:</strong> {{shipping_address}}, {{city}}</div>
    </div>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">פריטים בהזמנה</h2>
    {{items_table}}
  </div>

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

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center; color: #666; font-size: 12px;">
    <p>תודה שבחרת בנו! 💖</p>
    <p>Brandy Melville to Israel - הדרך הקלה להזמין ברנדי</p>
  </div>
</div>
`;

export default function OrderTemplateEditor() {
  const [template, setTemplate] = useState(null);
  const [content, setContent] = useState('');
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
        // Use the first (and only) template
        setTemplate(templates[0]);
        setContent(templates[0].content || DEFAULT_TEMPLATE);
      } else {
        // Create default template
        const newTemplate = await OrderTemplate.create({
          template_name: "מסמך הזמנה ברירת מחדל",
          content: DEFAULT_TEMPLATE,
          is_active: true
        });
        setTemplate(newTemplate);
        setContent(DEFAULT_TEMPLATE);
      }
    } catch (error) {
      console.error("Error loading template:", error);
      setContent(DEFAULT_TEMPLATE);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await Order.filter({ is_deleted: false, payment_status: 'completed' });
      setOrders(data || []);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
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

  const handleDownloadPdfs = async () => {
    if (selectedOrderIds.size === 0) {
      alert('אנא בחרי לפחות הזמנה אחת');
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
      
      setSelectedOrderIds(new Set());
    } catch (error) {
      console.error('Error downloading PDFs:', error);
      alert('שגיאה בהורדת הקבצים');
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
    
    // Replace all placeholders with sample data
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
    processed = processed.replace(/{{total_price_ils}}/g, SAMPLE_ORDER_DATA.total_price_ils);

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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">שדות דינמיים זמינים:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
          <code>{'{{order_number}}'}</code>
          <code>{'{{created_date}}'}</code>
          <code>{'{{customer_name}}'}</code>
          <code>{'{{customer_email}}'}</code>
          <code>{'{{customer_phone}}'}</code>
          <code>{'{{shipping_address}}'}</code>
          <code>{'{{city}}'}</code>
          <code>{'{{items_table}}'}</code>
          <code>{'{{subtotal}}'}</code>
          <code>{'{{shipping_cost}}'}</code>
          <code>{'{{vat}}'}</code>
          <code>{'{{total}}'}</code>
          <code>{'{{total_price_ils}}'}</code>
        </div>
        <p className="text-xs text-blue-700 mt-3">כל שדה הוא אופציונלי - אם תמחקי אותו, הוא פשוט לא יופיע במסמך.</p>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-900">עריכת מסמך הזמנה</h2>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-green-600 hover:bg-green-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              שמור טמפלייט
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full md:w-auto">
          <TabsTrigger value="editor">
            <FileText className="w-4 h-4 ml-2" />
            עיצוב מסמך
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

        <TabsContent value="editor">
          <Card>
            <CardHeader>
              <CardTitle>עורך מסמך</CardTitle>
            </CardHeader>
            <CardContent>
              <ReactQuill
                value={content}
                onChange={setContent}
                modules={modules}
                theme="snow"
                style={{ minHeight: '500px' }}
                placeholder="הכנס את תוכן מסמך ההזמנה כאן..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>תצוגה מקדימה (עם נתוני דוגמה)</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="border border-stone-300 p-8 bg-white"
                style={{ minHeight: '500px' }}
                dangerouslySetInnerHTML={{ __html: processPreview(content) }}
              />
              <p className="text-sm text-stone-500 mt-4 text-center">
                זוהי תצוגה מקדימה עם נתוני דוגמה. ה-PDF האמיתי יכיל את הנתונים מההזמנה הספציפית.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>הפקת מסמכים להזמנות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
                <p className="text-sm text-stone-700 mb-2">
                  <strong>בחרי הזמנות:</strong> סמני את ההזמנות שברצונך להפיק עבורן מסמכי PDF
                </p>
                <p className="text-xs text-stone-500">
                  • הזמנה בודדת = קובץ PDF אחד<br/>
                  • מספר הזמנות = קובץ ZIP עם PDF נפרד לכל הזמנה
                </p>
              </div>

              <div className="flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute right-3 top-3 w-4 h-4 text-stone-400" />
                  <Input
                    placeholder="חיפוש לפי מספר הזמנה, שם לקוח או אימייל..."
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
                    >
                      נקה בחירה ({selectedOrderIds.size})
                    </Button>
                  )}
                  <Button 
                    onClick={handleDownloadPdfs}
                    disabled={selectedOrderIds.size === 0 || downloadingPdf}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {downloadingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        מפיק...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 ml-2" />
                        הפק מסמכים ({selectedOrderIds.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-100 border-b">
                    <tr>
                      <th className="p-3 text-right w-12">
                        <Checkbox
                          checked={filteredOrders().length > 0 && selectedOrderIds.size === filteredOrders().length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="text-right p-3">מס׳ הזמנה</th>
                      <th className="text-right p-3">לקוח</th>
                      <th className="text-right p-3">תאריך</th>
                      <th className="text-right p-3">סכום</th>
                      <th className="text-right p-3">פריטים</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders().map(order => (
                      <tr key={order.id} className="border-b hover:bg-stone-50">
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
                        <td className="p-3 font-mono text-xs">{order.order_number}</td>
                        <td className="p-3">
                          <div className="font-medium">{order.customer_name}</div>
                          <div className="text-xs text-stone-500">{order.customer_email}</div>
                        </td>
                        <td className="p-3 text-xs">
                          {order.created_date ? new Date(order.created_date).toLocaleDateString('he-IL') : '—'}
                        </td>
                        <td className="p-3 font-semibold">₪{(order.total_price_ils || 0).toLocaleString()}</td>
                        <td className="p-3 text-xs text-stone-600">{order.items?.length || 0} פריטים</td>
                      </tr>
                    ))}
                    {filteredOrders().length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-500">
                          לא נמצאו הזמנות מתאימות
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}