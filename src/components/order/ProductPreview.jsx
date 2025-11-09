import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Package, Loader2, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";

export default function ProductPreview({ productData, onConfirm, onBack }) {
  const [itemDetails, setItemDetails] = useState(null);

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
      t = setTimeout(() => setItemDetails(sanitized), 60);
    } else { setItemDetails(null); }
    return () => clearTimeout(t);
  }, [productData]);

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

  return (
    <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="p-3 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-xl sm:text-2xl mb-2 sm:mb-3 font-semibold">{isEditing ? 'עריכת פריט' : 'אישור פריט'}</h2>
        </div>

        <div className="bg-white p-4 sm:p-8 border border-stone-200">
          <div className="space-y-4 sm:space-y-6" dir="ltr">
            <h3 className="text-xl sm:text-3xl font-medium text-stone-900 text-left">{displayName}</h3>
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
          </div>

          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 text-amber-900">
              <p className="text-sm sm:text-base font-semibold">
                שימי לב: הפריט שיגיע הוא בדיוק לפי הקישור המקורי שהדבקת.
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
            disabled={!canConfirm}
            className="order-1 sm:order-none h-10 sm:h-12 px-6 sm:px-8 bg-black hover:bg-stone-800 active:bg-stone-700 text-white font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
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