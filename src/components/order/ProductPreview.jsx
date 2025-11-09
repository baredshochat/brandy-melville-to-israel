
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Package, Loader2, Link as LinkIcon, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { InvokeLLM } from "@/integrations/Core";
import { Alert, AlertDescription } from "@/components/ui/alert";

async function normalizeLLMResult(res) {
  try {
    if (!res) return null;
    if (typeof Response !== 'undefined' && res instanceof Response) {
      return await res.json();
    }
    if (res && typeof res === 'object' && 'data' in res) {
      return res.data;
    }
    if (typeof res === 'string') {
      try { return JSON.parse(res); } catch { return { _raw: res }; }
    }
    return res;
  } catch (e) {
    console.error('normalizeLLMResult failed', e);
    return res;
  }
}

export default function ProductPreview({ productData, onConfirm, onBack }) {
  const [itemDetails, setItemDetails] = useState(null);
  const [refetching, setRefetching] = useState(false);
  const [refetchError, setRefetchError] = useState('');
  const [refetchSuccess, setRefetchSuccess] = useState(false);

  const getNameFromUrl = (url) => {
    try {
      if (!url) return "";
      const { pathname } = new URL(url);
      const afterProducts = pathname.split("/products/")[1] || "";
      const slug = afterProducts ? afterProducts.split("/")[0] : pathname.split("/").filter(Boolean).pop() || "";
      if (!slug) return "";
      const clean = decodeURIComponent(slug).split("?")[0].split("#")[0].replace(/-/g, " ").trim();
      return clean.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    } catch { return ""; }
  };

  useEffect(() => {
    let t;
    if (productData && typeof productData === 'object') {
      const sanitized = { ...productData };
      if (!Array.isArray(sanitized.available_colors)) sanitized.available_colors = [];
      if (!Array.isArray(sanitized.available_sizes)) sanitized.available_sizes = [];
      if (typeof sanitized.quantity !== 'number') sanitized.quantity = 1;
      if (typeof sanitized.color !== 'string') sanitized.color = '';
      if (typeof sanitized.size !== 'string') sanitized.size = '';

      if (!sanitized.product_name || !String(sanitized.product_name).trim()) {
        const n = getNameFromUrl(sanitized.product_url);
        if (n) sanitized.product_name = n;
      }
      
      // Log for debugging
      console.log('🎨 ProductPreview loaded with color:', {
        selectedColor: sanitized.color,
        availableColors: sanitized.available_colors,
        hasColor: !!sanitized.color
      });
      
      // If editing an old item without color, trigger automatic refetch
      if (productData.id && !sanitized.color && sanitized.product_url) {
        console.log('⚠️ Old item without color detected - will auto-refetch');
      }
      
      t = setTimeout(() => setItemDetails(sanitized), 60);
    } else { setItemDetails(null); }
    return () => clearTimeout(t);
  }, [productData]);

  const handleRefetch = async () => {
    if (!itemDetails?.product_url) {
      setRefetchError('אין קישור מקור לבדיקה מחדש');
      return;
    }

    setRefetching(true);
    setRefetchError('');
    setRefetchSuccess(false);

    try {
      const raw = await InvokeLLM({
        prompt: `You are extracting product data from this URL: ${itemDetails.product_url}

CRITICAL - RE-VERIFICATION MODE:
This is a second attempt to extract data. Be EXTRA careful and thorough.

PRODUCT NAME:
- Extract from: og:title meta tag OR the main <h1> product title
- Clean any " | Brandy Melville" suffix
- Keep the original English name
- Double-check spelling and capitalization

PRICE:
- Find the price in £XX format (or $XX or €XX)
- Return just the number
- Verify this is the CURRENT price, not a crossed-out old price

SKU:
- Usually shown as "SKU: XXXXX" on the page
- This is critical for product identification
- Look in multiple places: product info section, meta tags, hidden fields

DESCRIPTION:
- The product description text (usually under "Product Description:")
- Get the FULL description if available

COLORS & SIZES:
- Extract ALL available options from dropdown/selection buttons
- Don't miss any variants
- List all color names exactly as they appear
- IMPORTANT: Also identify which specific color THIS product URL is showing (from URL parameters, selected option, or product title)

Return complete and accurate data.

Example output:
{
  "product_name": "Priscilla Pants",
  "product_sku": "M065L-622PSI720000",
  "product_description": "Soft cotton blend yoga pants with a wide pant leg.",
  "price": 20,
  "available_colors": ["Super Light Grey", "White", "Silver Grey", "Black"],
  "selected_color": "Super Light Grey",
  "available_sizes": ["XS/S"],
  "currency_found": "GBP"
}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            product_sku: { type: ["string", "null"] },
            product_description: { type: ["string", "null"] },
            price: { type: "number" },
            available_colors: { type: "array", items: { type: "string" } },
            selected_color: { type: ["string", "null"] },
            available_sizes: { type: "array", items: { type: "string" } },
            currency_found: { type: "string" }
          },
          required: ["product_name", "price", "currency_found"]
        }
      });

      const result = await normalizeLLMResult(raw);
      console.log("🔄 Refetch result:", result);

      // Update item details with new data
      const updatedItem = {
        ...itemDetails,
        product_name: result?.product_name || itemDetails.product_name,
        product_sku: result?.product_sku || itemDetails.product_sku,
        product_description: result?.product_description || itemDetails.product_description,
        original_price: result?.price || itemDetails.original_price,
        color: result?.selected_color || itemDetails.color,
        available_colors: Array.isArray(result?.available_colors) ? result.available_colors : itemDetails.available_colors,
        available_sizes: Array.isArray(result?.available_sizes) ? result.available_sizes : itemDetails.available_sizes,
        original_currency: result?.currency_found || itemDetails.original_currency
      };

      setItemDetails(updatedItem);
      setRefetchSuccess(true);
      setTimeout(() => setRefetchSuccess(false), 3000);

    } catch (error) {
      console.error('Error refetching product details:', error);
      setRefetchError(`שגיאה בבדיקה מחדש: ${error.message || 'שגיאה לא ידועה'}`);
    } finally {
      setRefetching(false);
    }
  };

  const isEditing = !!productData?.id;

  if (!itemDetails) {
    return (
      <motion.div className="p-4 md:p-8 flex justify-center items-center" style={{ minHeight: '400px' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </motion.div>
    );
  }

  const handleConfirm = () => onConfirm(itemDetails);

  const currencySymbol = itemDetails.original_currency === 'USD' ? '$' : itemDetails.original_currency === 'EUR' ? '€' : itemDetails.original_currency === 'GBP' ? '£' : '';
  const displayName = (itemDetails.product_name && String(itemDetails.product_name).trim()) ? itemDetails.product_name : (getNameFromUrl(itemDetails.product_url) || 'שם לא זוהה');

  const canConfirm = (itemDetails.quantity || 1) > 0;

  // Helper function for better color matching
  const normalizeColorName = (color) => {
    if (!color) return '';
    return color.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  // Check if this is an old item without color data
  const needsColorUpdate = isEditing && !itemDetails.color && itemDetails.available_colors && itemDetails.available_colors.length > 0;

  return (
    <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="p-3 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-xl sm:text-2xl mb-2 sm:mb-3 font-semibold">{isEditing ? 'עריכת פריט' : 'אישור פריט'}</h2>
        </div>

        {needsColorUpdate && !refetchSuccess && (
          <Alert className="mb-4 bg-blue-50 border-blue-300">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              💡 <strong>שימי לב:</strong> הפריט הזה נוסף לפני שהתכונה לזיהוי צבעים הייתה זמינה. 
              לחצי על <strong>"בדוק שוב"</strong> למעלה כדי לזהות את הצבע של המוצר מהקישור המקורי.
            </AlertDescription>
          </Alert>
        )}

        {refetchSuccess && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ הפרטים עודכנו בהצלחה! {itemDetails.color && 'הצבע זוהה וסומן בצבעים הזמינים 🎨'}
            </AlertDescription>
          </Alert>
        )}

        {refetchError && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {refetchError}
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-white p-4 sm:p-8 border border-stone-200">
          <div className="space-y-4 sm:space-y-6" dir="ltr">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h3 className="text-xl sm:text-3xl font-medium text-stone-900 text-left">{displayName}</h3>
              </div>
              <Button
                onClick={handleRefetch}
                disabled={refetching}
                variant="outline"
                size="sm"
                className={`flex items-center gap-2 ${needsColorUpdate ? 'text-blue-600 border-blue-400 hover:bg-blue-50 animate-pulse' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
              >
                {refetching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">מעדכן...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">{needsColorUpdate ? 'לחצי לזיהוי צבע!' : 'בדוק שוב'}</span>
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs sm:text-sm text-stone-500 text-left">מק"ט: {itemDetails.product_sku || 'לא זוהה'}</p>
            
            <div className="text-sm sm:text-base text-stone-600 max-w-none pt-2 text-left prose prose-sm">
              <p>{itemDetails.product_description || 'לא זוהה תיאור'}</p>
            </div>
            
            <div className="text-xl sm:text-3xl font-medium text-stone-900 pt-2 text-left">
              <span className="text-left text-lg sm:text-2xl">{currencySymbol}{Number(itemDetails.original_price || 0).toFixed(2)}</span>
            </div>
            
            <div className="pt-4">
              <Label className="font-medium text-stone-700 flex items-center gap-2 text-sm sm:text-base">
                <LinkIcon className="w-4 h-4 text-stone-500" /> קישור מקור
              </Label>
              <a href={itemDetails.product_url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm text-rose-600 hover:underline text-left block break-all mt-2" dir="ltr">
                {itemDetails.product_url}
              </a>
            </div>

            {itemDetails.available_colors && itemDetails.available_colors.length > 0 && (
              <div className="pt-2" dir="rtl">
                <Label className="font-medium text-stone-700 text-sm sm:text-base block mb-3">
                  צבעים זמינים {itemDetails.color && <span className="text-rose-600 font-bold">(הצבע שלך מסומן ✓)</span>}
                  {!itemDetails.color && needsColorUpdate && <span className="text-blue-600 font-bold animate-pulse">(לחצי "בדוק שוב" לזיהוי הצבע)</span>}
                </Label>
                
                <div className="flex flex-wrap gap-2">
                  {itemDetails.available_colors.map((color, idx) => {
                    const normalizedSelected = normalizeColorName(itemDetails.color);
                    const normalizedColor = normalizeColorName(color);
                    const isSelected = normalizedSelected && normalizedColor === normalizedColor;
                    
                    return (
                      <span 
                        key={idx} 
                        className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                          isSelected 
                            ? 'bg-rose-500 text-white border-2 border-rose-600 shadow-lg ring-4 ring-rose-200 scale-105' 
                            : 'bg-stone-100 text-stone-700 border border-stone-200 hover:bg-stone-200'
                        }`}
                        style={{ borderRadius: '6px' }}
                      >
                        {isSelected && '✓ '}{color}
                      </span>
                    );
                  })}
                </div>
                
                {itemDetails.color && !itemDetails.available_colors.some(c => normalizeColorName(c) === normalizeColorName(itemDetails.color)) && (
                  <Alert className="mt-3 bg-amber-50 border-amber-300">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      ⚠️ הצבע "{itemDetails.color}" לא נמצא ברשימת הצבעים הזמינים. אנא בדקי את הקישור או לחצי על "בדוק שוב".
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {itemDetails.available_sizes && itemDetails.available_sizes.length > 0 && (
              <div className="pt-2" dir="rtl">
                <Label className="font-medium text-stone-700 text-sm sm:text-base block mb-2">
                  מידות זמינות
                </Label>
                <div className="flex flex-wrap gap-2">
                  {itemDetails.available_sizes.map((size, idx) => (
                    <span key={idx} className="px-3 py-1 bg-stone-100 text-stone-700 text-sm border border-stone-200" style={{ borderRadius: '6px' }}>
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 text-amber-900">
              <p className="text-sm sm:text-base font-semibold">
                ⚠️ שימי לב: הפריט שיגיע הוא בדיוק לפי הקישור המקורי. אם יש טעות בפרטים, לחצי על "בדוק שוב" למעלה.
              </p>
            </div>

            <div className="max-w-xs">
              <Label className="font-medium text-stone-700 flex items-center gap-2 text-sm sm:text-base">
                <Package className="w-4 h-4 text-stone-500" /> כמות
              </Label>
              <Select value={String(itemDetails.quantity)} onValueChange={(v) => setItemDetails((p) => ({ ...p, quantity: parseInt(v) }))}>
                <SelectTrigger className="h-10 sm:h-12 border-stone-300 mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mt-6 sm:mt-8">
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || refetching}
            className="order-1 sm:order-none h-10 sm:h-12 px-6 sm:px-8 bg-black hover:bg-stone-800 active:bg-stone-700 text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            הוספה לסל <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="ghost" onClick={onBack} className="order-2 sm:order-none flex items-center justify-center gap-2 h-10 sm:h-12 px-4 sm:px-6 text-stone-600 hover:text-black hover:bg-stone-100 text-sm sm:text-base">
            <ArrowLeft className="w-4 h-4" /> חזור
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
