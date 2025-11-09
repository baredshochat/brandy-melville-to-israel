
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, Package, Loader2, Link as LinkIcon, Image as ImageIcon, Upload, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { UploadFile } from "@/integrations/Core";
import { SkuImage } from "@/entities/SkuImage";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProductPreview({ productData, onConfirm, onBack }) {
  const [itemDetails, setItemDetails] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('🖼️ Starting image upload:', file.name);
    setUploadingImage(true);
    setUploadSuccess(false);
    
    try {
      // Upload the file
      const result = await UploadFile({ file });
      const newImageUrl = result.file_url;
      console.log('✅ Image uploaded successfully:', newImageUrl);
      
      // Update the current item
      setItemDetails(prev => ({ ...prev, item_image_url: newImageUrl }));
      
      // Save to SkuImage database for future use
      const sku = itemDetails?.product_sku;
      console.log('📦 Product SKU:', sku);
      
      if (sku && sku !== 'SKU לא נמצא' && sku !== 'לא זוהה') {
        try {
          console.log('🔍 Checking if SKU already exists in database...');
          const existing = await SkuImage.filter({ product_sku: sku });
          
          if (existing && existing.length > 0) {
            console.log('🔄 Updating existing SkuImage record...');
            await SkuImage.update(existing[0].id, {
              image_url: newImageUrl,
              product_name: itemDetails.product_name,
              site: itemDetails.site
            });
            console.log('✅ SkuImage updated successfully!');
          } else {
            console.log('➕ Creating new SkuImage record...');
            await SkuImage.create({
              product_sku: sku,
              image_url: newImageUrl,
              product_name: itemDetails.product_name,
              site: itemDetails.site
            });
            console.log('✅ SkuImage created successfully!');
          }
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        } catch (skuError) {
          console.error('❌ Error saving to SkuImage:', skuError);
          alert('התמונה הועלתה אבל לא נשמרה למק"ט. נסי שוב.');
        }
      } else {
        console.warn('⚠️ No valid SKU - image not saved to database');
        alert('התמונה הועלתה, אך לא נשמרה למק"ט כי המק"ט לא זוהה');
      }
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      alert(`שגיאה בהעלאת התמונה: ${error.message || 'שגיאה לא ידועה'}`);
    } finally {
      setUploadingImage(false);
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

  return (
    <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="p-3 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6 sm:mb-10">
          <h2 className="text-xl sm:text-2xl mb-2 sm:mb-3 font-semibold">{isEditing ? 'עריכת פריט' : 'אישור פריט'}</h2>
        </div>

        {uploadSuccess && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ התמונה הועלתה ונשמרה בהצלחה! בפעם הבאה שתזיני את המק"ט הזה, התמונה תופיע אוטומטית.
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-white p-4 sm:p-8 border border-stone-200">
          <div className="grid lg:grid-cols-2 gap-x-8 sm:gap-x-12 gap-y-6 sm:gap-y-8 items-start">
            {/* Product Image Section */}
            <div className="order-1 lg:order-2">
              {itemDetails.item_image_url ? (
                <div className="w-full bg-stone-50 border-2 border-stone-200 overflow-hidden relative group">
                  <img 
                    src={itemDetails.item_image_url} 
                    alt={displayName}
                    className="w-full h-auto object-contain"
                    style={{ maxHeight: '500px' }}
                    onError={(e) => {
                      console.error('Image failed to load:', itemDetails.item_image_url);
                      e.target.style.display = 'none';
                      e.target.parentElement.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-8 text-stone-400" style="min-height: 300px;">
                          <svg class="w-16 h-16 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          <p class="text-sm">לא ניתן להציג תמונה</p>
                        </div>
                      `;
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label htmlFor="image-upload-existing" className="cursor-pointer">
                      <div className="bg-white text-stone-800 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 hover:bg-stone-50 transition-colors">
                        {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        <span className="font-medium">העלי תמונה אחרת</span>
                      </div>
                    </label>
                    <input 
                      id="image-upload-existing"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </div>
                </div>
              ) : (
                <div className="w-full bg-stone-50 border-2 border-dashed border-stone-300 flex flex-col items-center justify-center p-8 text-stone-500 hover:border-stone-400 transition-colors" style={{ minHeight: '300px' }}>
                  <ImageIcon className="w-20 h-20 mb-4" strokeWidth={1.5} />
                  <p className="text-base font-medium mb-2">תמונת המוצר לא זוהתה</p>
                  <p className="text-sm mb-6 text-center">העלי תמונה ידנית כדי שנוכל להציגה</p>
                  
                  <input 
                    id="image-upload-new"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                  />
                  <div className="flex items-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded transition-colors cursor-pointer" onClick={() => document.getElementById('image-upload-new').click()}>
                    {uploadingImage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>מעלה...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>בחרי תמונה</span>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-6 p-3 bg-rose-50 border border-rose-200 rounded-lg max-w-sm">
                    <p className="text-xs text-rose-800 text-center font-medium">
                      💡 התמונה תישמר למק״ט <span className="font-bold">{itemDetails.product_sku || 'לא זוהה'}</span> ותופיע אוטומטית בפעם הבאה!
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 sm:space-y-4 order-2 lg:order-1" dir="ltr">
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
