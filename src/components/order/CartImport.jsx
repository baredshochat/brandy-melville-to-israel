import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Link2, Loader2, CheckCircle, AlertTriangle, XCircle, ExternalLink, Copy, Upload, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InvokeLLM, UploadFile } from "@/integrations/Core";
import { CartItem } from "@/entities/CartItem";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";

const siteInfo = {
  us: { name: 'ארצות הברית', flag: 'https://flagcdn.com/w160/us.png', domain: 'us.brandymelville.com', fullUrl: 'https://us.brandymelville.com' },
  eu: { name: 'אירופה', flag: 'https://flagcdn.com/w160/eu.png', domain: 'eu.brandymelville.com', fullUrl: 'https://eu.brandymelville.com' },
  uk: { name: 'בריטניה', flag: 'https://flagcdn.com/w160/gb.png', domain: 'uk.brandymelville.com', fullUrl: 'https://uk.brandymelville.com' }
};

const CATEGORY_MAPPING = { christy: 'hoodie', hoodie: 'hoodie', crewneck: 'hoodie', zip: 'hoodie', brianna: 'sweater', cameron: 'sweater', zoe: 'sweater', cardigan: 'sweater', anastasia: 'sweatpants', rosa: 'sweatpants', priscilla: 'sweatpants', sweatpants: 'sweatpants', hailie: 'tee', amara: 'tee', edith: 'tee', lydia: 'tee', tank: 'tee', malia: 'skirt', skirt: 'skirt', 'shoulder bag': 'bag', 'mini shoulder': 'bag', 'makeup bag': 'bag', tote: 'bag', backpack: 'bag', duffle: 'bag' };

async function normalizeLLMResult(res) {
  try {
    if (!res) return null;
    if (typeof Response !== 'undefined' && res instanceof Response) { return await res.json(); }
    if (res && typeof res === 'object' && 'data' in res) { return res.data; }
    if (typeof res === 'string') { try { return JSON.parse(res); } catch { return { _raw: res }; } }
    return res;
  } catch (e) { console.error('normalizeLLMResult failed', e); return res; }
}

async function normalizeEntity(entity) {
  if (!entity) return entity;
  if (typeof Response !== 'undefined' && entity instanceof Response) {
    try { return await entity.json(); } catch { return entity; }
  }
  if (entity && entity.data) return entity.data;
  return entity;
}

function getNameFromUrl(url) {
  try {
    const u = new URL(url); let path = u.pathname.replace(/\/+$/, "");
    let slug = path.includes("/products/") ? path.split("/products/")[1] : path.split("/").filter(Boolean).pop();
    if (!slug) return ""; slug = slug.split("?")[0].split("#")[0]; slug = decodeURIComponent(slug);
    return slug.split("-").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  } catch { return ""; }
}

export default function CartImport({ site, onImportComplete, onBack, loading }) {
  const [urls, setUrls] = useState(['']);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [importMode, setImportMode] = useState('url'); // 'url' or 'image'
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState([]);

  const siteData = siteInfo[site];

  useEffect(() => { User.me().then(setUser).catch(() => setUser(null)); }, []);

  const categorizeProduct = React.useCallback((name) => {
    const lowerName = (name || '').toLowerCase();
    for (const [key, category] of Object.entries(CATEGORY_MAPPING)) {
      if (lowerName.includes(key)) return category;
    }
    return 'other';
  }, []);

  const detectFlags = React.useCallback((name, size) => {
    const lowerName = (name || '').toLowerCase();
    const lowerSize = (size || '').toLowerCase();
    return { oversized: lowerName.includes('oversized') || lowerSize.includes('oversized'), stuffed: lowerName.includes('shoulder') && (lowerName.includes('mini') || lowerName.includes('shoulder bag')), flattened: lowerName.includes('bag') && !lowerName.includes('shoulder') };
  }, []);

  const getWeightByCategory = React.useCallback((category) => {
    const weights = { tee: 0.15, hoodie: 1.0, sweater: 0.8, sweatpants: 0.8, skirt: 0.3, bag: 0.6, other: 0.4 };
    return weights[category] || 0.4;
  }, []);

  const updateUrl = (index, value) => { const next = [...urls]; next[index] = value; setUrls(next); };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Limit to 5 images
    const limitedFiles = files.slice(0, 5);
    setSelectedImages(limitedFiles);
    setStatus(null);
  };

  const handleImageImport = async () => {
    if (selectedImages.length === 0) {
      setStatus({ type: 'error', message: 'אנא בחרי לפחות תמונה אחת של עגלת הקניות.' });
      return;
    }

    setProcessing(true);
    setStatus({ type: 'info', message: 'מעלה תמונות...' });

    try {
      // Upload all images
      const uploadPromises = selectedImages.map(async (file) => {
        const result = await UploadFile({ file });
        const normalized = await normalizeLLMResult(result);
        return normalized?.file_url || normalized?.url;
      });

      const imageUrls = await Promise.all(uploadPromises);
      const validImageUrls = imageUrls.filter(url => url);

      if (validImageUrls.length === 0) {
        setStatus({ type: 'error', message: 'שגיאה בהעלאת התמונות. נסי שוב.' });
        setProcessing(false);
        return;
      }

      setUploadedImageUrls(validImageUrls);
      setStatus({ type: 'info', message: 'מנתח תמונות...' });

      // Call backend function to analyze images
      const response = await base44.functions.invoke('analyzeCartImages', {
        file_urls: validImageUrls,
        site: site
      });

      const normalized = await normalizeLLMResult(response);

      if (!normalized?.success || !normalized?.items || normalized.items.length === 0) {
        setStatus({ 
          type: 'error', 
          message: normalized?.error || 'לא זוהו פריטים בתמונות. אנא וודאי שהתמונה מציגה את עגלת הקניות בבירור.'
        });
        setProcessing(false);
        return;
      }

      // Save all items to cart
      const savedItems = [];
      for (const item of normalized.items) {
        let savedItem = await CartItem.create(item);
        savedItem = await normalizeEntity(savedItem);
        savedItems.push(savedItem);
      }

      setStatus({ 
        type: 'success', 
        message: `זוהו ${savedItems.length} פריטים בהצלחה! מעבירות אותך לסל...` 
      });

      setTimeout(() => {
        onImportComplete?.(savedItems);
      }, 1000);

    } catch (error) {
      console.error('Image import error:', error);
      setStatus({ 
        type: 'error', 
        message: `שגיאה בניתוח התמונות: ${error.message}` 
      });
    } finally {
      setProcessing(false);
    }
  };

  const validateUrls = (urlsToValidate, expectedSite) => {
    const currentSiteData = siteInfo[expectedSite];
    const invalidUrls = urlsToValidate.filter((url) => {
      try { const hostname = new URL(url).hostname; return !hostname.includes(currentSiteData.domain); } catch { return true; }
    });
    return invalidUrls;
  };

  const handleManualImport = async () => {
    const validUrls = urls.filter((url) => url.trim().length > 0);
    if (validUrls.length === 0) { setStatus({ type: 'error', message: 'אנא הדביקי לפחות קישור אחד למוצר.' }); return; }
    const invalidUrls = validateUrls(validUrls, site);
    if (invalidUrls.length > 0) { setStatus({ type: 'error', message: `כל הקישורים חייבים להיות מהאתר ${siteData.domain}. קישורים לא תקינים: ${invalidUrls.join(', ')}` }); return; }

    setProcessing(true);
    try {
      const expectedCurrency = site === 'eu' ? 'EUR' : site === 'uk' ? 'GBP' : 'USD';

      // FIX: robust prompt with meta tags priority and strict schema
      const prompt = `
You are a precise web scraping assistant for Brandy Melville product pages. Extract product data from this URL with EXACT accuracy.
URL: ${validUrls[0]}

CRITICAL - SKU EXTRACTION (HIGHEST PRIORITY):
The SKU/product code is the MOST important field. Look for it in this order:
1) JSON-LD script with "@type":"Product" -> "sku" field (EXACT value, do not modify)
2) Look for patterns like "SKU: XXXXX" or "Product Code: XXXXX" in the page
3) Look in the URL path for product codes (e.g., "M065L-622BAG720000")
4) Look in hidden inputs or data attributes with names like "product-sku", "variant-sku", "data-sku"
5) Check the page source for "sku": "..." patterns

DO NOT INVENT OR GUESS THE SKU. If you cannot find the exact SKU on the page, return null for sku field.
The SKU must be the EXACT string from the website - do not modify, truncate, or add to it.

Product name priority (highest to lowest):
1) JSON-LD script with "@type":"Product" -> name
2) <meta property="og:title" content="...">
3) <meta name="twitter:title" content="...">
4) URL slug fallback (after /products/ or last path segment), title-cased

Price and currency rules:
- Extract numeric price and 3-letter currency code.
- Expected currency: ${expectedCurrency}. If found currency differs, set extraction_error explaining mismatch.

Also extract:
- description (if present)
- available_colors (array of strings), available_sizes (array of strings)
- fit (Oversized | Regular | Slim | null) if can be inferred from text
- category heuristic based on name: Hoodie, Tee, Sweatpants, Bag, Skirt, Other
- bag_type: Stuffed | Flattened | null (bag items only)

Return ONLY a JSON object matching the schema; do not include extra text.
`;

      const raw = await InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            product: {
              type: "object",
              properties: {
                name: { type: "string" },
                sku: { anyOf: [{ type: "string" }, { type: "null" }] },
                description: { anyOf: [{ type: "string" }, { type: "null" }] },
                price: { type: "number" },
                currency: { type: "string" },
                available_colors: { type: "array", items: { type: "string" } },
                available_sizes: { type: "array", items: { type: "string" } },
                fit: { anyOf: [{ type: "string" }, { type: "null" }] },
                category: { anyOf: [{ type: "string" }, { type: "null" }] },
                bag_type: { anyOf: [{ type: "string" }, { type: "null" }] },
                url: { type: "string" },
                extraction_confidence: { type: "string", enum: ["high", "medium", "low"] },
                source_of_data: {
                  type: "object",
                  properties: {
                    price: { anyOf: [{ type: "string" }, { type: "null" }] },
                    size: { anyOf: [{ type: "string" }, { type: "null" }] },
                    color: { anyOf: [{ type: "string" }, { type: "null" }] },
                    title: { anyOf: [{ type: "string" }, { type: "null" }] }
                  }
                }
              },
              required: ["name", "price", "currency"]
            },
            extraction_notes: { anyOf: [{ type: "string" }, { type: "null" }] },
            extraction_error: { anyOf: [{ type: "string" }, { type: "null" }] }
          },
          required: ["product"]
        }
      });

      const result = await normalizeLLMResult(raw);
      console.log("Advanced extraction result (normalized):", result);

      if (result?.extraction_error) {
        setStatus({ type: 'error', message: `שגיאה בעיבוד הקישור: ${result.extraction_error}` });
        return;
      }
      if (!result?.product) {
        setStatus({ type: 'error', message: 'לא הצלחנו לזהות פריט בקישור. נסי שוב או בדקי שהקישור תקין.' });
        return;
      }

      const product = result.product;
      const price = parseFloat(product.price);
      if (!Number.isFinite(price) || price <= 0) {
        setStatus({ type: 'error', message: `המחיר שזוהה (${product.price}) אינו תקין.` });
        return;
      }
      if (product.currency !== expectedCurrency) {
        setStatus({ type: 'error', message: `זוהה מטבע ${product.currency} במקום ${expectedCurrency}.` });
        return;
      }

      const category = product.category || categorizeProduct(product.name);
      const urlDerivedName = getNameFromUrl(product.url || validUrls[0]);
      const finalName = (product.name && String(product.name).trim()) ? product.name : (urlDerivedName || 'Product');
      const flags = detectFlags(finalName, (product.available_sizes || [])[0]);

      // שמירה על הקישור המקורי בדיוק כפי שהלקוחה הדביקה
      const originalUrl = validUrls[0].trim();
      
      const newItem = {
        product_name: finalName,
        product_url: originalUrl, // שומרים את הקישור המקורי בדיוק
        site,
        original_price: price,
        original_currency: product.currency,
        quantity: 1,
        // לא לבחור אוטומטית צבע/מידה - כברירת מחדל ריק
        color: '',
        size: '',
        item_type: category,
        item_weight: getWeightByCategory(category),
        product_sku: product.sku || null,
        product_description: product.description || null,
        available_colors: product.available_colors || [],
        available_sizes: product.available_sizes || [],
        is_oversized: !!flags.oversized,
        is_stuffed: product.bag_type === 'Stuffed' || !!flags.stuffed,
        is_flattened: product.bag_type === 'Flattened' || !!flags.flattened,
        confidence: product.extraction_confidence || 'medium'
      };

      let savedItem = await CartItem.create(newItem);
      savedItem = await normalizeEntity(savedItem);

      setStatus({ type: 'success', message: `זיהינו את הפריט! מעבירות אותך לאישור סופי...` });
      setTimeout(() => { onImportComplete?.([savedItem]); }, 900);

    } catch (error) {
      console.error('Advanced import error:', error);
      setStatus({ type: 'error', message: `אירעה שגיאה בעיבוד הקישור: ${error.message}` });
    } finally { setProcessing(false); }
  };

  if (!siteData) return null;

  return (
    <motion.div key="cart-import" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="p-4 md:p-8 relative">
      <div className="absolute inset-0 opacity-5">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/5f0c1a61c_IMG_6057.jpg"
          alt="Fashion background"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover" />
      </div>

      <div className="max-w-xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-4 border border-stone-200 shadow-lg mb-6">
          <div className="flex items-center gap-4">
            <img
              src={siteData.flag}
              alt={`דגל ${siteData.name}`}
              loading="lazy"
              decoding="async"
              className="w-12 h-8 object-cover border border-stone-200" />
            <div className="flex-1"><h3 className="text-lg font-semibold text-stone-900">{siteData.name}</h3></div>
          </div>
          <div className="text-center mt-3">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-sm text-stone-600 font-mono" dir="ltr">{siteData.domain}</span>
              <a href={siteData.fullUrl} target="_blank" rel="noopener noreferrer" className="text-rose-500 hover:text-rose-600 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </motion.div>

        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-4xl font-semibold text-stone-900 mb-3">הוספת מוצר לסל</h2>
          <p className="text-sm sm:text-base text-stone-600">
            {importMode === 'url' ? 'הדביקי קישור למוצר שאת רוצה להזמין' : 'העלי תמונה של עגלת הקניות שלך'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 border border-stone-200 shadow-lg space-y-6">
          {/* Mode Selector */}
          <div className="flex gap-2 p-1 bg-stone-100 rounded-lg">
            <button
              onClick={() => setImportMode('url')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                importMode === 'url' 
                  ? 'bg-white text-stone-900 shadow-sm' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Link2 className="w-4 h-4 inline-block ml-2" />
              קישור למוצר
            </button>
            <button
              onClick={() => setImportMode('image')}
              className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all ${
                importMode === 'image' 
                  ? 'bg-white text-stone-900 shadow-sm' 
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ImageIcon className="w-4 h-4 inline-block ml-2" />
              תמונת עגלה
            </button>
          </div>

          {/* URL Import Mode */}
          {importMode === 'url' && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-medium text-stone-800 flex items-center gap-2">
                <Link2 className="w-4 h-4 sm:w-5 sm:h-5" /> קישור למוצר
              </h3>
              <div className="space-y-3">
                <Input 
                  type="url" 
                  placeholder="הדביקי קישור למוצר..." 
                  value={urls[0]} 
                  onChange={(e) => updateUrl(0, e.target.value)} 
                  className="flex-1 text-left text-sm sm:text-base" 
                  dir="ltr" 
                />
              </div>
              <Button 
                onClick={handleManualImport} 
                disabled={processing || urls.every((url) => !url.trim())} 
                className="px-4 py-2 w-full h-10 sm:h-12 bg-stone-800 hover:bg-stone-900 text-white text-sm sm:text-base font-medium flex items-center justify-center gap-2"
              >
                {processing ? (
                  <><Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> מעבד קישור...</>
                ) : (
                  <>הוספה לסל</>
                )}
              </Button>
            </div>
          )}

          {/* Image Import Mode */}
          {importMode === 'image' && (
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-medium text-stone-800 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" /> העלאת תמונות
              </h3>
              
              <div className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-stone-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="cart-image-upload"
                  disabled={processing}
                />
                <label 
                  htmlFor="cart-image-upload" 
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload className="w-10 h-10 text-stone-400" />
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      לחצי להעלאת תמונות
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      ניתן להעלות עד 5 תמונות של עגלת הקניות
                    </p>
                  </div>
                </label>
              </div>

              {selectedImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-stone-700">
                    נבחרו {selectedImages.length} תמונות:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedImages.map((file, idx) => (
                      <div key={idx} className="text-xs bg-stone-100 px-3 py-1 rounded-full text-stone-600">
                        {file.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleImageImport} 
                disabled={processing || selectedImages.length === 0} 
                className="px-4 py-2 w-full h-10 sm:h-12 bg-stone-800 hover:bg-stone-900 text-white text-sm sm:text-base font-medium flex items-center justify-center gap-2"
              >
                {processing ? (
                  <><Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> מנתח תמונות...</>
                ) : (
                  <>זהה פריטים מהתמונות</>
                )}
              </Button>
            </div>
          )}

          {/* Help Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: 0.3 }} 
            className="bg-rose-50 border border-rose-200 p-3 sm:p-4 mt-4 mb-6"
          >
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="bg-rose-200 p-1.5 sm:p-2">
                {importMode === 'url' ? (
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                ) : (
                  <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                )}
              </div>
              <div>
                {importMode === 'url' ? (
                  <>
                    <h4 className="text-sm sm:text-base font-medium text-stone-800 mb-1">איך מוצאים את הקישור?</h4>
                    <p className="text-xs sm:text-sm text-stone-600">
                      כנסי לאתר {siteData.domain}, בחרי מוצר והעתיקי את הקישור מסרגל הכתובת של הדפדפן
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm sm:text-base font-medium text-stone-800 mb-1">איך להעלות תמונת עגלה?</h4>
                    <p className="text-xs sm:text-sm text-stone-600">
                      צלמי צילום מסך של עגלת הקניות באתר {siteData.domain} והעלי את התמונה. 
                      המערכת תזהה אוטומטית את כל הפריטים, המחירים והפרטים.
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {status && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-6">
                <Alert className={`${status.type === 'success' ? 'border-green-200 bg-green-50' : status.type === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
                  {status.type === 'success' && <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />}
                  {status.type === 'warning' && <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />}
                  {status.type === 'error' && <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />}
                  <AlertDescription className={`text-xs sm:text-sm ${status.type === 'success' ? 'text-green-800' : status.type === 'warning' ? 'text-yellow-800' : 'text-red-800'}`}>
                    {status.message}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {onBack && (
            <div className="flex justify-between items-center mt-8">
              <div></div>
              <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 h-10 sm:h-12 px-4 sm:px-6 text-stone-600 hover:text-black hover:bg-stone-100 text-sm sm:text-base">
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" /> חזור לבחירת אתר
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}