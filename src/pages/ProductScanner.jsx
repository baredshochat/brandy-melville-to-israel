import React, { useState, useEffect } from "react";
import { ScannedProduct } from "@/entities/ScannedProduct";
import { LocalStockItem } from "@/entities/LocalStockItem";
import { SkuImage } from "@/entities/SkuImage";
import { User } from "@/entities/User";
import { CalculationSettings } from "@/entities/CalculationSettings";
import { Rates } from "@/entities/Rates";
import { InvokeLLM, UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Scan, Upload, CheckCircle, AlertCircle, ExternalLink, Trash2, Image as ImageIcon, Edit, Copy, Package, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";

export default function ProductScanner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedSite, setSelectedSite] = useState('eu');
  const [categoryUrl, setCategoryUrl] = useState('');
  const [scanProgress, setScanProgress] = useState(null);
  const [uploadingImageFor, setUploadingImageFor] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicatingProduct, setDuplicatingProduct] = useState(null);
  const [newColor, setNewColor] = useState('');
  
  // New state for batch conversion
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await User.me();
        if (userData.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUser(userData);
        await loadProducts();
      } catch (error) {
        console.error("Error loading user:", error);
        window.location.href = createPageUrl('Home');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadProducts = async () => {
    try {
      const scannedProducts = await ScannedProduct.list('-created_date', 100);
      setProducts(scannedProducts || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const normalizeLLMResult = async (res) => {
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
  };

  const scanCategoryPage = async () => {
    if (!categoryUrl.trim()) {
      alert('אנא הזיני קישור לדף קטגוריה');
      return;
    }

    setScanning(true);
    setScanProgress({ stage: 'מחלץ קישורים מהדף...', current: 0, total: 0 });

    try {
      // Step 1: Extract product links from category page
      const linksResponse = await InvokeLLM({
        prompt: `Extract ALL product links from this Brandy Melville category/collection page: ${categoryUrl}

Your task is to find EVERY product link on the page. These links typically:
- Contain "/products/" in the URL
- Point to individual product pages
- May be in format: https://[domain]/products/[product-name]

Return ONLY a JSON array of the COMPLETE product URLs (starting with https://), nothing else.
Include every single product you find, don't skip any.

Example format:
["https://eu.brandymelville.com/products/product-1", "https://eu.brandymelville.com/products/product-2"]`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            product_links: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["product_links"]
        }
      });

      const linksResult = await normalizeLLMResult(linksResponse);
      const productLinks = linksResult?.product_links || [];

      if (productLinks.length === 0) {
        alert('לא נמצאו קישורים למוצרים בדף זה');
        setScanning(false);
        return;
      }

      setScanProgress({ stage: 'סורק מוצרים...', current: 0, total: productLinks.length });

      const batchId = `scan_${Date.now()}`;
      let successCount = 0;

      // Step 2: Scan each product
      for (let i = 0; i < productLinks.length; i++) {
        const url = productLinks[i];
        setScanProgress({ stage: 'סורק מוצרים...', current: i + 1, total: productLinks.length });

        try {
          // Check if already scanned
          const existing = await ScannedProduct.filter({ product_url: url });
          if (existing && existing.length > 0) {
            console.log('Product already scanned:', url);
            continue;
          }

          // Extract product details
          const productResponse = await InvokeLLM({
            prompt: `Extract product data from: ${url}

Extract:
- product_name: Full product name (English)
- product_sku: SKU code
- product_description: Product description
- price: Numeric price only
- currency: EUR for eu.brandymelville.com, GBP for uk.brandymelville.com
- image_url: Main product image URL (preferably ending with _1500x.jpg)
- available_colors: Array of color options
- available_sizes: Array of size options
- category: Product category (tops/bottoms/dresses/accessories/other)

Return clean JSON only.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                product_name: { type: "string" },
                product_sku: { type: ["string", "null"] },
                product_description: { type: ["string", "null"] },
                price: { type: "number" },
                currency: { type: "string" },
                image_url: { type: ["string", "null"] },
                available_colors: { type: "array", items: { type: "string" } },
                available_sizes: { type: "array", items: { type: "string" } },
                category: { type: ["string", "null"] }
              },
              required: ["product_name", "price", "currency"]
            }
          });

          const productData = await normalizeLLMResult(productResponse);

          if (productData && productData.product_name) {
            await ScannedProduct.create({
              site: selectedSite,
              product_url: url,
              product_name: productData.product_name,
              product_sku: productData.product_sku || `SKU-${Date.now()}-${i}`,
              product_description: productData.product_description || '',
              original_price: productData.price,
              original_currency: productData.currency || (selectedSite === 'eu' ? 'EUR' : 'GBP'),
              ai_image_url: productData.image_url || null,
              available_colors: productData.available_colors || [],
              available_sizes: productData.available_sizes || [],
              category: productData.category || 'other',
              is_processed: false,
              needs_image: !productData.image_url,
              scan_batch: batchId
            });
            successCount++;
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error scanning product ${url}:`, error);
        }
      }

      await loadProducts();
      setScanProgress({ stage: 'הושלם!', current: successCount, total: productLinks.length });
      setTimeout(() => setScanProgress(null), 3000);

    } catch (error) {
      console.error("Error scanning category:", error);
      alert('שגיאה בסריקת הדף');
    } finally {
      setScanning(false);
    }
  };

  const handleImageUpload = async (productId, sku, file) => {
    setUploadingImageFor(productId);
    try {
      const result = await UploadFile({ file });
      const imageUrl = result.file_url;

      // Update ScannedProduct
      await ScannedProduct.update(productId, {
        uploaded_image_url: imageUrl,
        needs_image: false
      });

      // Save to SkuImage for future use
      if (sku && sku !== 'SKU לא נמצא') {
        const existing = await SkuImage.filter({ product_sku: sku });
        if (existing && existing.length > 0) {
          await SkuImage.update(existing[0].id, { image_url: imageUrl });
        } else {
          await SkuImage.create({
            product_sku: sku,
            image_url: imageUrl,
            product_name: products.find(p => p.id === productId)?.product_name || '',
            site: selectedSite
          });
        }
      }

      await loadProducts();
    } catch (error) {
      console.error("Error uploading image:", error);
      alert('שגיאה בהעלאת התמונה');
    } finally {
      setUploadingImageFor(null);
    }
  };

  const handleDelete = async (productId) => {
    if (!confirm('בטוח שרוצה למחוק?')) return;
    try {
      await ScannedProduct.delete(productId);
      await loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const markAsProcessed = async (productId) => {
    try {
      await ScannedProduct.update(productId, { is_processed: true });
      await loadProducts();
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct({ ...product });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      const { id, ...updateData } = editingProduct;
      await ScannedProduct.update(id, updateData);
      await loadProducts();
      setEditDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error updating product:", error);
      alert('שגיאה בעדכון המוצר');
    }
  };

  const handleDuplicate = (product) => {
    setDuplicatingProduct(product);
    setNewColor('');
    setDuplicateDialogOpen(true);
  };

  const handleSaveDuplicate = async () => {
    if (!duplicatingProduct || !newColor.trim()) {
      alert('אנא הזיני צבע חדש');
      return;
    }
    try {
      const { id, created_date, updated_date, created_by, ...productData } = duplicatingProduct;
      
      // Add new color to available colors if not already there
      const updatedColors = [...(productData.available_colors || [])];
      if (!updatedColors.includes(newColor)) {
        updatedColors.push(newColor);
      }

      await ScannedProduct.create({
        ...productData,
        product_name: `${productData.product_name} - ${newColor}`,
        product_sku: `${productData.product_sku}-${newColor.replace(/\s+/g, '-').toUpperCase()}`,
        available_colors: updatedColors,
        is_processed: false,
        scan_batch: `duplicate_${Date.now()}`
      });

      await loadProducts();
      setDuplicateDialogOpen(false);
      setDuplicatingProduct(null);
      setNewColor('');
    } catch (error) {
      console.error("Error duplicating product:", error);
      alert('שגיאה בשכפול המוצר');
    }
  };

  // NEW: Batch conversion functions
  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = (productList) => {
    const allIds = productList.map(p => p.id);
    const allSelected = allIds.every(id => selectedProducts.has(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        allIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // Select all
      setSelectedProducts(prev => {
        const newSet = new Set(prev);
        allIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  };

  const calculateLocalPrice = async (originalPrice, currency) => {
    try {
      // Load exchange rates and calculation settings
      const [ratesList, settingsList] = await Promise.all([
        Rates.list(),
        CalculationSettings.list()
      ]);

      const rates = ratesList && ratesList.length > 0 ? ratesList[0] : { eur: 4.0, gbp: 4.5, usd: 3.7 };
      const settings = settingsList && settingsList.length > 0 ? settingsList[0] : null;

      // Convert to ILS
      let priceILS = originalPrice;
      if (currency === 'EUR') {
        priceILS = originalPrice * (rates.eur || 4.0);
      } else if (currency === 'GBP') {
        priceILS = originalPrice * (rates.gbp || 4.5);
      } else if (currency === 'USD') {
        priceILS = originalPrice * (rates.usd || 3.7);
      }

      // Apply margin and fees if settings exist
      if (settings) {
        const commissionMultiplier = 1 + (settings.commission_pct || 0.1);
        const fxFeeMultiplier = 1 + (settings.fx_fee_pct || 0.027);
        const bufferMultiplier = 1 + (settings.buffer_pct || 0.05);
        
        priceILS = priceILS * commissionMultiplier * fxFeeMultiplier * bufferMultiplier;
        
        // Add VAT
        const vatMultiplier = 1 + (settings.vat_pct || 0.18);
        priceILS = priceILS * vatMultiplier;
      } else {
        // Default multiplier if no settings (approximately 1.5x for margin + VAT)
        priceILS = priceILS * 1.5;
      }

      // Round to nearest 10
      return Math.round(priceILS / 10) * 10;
    } catch (error) {
      console.error("Error calculating price:", error);
      // Fallback calculation
      return Math.round(originalPrice * 5 / 10) * 10; // Simple 5x conversion + rounding
    }
  };

  const convertToLocalStock = async () => {
    if (selectedProducts.size === 0) {
      alert('אנא בחרי לפחות מוצר אחד להמרה');
      return;
    }

    const productsToConvert = products.filter(p => selectedProducts.has(p.id));
    const productsWithoutImages = productsToConvert.filter(p => !p.uploaded_image_url && !p.ai_image_url);
    
    if (productsWithoutImages.length > 0) {
      const confirm = window.confirm(
        `${productsWithoutImages.length} מוצרים אינם כוללים תמונה.\nהאם להמשיך בכל זאת?`
      );
      if (!confirm) return;
    }

    setConverting(true);
    setConversionProgress({ current: 0, total: productsToConvert.length, success: 0, failed: 0 });

    try {
      for (let i = 0; i < productsToConvert.length; i++) {
        const product = productsToConvert[i];
        
        try {
          // Calculate local price
          const priceILS = await calculateLocalPrice(product.original_price, product.original_currency);
          
          // Get best available image
          const imageUrl = product.uploaded_image_url || product.ai_image_url || '';
          
          // Create LocalStockItem
          await LocalStockItem.create({
            product_name: product.product_name,
            product_description: product.product_description || '',
            image_url: imageUrl,
            price_ils: priceILS,
            color: product.available_colors && product.available_colors.length > 0 ? product.available_colors[0] : '',
            size: product.available_sizes && product.available_sizes.length > 0 ? product.available_sizes[0] : 'One Size',
            quantity_available: 1,
            is_available: true,
            category: product.category || 'other',
            internal_sku: product.product_sku,
            source_url: product.product_url,
            weight_kg: 0.3
          });
          
          // Mark scanned product as processed
          await ScannedProduct.update(product.id, { is_processed: true });
          
          setConversionProgress(prev => ({
            ...prev,
            current: i + 1,
            success: prev.success + 1
          }));
          
        } catch (error) {
          console.error(`Error converting product ${product.id}:`, error);
          setConversionProgress(prev => ({
            ...prev,
            current: i + 1,
            failed: prev.failed + 1
          }));
        }
      }
      
      // Reload products and clear selection
      await loadProducts();
      setSelectedProducts(new Set());
      
      // Show success message
      setTimeout(() => {
        setConversionProgress(prev => ({ ...prev, done: true }));
        setTimeout(() => setConversionProgress(null), 3000);
      }, 500);
      
    } catch (error) {
      console.error("Error in batch conversion:", error);
      alert('שגיאה בהמרה. נסי שוב.');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  const needsImageProducts = products.filter(p => p.needs_image && !p.is_processed);
  const processedProducts = products.filter(p => p.is_processed);
  const pendingProducts = products.filter(p => !p.is_processed && !p.needs_image);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 mb-2">סורק מוצרים</h1>
          <p className="text-stone-600">סרוק מוצרים מאתרי Brandy Melville והעלה תמונות ידנית</p>
        </div>

        {/* Scanner Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5 text-rose-600" />
              סריקת דף קטגוריה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>בחר אתר</Label>
                <div className="flex gap-3 mt-2">
                  <Button
                    variant={selectedSite === 'eu' ? 'default' : 'outline'}
                    onClick={() => setSelectedSite('eu')}
                    className={selectedSite === 'eu' ? 'bg-rose-500 hover:bg-rose-600' : ''}
                  >
                    🇪🇺 אירופה
                  </Button>
                  <Button
                    variant={selectedSite === 'uk' ? 'default' : 'outline'}
                    onClick={() => setSelectedSite('uk')}
                    className={selectedSite === 'uk' ? 'bg-rose-500 hover:bg-rose-600' : ''}
                  >
                    🇬🇧 בריטניה
                  </Button>
                </div>
              </div>

              <div>
                <Label>קישור לדף קטגוריה / קולקציה</Label>
                <Input
                  value={categoryUrl}
                  onChange={(e) => setCategoryUrl(e.target.value)}
                  placeholder={`https://${selectedSite}.brandymelville.com/collections/tops`}
                  className="mt-2"
                />
                <p className="text-xs text-stone-500 mt-1">
                  הדביקי קישור לדף עם מספר מוצרים (קטגוריה או קולקציה)
                </p>
              </div>

              <Button
                onClick={scanCategoryPage}
                disabled={scanning || !categoryUrl.trim()}
                className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white"
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                    סורק...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5 ml-2" />
                    התחל סריקה
                  </>
                )}
              </Button>

              {scanProgress && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                  <p className="font-medium text-blue-900">{scanProgress.stage}</p>
                  {scanProgress.total > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-sm text-blue-700 mb-1">
                        <span>{scanProgress.current} מתוך {scanProgress.total}</span>
                        <span>{Math.round((scanProgress.current / scanProgress.total) * 100)}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>עריכת מוצר</DialogTitle>
            </DialogHeader>
            {editingProduct && (
              <div className="space-y-4 py-4">
                <div>
                  <Label>שם מוצר</Label>
                  <Input
                    value={editingProduct.product_name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, product_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={editingProduct.product_sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, product_sku: e.target.value })}
                  />
                </div>
                <div>
                  <Label>תיאור</Label>
                  <Textarea
                    value={editingProduct.product_description || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, product_description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>מחיר</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingProduct.original_price || ''}
                      onChange={(e) => setEditingProduct({ ...editingProduct, original_price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>מטבע</Label>
                    <Select
                      value={editingProduct.original_currency || 'EUR'}
                      onValueChange={(value) => setEditingProduct({ ...editingProduct, original_currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>קטגוריה</Label>
                  <Select
                    value={editingProduct.category || 'other'}
                    onValueChange={(value) => setEditingProduct({ ...editingProduct, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tops">Tops</SelectItem>
                      <SelectItem value="bottoms">Bottoms</SelectItem>
                      <SelectItem value="dresses">Dresses</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSaveEdit} className="flex-1 bg-rose-500 hover:bg-rose-600">
                    שמור שינויים
                  </Button>
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                    ביטול
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Duplicate Dialog */}
        <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>שכפול מוצר בצבע אחר</DialogTitle>
            </DialogHeader>
            {duplicatingProduct && (
              <div className="space-y-4 py-4">
                <div className="p-3 bg-stone-50 border border-stone-200 rounded">
                  <p className="text-sm text-stone-600 mb-1">מוצר מקורי:</p>
                  <p className="font-semibold">{duplicatingProduct.product_name}</p>
                </div>
                <div>
                  <Label>צבע חדש</Label>
                  <Input
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="לדוגמה: Light Blue"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    המוצר החדש ייקרא: {duplicatingProduct.product_name} - {newColor || '...'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSaveDuplicate} className="flex-1 bg-purple-500 hover:bg-purple-600">
                    צור עותק
                  </Button>
                  <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)} className="flex-1">
                    ביטול
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Conversion Progress Dialog */}
        {conversionProgress && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96">
              <CardContent className="p-6">
                <div className="text-center">
                  {conversionProgress.done ? (
                    <>
                      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-green-900 mb-2">הומר בהצלחה!</h3>
                      <p className="text-green-700">
                        {conversionProgress.success} מוצרים הועברו למלאי המקומי
                      </p>
                      {conversionProgress.failed > 0 && (
                        <p className="text-red-600 mt-2">
                          {conversionProgress.failed} מוצרים נכשלו
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
                      <h3 className="text-xl font-bold text-stone-900 mb-4">ממיר מוצרים...</h3>
                      <div className="mb-2">
                        <div className="flex justify-between text-sm text-stone-700 mb-1">
                          <span>{conversionProgress.current} מתוך {conversionProgress.total}</span>
                          <span>{Math.round((conversionProgress.current / conversionProgress.total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${(conversionProgress.current / conversionProgress.total) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-stone-600 mt-4">
                        <span>✓ הצליחו: {conversionProgress.success}</span>
                        <span>✗ נכשלו: {conversionProgress.failed}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Products Tabs */}
        <Tabs defaultValue="needs_image" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="needs_image">
              צריך תמונה ({needsImageProducts.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              ממתין ({pendingProducts.length})
            </TabsTrigger>
            <TabsTrigger value="processed">
              מעובד ({processedProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="needs_image">
            <Card>
              <CardContent className="pt-6">
                {/* Batch Actions Bar */}
                {selectedProducts.size > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        {selectedProducts.size} מוצרים נבחרו
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={convertToLocalStock}
                        disabled={converting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {converting ? (
                          <>
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            ממיר...
                          </>
                        ) : (
                          <>
                            <Package className="w-4 h-4 ml-2" />
                            המר למלאי מקומי
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedProducts(new Set())}
                      >
                        בטל בחירה
                      </Button>
                    </div>
                  </div>
                )}

                {needsImageProducts.length === 0 ? (
                  <p className="text-center text-stone-500 py-8">אין מוצרים שצריכים תמונה</p>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-2">
                      <Checkbox
                        checked={needsImageProducts.every(p => selectedProducts.has(p.id))}
                        onCheckedChange={() => toggleSelectAll(needsImageProducts)}
                      />
                      <Label className="cursor-pointer" onClick={() => toggleSelectAll(needsImageProducts)}>
                        בחר הכל
                      </Label>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {needsImageProducts.map((product) => (
                        <Card key={product.id} className="border-orange-200">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={selectedProducts.has(product.id)}
                                  onCheckedChange={() => toggleProductSelection(product.id)}
                                />
                                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0" />
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(product)}
                                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDuplicate(product)}
                                  className="text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(product.id)}
                                  className="text-stone-400 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <h3 className="font-semibold text-sm mb-2 line-clamp-2">
                              {product.product_name}
                            </h3>
                            
                            <p className="text-xs text-stone-500 mb-2">
                              {product.product_sku}
                            </p>

                            <p className="text-sm font-medium text-stone-800 mb-3">
                              {product.original_currency === 'EUR' ? '€' : '£'}{product.original_price}
                            </p>

                            <div className="space-y-2">
                              <input
                                type="file"
                                accept="image/*"
                                id={`upload-${product.id}`}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(product.id, product.product_sku, file);
                                }}
                                disabled={uploadingImageFor === product.id}
                              />
                              <label htmlFor={`upload-${product.id}`}>
                                <Button
                                  asChild
                                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                                  disabled={uploadingImageFor === product.id}
                                >
                                  <span className="cursor-pointer flex items-center justify-center">
                                    {uploadingImageFor === product.id ? (
                                      <>
                                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                        מעלה...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="w-4 h-4 ml-2" />
                                        העלה תמונה
                                      </>
                                    )}
                                  </span>
                                </Button>
                              </label>

                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => window.open(product.product_url, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3 ml-1" />
                                פתח באתר
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardContent className="pt-6">
                {/* Batch Actions Bar */}
                {selectedProducts.size > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        {selectedProducts.size} מוצרים נבחרו
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={convertToLocalStock}
                        disabled={converting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {converting ? (
                          <>
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            ממיר...
                          </>
                        ) : (
                          <>
                            <Package className="w-4 h-4 ml-2" />
                            המר למלאי מקומי
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedProducts(new Set())}
                      >
                        בטל בחירה
                      </Button>
                    </div>
                  </div>
                )}

                {pendingProducts.length === 0 ? (
                  <p className="text-center text-stone-500 py-8">אין מוצרים ממתינים</p>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-2">
                      <Checkbox
                        checked={pendingProducts.every(p => selectedProducts.has(p.id))}
                        onCheckedChange={() => toggleSelectAll(pendingProducts)}
                      />
                      <Label className="cursor-pointer" onClick={() => toggleSelectAll(pendingProducts)}>
                        בחר הכל
                      </Label>
                    </div>
                    <div className="space-y-3">
                      {pendingProducts.map((product) => (
                        <Card key={product.id} className="border-blue-200">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <Checkbox
                                checked={selectedProducts.has(product.id)}
                                onCheckedChange={() => toggleProductSelection(product.id)}
                                className="mt-1"
                              />
                              {(product.uploaded_image_url || product.ai_image_url) && (
                                <img
                                  src={product.uploaded_image_url || product.ai_image_url}
                                  alt={product.product_name}
                                  className="w-20 h-20 object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold mb-1">{product.product_name}</h3>
                                <p className="text-xs text-stone-500 mb-2">{product.product_sku}</p>
                                <p className="text-sm text-stone-700">
                                  {product.original_currency === 'EUR' ? '€' : '£'}{product.original_price}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(product)}
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDuplicate(product)}
                                  className="text-purple-600 hover:bg-purple-50"
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => markAsProcessed(product.id)}
                                  className="bg-green-500 hover:bg-green-600"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processed">
            <Card>
              <CardContent className="pt-6">
                {processedProducts.length === 0 ? (
                  <p className="text-center text-stone-500 py-8">אין מוצרים מעובדים</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {processedProducts.map((product) => (
                      <Card key={product.id} className="border-green-200">
                        <CardContent className="p-3">
                          {(product.uploaded_image_url || product.ai_image_url) ? (
                            <img
                              src={product.uploaded_image_url || product.ai_image_url}
                              alt={product.product_name}
                              className="w-full h-32 object-cover mb-2"
                            />
                          ) : (
                            <div className="w-full h-32 bg-stone-100 flex items-center justify-center mb-2">
                              <ImageIcon className="w-8 h-8 text-stone-400" />
                            </div>
                          )}
                          <h4 className="text-xs font-medium line-clamp-2 mb-1">
                            {product.product_name}
                          </h4>
                          <p className="text-xs text-stone-600">
                            {product.original_currency === 'EUR' ? '€' : '£'}{product.original_price}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleEdit(product)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleDuplicate(product)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}