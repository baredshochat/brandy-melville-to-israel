import React, { useState, useEffect } from "react";
import { OrderTemplate } from "@/entities/OrderTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, FileText, Eye } from "lucide-react";
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

  useEffect(() => {
    loadTemplate();
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
        <TabsList className="grid grid-cols-2 w-full md:w-96">
          <TabsTrigger value="editor">
            <FileText className="w-4 h-4 ml-2" />
            עריכה
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 ml-2" />
            תצוגה מקדימה
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
      </Tabs>
    </div>
  );
}