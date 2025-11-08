
import React, { useState, useEffect } from "react";
import { PricingLabels } from "@/entities/PricingLabels";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Type, MessageSquare, Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";

export default function PricingLabelsSettings() {
  const [labels, setLabels] = useState({});
  const [labelsId, setLabelsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUserRole(user.role);
        fetchLabels();
      } catch (error) {
        window.location.href = createPageUrl('Home');
      }
    };
    checkAccess();
  }, []);

  const fetchLabels = async () => {
    setLoading(true);
    const results = await PricingLabels.list();
    if (results.length > 0) {
      setLabels(results[0]);
      setLabelsId(results[0].id);
    } else {
      // Set default values if no labels exist
      setLabels({
        product_cost_label: "עלות מוצרים",
        product_cost_tooltip: null, // Changed from string to null
        product_ils_label: "עלות בש״ח כולל עמלת המרת מטבע",
        product_ils_tooltip: "מחיר המוצרים בשקלים, כולל עמלת השירות ועמלת המרת מטבע",
        intl_shipping_label: "משלוח בינלאומי כולל עמלת שירות",
        intl_shipping_tooltip: null, // Changed from string to null
        customs_and_fees_label: "מכס ועמלות טיפול",
        customs_and_fees_tooltip: "כולל מכס (12% על הזמנות מעל 75$) ועמלות קבועות לטיפול ושחרור החבילה.", // Updated text
        domestic_shipping_label: "משלוח עד הבית",
        domestic_shipping_tooltip: null, // Changed from string to null
        vat_label: "מע״מ (18%)",
        vat_tooltip: null, // Changed from string to null
        final_price_label: "מחיר סופי (כולל מע״מ 18%):"
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (labelsId) {
        await PricingLabels.update(labelsId, labels);
      } else {
        const newLabels = await PricingLabels.create(labels);
        setLabelsId(newLabels.id);
      }
      alert("התוויות עודכנו בהצלחה!");
    } catch (error) {
      alert("שגיאה בעדכון התוויות.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setLabels(prev => ({ ...prev, [field]: value }));
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-400"/></div>;
  }

  const fields = [
    { key: 'product_cost_label', label: 'עלות מוצרים - תווית', type: 'input' },
    { key: 'product_cost_tooltip', label: 'עלות מוצרים - הסבר', type: 'textarea' },
    { key: 'product_ils_label', label: 'עלות בש״ח - תווית', type: 'input' },
    { key: 'product_ils_tooltip', label: 'עלות בש״ח - הסבר', type: 'textarea' },
    { key: 'intl_shipping_label', label: 'משלוח בינלאומי - תווית', type: 'input' },
    { key: 'intl_shipping_tooltip', label: 'משלוח בינלאומי - הסבר', type: 'textarea' },
    { key: 'customs_and_fees_label', label: 'מכס ועמלות טיפול - תווית', type: 'input' },
    { key: 'customs_and_fees_tooltip', label: 'מכס ועמלות טיפול - הסבר', type: 'textarea' },
    { key: 'domestic_shipping_label', label: 'משלוח פנים ארצי - תווית', type: 'input' },
    { key: 'domestic_shipping_tooltip', label: 'משלוח פנים ארצי - הסבר', type: 'textarea' },
    { key: 'vat_label', label: 'מע״מ - תווית', type: 'input' },
    { key: 'vat_tooltip', label: 'מע״מ - הסבר', type: 'textarea' },
    { key: 'final_price_label', label: 'מחיר סופי - תווית', type: 'input' }
  ];

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-stone-50 min-h-screen pb-12"
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
            <h1 className="text-4xl font-semibold text-stone-900">הגדרות תוויות מחיר</h1>
            <p className="text-stone-600 mt-2">עריכת הטקסטים המוצגים ללקוחות בעמוד חישוב המחיר</p>
        </div>

        <Card className="bg-white border border-stone-200 rounded-none">
            <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-normal text-stone-900 flex items-center gap-2">
                <Type className="w-6 h-6 text-stone-600" />
                עריכת תוויות ופירוטים
            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
            {fields.map((field) => (
                <div key={field.key}>
                <Label className="font-medium text-stone-700 flex items-center gap-2 mb-2">
                    {field.type === 'input' ? <Type className="w-4 h-4 text-stone-500" /> : <MessageSquare className="w-4 h-4 text-stone-500" />}
                    {field.label}
                </Label>
                {field.type === 'input' ? (
                    <Input 
                    value={labels[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="h-12 border-stone-300 text-stone-700 rounded-none"
                    />
                ) : (
                    <Textarea 
                    value={labels[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    rows={2}
                    className="border-stone-300 text-stone-700 rounded-none"
                    />
                )}
                </div>
            ))}
            
            <Button onClick={handleSave} disabled={saving} className="w-full h-12 bg-black hover:bg-stone-800 text-white font-medium rounded-none">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> שומר...</> : <><Save className="w-4 h-4 mr-2"/> שמירת שינויים</>}
            </Button>
            </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
