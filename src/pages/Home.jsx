import React, { useState, useEffect, useCallback } from "react";
import { Order } from "@/entities/Order";
import { CartItem } from "@/entities/CartItem";
import { User } from "@/entities/User";
import { LocalStockItem } from "@/entities/LocalStockItem";
import { SkuImage } from "@/entities/SkuImage";
import { ModeratedProductLink } from "@/entities/ModeratedProductLink";
import { InvokeLLM, SendEmail } from "@/integrations/Core";
import { AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";

// Import step components
import SiteSelector from '../components/order/SiteSelector';
import ProductPreview from '../components/order/ProductPreview';
import CartSummary from '../components/order/CartSummary';
import PriceCalculator from "../components/order/PriceCalculator";
import CustomerForm from "../components/order/CustomerForm";
import LoadingCalculation from "../components/order/LoadingCalculation";
import { Heart } from "lucide-react";
import LottieSuccess from '../components/ui/LottieSuccess';
import CartImport from '../components/order/CartImport';
import TranzilaPayment from '../components/payment/TranzilaPayment';
import { extractProductMetadata, mergeMetadataWithLLM } from '../components/order/MetadataExtractor';
import FinalPriceSummary from '../components/order/FinalPriceSummary';
import { redeemPoints } from "@/functions/redeemPoints";
import { LoyaltySettings } from "@/entities/LoyaltySettings";

// ---- Helpers ----
async function normalizeLLMResult(res) {
  try {
    if (!res) return null;
    // If it's a Fetch Response
    if (typeof Response !== 'undefined' && res instanceof Response) {
      return await res.json();
    }
    // Axios-style
    if (res && typeof res === 'object' && 'data' in res) {
      return res.data;
    }
    // Stringified JSON
    if (typeof res === 'string') {
      try { return JSON.parse(res); } catch { return { _raw: res }; }
    }
    return res; // already a plain object
  } catch (e) {
    console.error('normalizeLLMResult failed', e);
    return res;
  }
}

function nameFromUrl(url) {
  try {
    if (!url) return '';
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    const slug = path.includes('/products/')
      ? path.split('/products/')[1].split('/')[0]
      : path.split('/').filter(Boolean).pop();
    if (!slug) return '';
    const clean = decodeURIComponent(slug.split('?')[0].split('#')[0]).replace(/-/g, ' ').trim();
    return clean.split(' ').filter(Boolean).map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
  } catch {
    return '';
  }
}

// Helper: find existing image for SKU
async function findImageForSku(sku) {
  if (!sku || sku === 'SKU לא נמצא') return null;
  
  try {
    // 1. Check LocalStockItem first (highest priority)
    const localItems = await LocalStockItem.filter({ internal_sku: sku });
    if (localItems && localItems.length > 0 && localItems[0].image_url) {
      console.log('Found image in LocalStockItem:', localItems[0].image_url);
      return localItems[0].image_url;
    }
  } catch (e) {
    console.error('Error checking LocalStockItem:', e);
  }
  
  try {
    // 2. Check SkuImage (user uploaded images)
    const skuImages = await SkuImage.filter({ product_sku: sku });
    if (skuImages && skuImages.length > 0 && skuImages[0].image_url) {
      console.log('Found image in SkuImage:', skuImages[0].image_url);
      return skuImages[0].image_url;
    }
  } catch (e) {
    console.error('Error checking SkuImage:', e);
  }
  
  return null;
}

// Helper: format money professionally per currency
const formatMoney = (amount, currency = 'ILS') => {
  const n = Number(amount || 0);
  try {
    return n.toLocaleString(currency === 'ILS' ? 'he-IL' : 'en-US', { style: 'currency', currency });
  } catch {
    const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
    return `${symbol}${n.toFixed(2)}`;
  }
};

// Helper: build a professional RTL HTML email for order received (before payment confirmation)
function buildOrderReceivedEmailHTML({ order, customerName, customerEmail, trackOrderUrl, chatUrl, cart = [], totalILS, breakdown }) {
  const brandName = "Brandy Melville to Israel";
  const primary = "#443E41";
  const accent = "#FFCAD4";
  const border = "#FCE8EF";
  const muted = "#9CA3AF";
  const bg = "#FFFDFC";

  const isLocalOrder = order?.site === 'local' || (cart.length > 0 && cart[0].site === 'local');

  const itemsRows = (cart || []).map((item) => {
    const options = [item.color, item.size].filter(Boolean).join(" • ");
    return `
      <tr>
        <td style="padding:10px 0; font-size:14px; color:${primary};">${(item.product_name || '').replace(/</g,'&lt;')}</td>
        <td style="padding:10px 0; font-size:12px; color:${muted}; text-align:right; white-space:nowrap;">${options || ''}</td>
        <td style="padding:10px 0; font-size:14px; color:${primary}; text-align:left; white-space:nowrap;">× ${item.quantity || 1}</td>
      </tr>
      <tr><td colspan="3" style="border-bottom:1px solid ${border}; height:1px;"></td></tr>
    `;
  }).join("");

  const totalILSStr = formatMoney(totalILS, 'ILS');
  const deliveryTimeText = isLocalOrder ? '3-7 ימי עסקים' : '3-4 שבועות';

  return `
  <!doctype html>
  <html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>הזמנה #${order?.order_number || ""} התקבלה</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body dir="rtl" style="margin:0; background:${bg}; font-family:Assistant, Arial, Helvetica, sans-serif;">
    <div style="max-width:640px; margin:24px auto; background:#fff; border:1px solid ${border}; border-radius:8px; overflow:hidden;">
      <div style="padding:16px 20px; border-bottom:1px solid ${border}; display:flex; align-items:center; justify-content:space-between; background:#fff;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:32px; height:32px; background:${accent}; color:#fff; display:flex; align-items:center; justify-content:center; border-radius:50%;">💖</div>
          <div>
            <div style="font-size:16px; font-weight:700; color:${primary};">${brandName}</div>
            <div style="font-size:12px; color:${muted};">${isLocalOrder ? 'מלאי מקומי - אספקה מהירה' : 'הדרך הקלה להזמין ברנדי מחו״ל'}</div>
          </div>
        </div>
        <div style="font-size:12px; color:${muted};">מס׳ הזמנה: <strong style="color:${primary}">${order?.order_number || ""}</strong></div>
      </div>

      <div style="padding:24px 20px;">
        <h1 style="margin:0 0 8px 0; font-size:20px; color:${primary};">שלום ${customerName || 'יקרה'},</h1>
        <p style="margin:0 0 12px 0; font-size:14px; color:${primary}; line-height:1.6;">
          קיבלנו את ההזמנה שלך! 🎉 אנחנו כבר מתחילות לטפל בה ומתרגשות להכין ולשלוח אותה אלייך.
        </p>

        <div style="margin:16px 0; padding:12px; background:${accent}22; border:1px solid ${accent}; border-radius:6px;">
          <p style="margin:0; font-size:13px; color:${primary};">
            <strong>זמן אספקה משוער:</strong> ${deliveryTimeText}
          </p>
        </div>

        <div style="margin:18px 0; border:1px solid ${border}; padding:16px; border-radius:6px; background:#fff;">
          <h3 style="margin:0 0 12px 0; font-size:14px; color:${primary};">הפריטים שהזמנת:</h3>
          <table style="width:100%; border-collapse:collapse;">
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; gap:10px; margin-top:14px; padding:12px; background:${bg}; border:1px solid ${border}; border-radius:6px;">
            <div style="font-size:15px; color:${primary}; font-weight:700;">סה״כ</div>
            <div style="font-size:18px; color:${primary}; font-weight:800;">${totalILSStr}</div>
          </div>
        </div>

        <div style="margin:20px 0; text-align:center;">
          <a href="${trackOrderUrl}" style="display:inline-block; background:${primary}; color:#fff; text-decoration:none; padding:10px 16px; font-size:14px; font-weight:700; margin:4px 6px; border-radius:6px;">
            עקבי אחרי ההזמנה שלך
          </a>
          <a href="${chatUrl}" style="display:inline-block; background:#fff; color:${primary}; border:2px solid ${accent}; text-decoration:none; padding:10px 16px; font-size:14px; font-weight:700; margin:4px 6px; border-radius:6px;">
            צ׳אט עם הנציגה הווירטואלית
          </a>
        </div>

        <div style="margin-top:4px; padding:12px; background:${accent}22; border:1px solid ${accent}; border-radius:6px; text-align:center;">
          <span style="font-size:13px; color:${primary};">
            תודה שבחרת בנו! אנחנו על זה ומטפלות בכל אהבה ✨ אם עולה לך שאלה בדרך, אנחנו כאן בשבילך תמיד 💖
          </span>
        </div>

        <p style="margin:16px 0 0 0; font-size:12px; color:${muted}; text-align:center;">
          אישור זה נשלח לכתובת <span style="color:${primary}; font-weight:600;">${customerEmail || ''}</span>.
        </p>
      </div>

      <div style="padding:16px 20px; border-top:1px solid ${border}; background:#fff; color:${muted}; font-size:12px;">
        צוות ${brandName}
      </div>
    </div>
  </body>
  </html>`;
}

// Helper: build a professional RTL HTML email for order confirmation
function buildOrderConfirmationEmailHTML({ order, customerName, customerEmail, trackOrderUrl, chatUrl, cart = [], totalILS, breakdown }) {
  const brandName = "Brandy Melville to Israel";
  // Brandy-inspired palette
  const primary = "#443E41";   // soft dark grey-pink
  const accent = "#FFCAD4";    // baby pink
  const border = "#FCE8EF";    // light pink border
  const muted = "#9CA3AF";     // soft grey
  const bg = "#FFFDFC";        // off-white with pink hint

  // Check if this is a local order
  const isLocalOrder = order?.site === 'local' || (cart.length > 0 && cart[0].site === 'local');

  // Use breakdown (ILS-only) for item rows and subtotal
  const itemsSubtotalILS = (breakdown?.items_total_ils != null)
    ? Number(breakdown.items_total_ils)
    : Array.isArray(breakdown?.items)
      ? breakdown.items.reduce((s, it) => s + Number(it.priceGross || 0), 0)
      : null;

  const itemsRows = (cart || []).map((item, idx) => {
    const options = [item.color, item.size].filter(Boolean).join(" • ");
    const lineILS = Array.isArray(breakdown?.items) ? Number(breakdown.items[idx]?.priceGross || 0) : null;
    return `
      <tr>
        <td style="padding:10px 0; font-size:14px; color:${primary};">${(item.product_name || '').replace(/</g,'&lt;')}</td>
        <td style="padding:10px 0; font-size:12px; color:${muted}; text-align:right; white-space:nowrap;">${options || ''}</td>
        <td style="padding:10px 0; font-size:14px; color:${primary}; text-align:left; white-space:nowrap;">
          × ${item.quantity || 1}${lineILS != null ? ` &nbsp;•&nbsp; ${formatMoney(lineILS, 'ILS')}` : ''}
        </td>
      </tr>
      <tr><td colspan="3" style="border-bottom:1px solid ${border}; height:1px;"></td></tr>
    `;
  }).join("");

  const itemsSubtotalStr = itemsSubtotalILS != null ? formatMoney(itemsSubtotalILS, 'ILS') : '';
  const totalILSStr = formatMoney(totalILS, 'ILS');

  // Delivery time text based on order type
  const deliveryTimeText = isLocalOrder 
    ? '3-7 ימי עסקים (לא כולל שישי-שבת, חגים ומועדים)'
    : '3-4 שבועות';

  // Pricing explanation based on order type
  const pricingExplanation = isLocalOrder
    ? 'המחיר כולל את הפריטים + 35 ש״ח משלוח עד הבית. ללא עלויות נוספות.'
    : 'המחיר ששילמת כולל כבר את כל העלויות הנלוות – מסים, מכס ועמלות ייבוא – אין הפתעות.';

  return `
  <!doctype html>
  <html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>אישור הזמנה #${order?.order_number || ""}</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body dir="rtl" style="margin:0; background:${bg}; font-family:Assistant, Arial, Helvetica, sans-serif;">
    <div style="max-width:640px; margin:24px auto; background:#fff; border:1px solid ${border}; border-radius:8px; overflow:hidden;">
      <div style="padding:16px 20px; border-bottom:1px solid ${border}; display:flex; align-items:center; justify-content:space-between; background:#fff;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:32px; height:32px; background:${accent}; color:#fff; display:flex; align-items:center; justify-content:center; border-radius:50%;">💖</div>
          <div>
            <div style="font-size:16px; font-weight:700; color:${primary};">${brandName}</div>
            <div style="font-size:12px; color:${muted};">${isLocalOrder ? 'מלאי מקומי - אספקה מהירה' : 'הדרך הקלה להזמין ברנדי מחו״ל'}</div>
          </div>
        </div>
        <div style="font-size:12px; color:${muted};">מס׳ הזמנה: <strong style="color:${primary}">${order?.order_number || ""}</strong></div>
      </div>

      <div style="padding:24px 20px;">
        <h1 style="margin:0 0 8px 0; font-size:20px; color:${primary};">שלום ${customerName || 'יקרה'},</h1>
        <p style="margin:0 0 12px 0; font-size:14px; color:${primary}; line-height:1.6;">
          איזה כיף שבאת אלינו! ההזמנה שלך התקבלה בהמון אהבה, ואנחנו כבר מתרגשות להכין ולשלוח אותה אלייך. 
          ${isLocalOrder ? '⚡ <strong style="color:${primary}">(הפריטים זמינים במלאי המקומי שלנו ויישלחו בימים הקרובים!)</strong>' : ''}
          <br><strong style="color:${primary}">חשוב לדעת:</strong> ${pricingExplanation}
        </p>

        ${isLocalOrder ? `
        <div style="margin:16px 0; padding:12px; background:${accent}22; border:1px solid ${accent}; border-radius:6px;">
          <p style="margin:0; font-size:13px; color:${primary};">
            <strong>אספקה מהירה:</strong> זמן אספקה משוער: ${deliveryTimeText}
          </p>
        </div>
        ` : ''}

        <div style="margin:18px 0; border:1px solid ${border}; padding:16px; border-radius:6px; background:#fff;">
          <table style="width:100%; border-collapse:collapse;">
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div style="display:flex; justify-content:space-between; gap:10px; margin-top:12px; padding-top:12px; border-top:1px dashed ${border};">
            <div style="font-size:14px; color:${muted};">סיכום פריטים</div>
            <div style="font-size:15px; color:${primary}; font-weight:600;">${itemsSubtotalStr}</div>
          </div>
          <div style="display:flex; justify-content:space-between; gap:10px; margin-top:6px;">
            <div style="font-size:14px; color:${muted};">משלוח עד הבית</div>
            <div style="font-size:15px; color:${primary};">₪35.00</div>
          </div>

          <div style="display:flex; justify-content:space-between; gap:10px; margin-top:14px; padding:12px; background:${bg}; border:1px solid ${border}; border-radius:6px;">
            <div style="font-size:15px; color:${primary}; font-weight:700;">סה״כ לתשלום</div>
            <div style="font-size:18px; color:${primary}; font-weight:800;">${totalILSStr}</div>
          </div>

          <div style="margin-top:10px; text-align:center;">
            <span style="font-size:12px; color:${muted};">
              מחיר סופי, כולל הכל. ${isLocalOrder ? 'אספקה מהירה מהמלאי המקומי שלנו.' : 'מכס, מסים ועמלות ייבוא כבר כלולים.'} אין עלויות נוספות.
            </span>
          </div>
        </div>

        <div style="margin:20px 0; text-align:center;">
          <a href="${trackOrderUrl}" style="display:inline-block; background:${primary}; color:#fff; text-decoration:none; padding:10px 16px; font-size:14px; font-weight:700; margin:4px 6px; border-radius:6px;">
            עקבי אחרי ההזמנה שלך
          </a>
          <a href="${chatUrl}" style="display:inline-block; background:#fff; color:${primary}; border:2px solid ${accent}; text-decoration:none; padding:10px 16px; font-size:14px; font-weight:700; margin:4px 6px; border-radius:6px;">
            צ׳אט עם הנציגה הווירטואלית
          </a>
        </div>

        <div style="margin-top:4px; padding:12px; background:${accent}22; border:1px solid ${accent}; border-radius:6px; text-align:center;">
          <span style="font-size:13px; color:${primary};">
            תודה שבחרת בנו! ${isLocalOrder ? 'ההזמנה שלך תגיע אלייך במהירות מהמלאי המקומי 🚀' : 'אנחנו על זה ומטפלות בכל אהבה ✨'} אם עולה לך שאלה בדרך, אנחנו כאן בשבילך תמיד 💖
          </span>
        </div>

        <p style="margin:16px 0 0 0; font-size:12px; color:${muted}; text-align:center;">
          אישור זה נשלח לכתובת <span style="color:${primary}; font-weight:600;">${customerEmail || ''}</span>.
        </p>
      </div>

      <div style="padding:16px 20px; border-top:1px solid ${border}; background:#fff; color:${primary}; font-size:12px;">
        <div style="margin-bottom:6px;">
          <strong>בלי הפתעות:</strong> ${pricingExplanation} אין תשלומים נוספים לאחר ההזמנה.
        </div>
        <div style="color:${muted};">צוות ${brandName}</div>
      </div>
    </div>
  </body>
  </html>`;
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [selectedSite, setSelectedSite] = useState('');
  const [cart, setCart] = useState([]); // always an array
  const [productUrl, setProductUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [totalPriceILS, setTotalPriceILS] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [user, setUser] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [confirmingItem, setConfirmingItem] = useState(false); // NEW: prevent double-create
  const [redeemedPoints, setRedeemedPoints] = useState(0);
  const [maxRedeemPct, setMaxRedeemPct] = useState(0.3);

  const [userLoaded, setUserLoaded] = useState(false);
  
  useEffect(() => { 
    User.me()
      .then(u => { setUser(u); setUserLoaded(true); })
      .catch(() => { setUser(null); setUserLoaded(true); }); 
      
    LoyaltySettings.filter({ setting_key: 'max_redeem_percentage' })
      .then(settings => {
        if (settings && settings.length > 0) {
          setMaxRedeemPct(parseFloat(settings[0].value));
        }
      })
      .catch(console.error);
  }, []);

  // Helper: identify 404/not found errors in various shapes
  const isNotFoundError = (err) => {
    const msg = String(err?.message || '').toLowerCase();
    return err?.response?.status === 404 || msg.includes('404') || msg.includes('not found');
  };

  const refreshCart = () => { window.dispatchEvent(new CustomEvent('refreshCart')); };

  const loadCart = useCallback(async () => {
    if (!selectedSite) { setCart([]); return; }
    try {
      // Load cart items for the selected site
      // The backend will automatically filter by created_by for logged-in users
      const items = await CartItem.filter({ site: selectedSite });
      setCart(Array.isArray(items) ? items : []);
    } catch (e) {
      console.error("Failed to load cart items:", e);
      setCart([]);
    }
  }, [selectedSite]);

  // Load cart when site changes
  useEffect(() => { if (selectedSite && loadCart) { loadCart(); } }, [selectedSite, loadCart]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const siteParam = params.get('site');
      const stepParam = params.get('step');
      const editItemIdParam = params.get('editItemId');
      const productUrlParam = params.get('productUrl');

      const handleEditing = async (itemId) => {
        setLoading(true);
        try {
          let itemToEdit = await CartItem.get(itemId);
          // Normalize possible Response
          if (typeof Response !== 'undefined' && itemToEdit instanceof Response) {
            itemToEdit = await itemToEdit.json();
          }
          if (itemToEdit) {
            setEditingItem(itemToEdit);
            setCurrentItem(itemToEdit);
            if (siteParam) setSelectedSite(siteParam);
            setStep(3);
          }
        } catch (e) {
          console.error("Failed to load item for editing", e);
          
          // If item was deleted (404), show message and redirect
          if (isNotFoundError(e)) {
            alert('הפריט שניסית לערוך כבר נמחק מהסל. מחזירים לעמוד הראשי.');
            // Clear URL parameters
            window.history.replaceState({}, '', createPageUrl('Home'));
            // Go to step 1 (site selection) or step 4 (cart) if we have a site
            if (siteParam) {
              setSelectedSite(siteParam);
              setStep(4);
            } else {
              setStep(1);
            }
          } else {
            // For other errors, try to navigate based on URL parameters
            if (siteParam) setSelectedSite(siteParam);
            if (stepParam && !isNaN(parseInt(stepParam))) {
              setStep(parseInt(stepParam));
            } else {
              setStep(1);
            }
          }
        } finally { 
          setLoading(false); 
        }
      };

      if (editItemIdParam) {
        handleEditing(editItemIdParam);
      } else if (productUrlParam && siteParam) {
        // Handle direct product URL from query parameter
        setSelectedSite(siteParam);
        setProductUrl(productUrlParam);
        // Automatically load the product
        setTimeout(() => handleUrlSubmit(productUrlParam), 100);
      } else if (siteParam) {
        // Set site and let the useEffect for loadCart handle loading
        setSelectedSite(siteParam);
        // Step will be set after cart is loaded via separate effect
        if (stepParam && !isNaN(parseInt(stepParam))) {
          // Defer step change to allow cart to load first
          setTimeout(() => setStep(parseInt(stepParam)), 100);
        }
      } else if (stepParam && !isNaN(parseInt(stepParam))) {
        setStep(parseInt(stepParam));
      }
    } catch (error) {
      console.error("Error processing URL parameters:", error);
    }
  }, []);

  const handleSiteSelect = (siteId) => {
    // NEW: If local stock is selected, redirect to LocalStock page
    if (siteId === 'local') {
      window.location.href = createPageUrl('LocalStock');
      return;
    }
    
    setSelectedSite(siteId);
    setCart([]);
    setEditingItem(null);
    setStep(2);
  };

  const handleCartImported = async (items) => {
    const safe = Array.isArray(items) ? items : [];
    await loadCart();
    
    // If only one item was imported, go to edit it
    if (safe.length === 1) {
      setEditingItem(safe[0]);
      setCurrentItem(safe[0]);
      setStep(3);
    } else {
      // Multiple items - go to cart view
      setStep(4);
    }
  };

  const handleUrlSubmit = async (url) => {
    setLoading(true);
    // שמירה על הקישור המקורי בדיוק כפי שהלקוחה הדביקה
    const originalUrl = url.trim();
    setProductUrl(originalUrl);
    try {
      const siteInfo = { us: { currency: 'USD' }, eu: { currency: 'EUR' }, uk: { currency: 'GBP' } };

      // PRIORITY: Check if this URL has a moderated price override
      console.log('🔍 Checking for moderated price for URL:', originalUrl);
      let moderatedLink = null;
      try {
        // Normalize URL for comparison (remove trailing slashes, query params, anchors)
        const normalizeUrl = (url) => {
          try {
            const u = new URL(url);
            // Keep only protocol, host, and pathname (no query, no hash)
            return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, '').toLowerCase();
          } catch {
            return url.trim().replace(/\/$/, '').toLowerCase();
          }
        };
        
        const normalizedOriginal = normalizeUrl(originalUrl);
        console.log('Normalized URL:', normalizedOriginal);
        
        // Get all active moderated links and find a match
        const allModeratedLinks = await ModeratedProductLink.filter({ is_active: true });
        if (allModeratedLinks && allModeratedLinks.length > 0) {
          for (const link of allModeratedLinks) {
            const normalizedStored = normalizeUrl(link.original_url);
            if (normalizedStored === normalizedOriginal) {
              moderatedLink = link;
              console.log('✅ Found moderated price:', moderatedLink);
              break;
            }
          }
        }
        
        if (!moderatedLink) {
          console.log('No moderated price found, proceeding with AI extraction');
        }
      } catch (e) {
        console.log('Error checking moderated links:', e);
      }

      // If we have a moderated price, use it directly and skip AI extraction
      if (moderatedLink) {
        const expectedCurrency = siteInfo[selectedSite]?.currency || 'USD';

        // Use the moderated data
        const productName = moderatedLink.product_name || nameFromUrl(url) || 'מוצר Brandy Melville';
        const extractedSku = moderatedLink.product_sku || 'SKU לא נמצא';

        // Check for existing image
        let finalImageUrl = null;
        if (extractedSku && extractedSku !== 'SKU לא נמצא') {
          const existingImage = await findImageForSku(extractedSku);
          if (existingImage) {
            console.log('✅ Using existing image from database for SKU:', extractedSku, existingImage);
            finalImageUrl = existingImage;
          }
        }

        setCurrentItem({
          product_url: originalUrl,
          product_name: productName,
          product_sku: extractedSku,
          product_description: moderatedLink.admin_notes || 'תיאור לא זמין',
          original_price: moderatedLink.moderated_price,
          color: '',
          size: '',
          quantity: 1,
          original_currency: moderatedLink.moderated_currency,
          item_image_url: finalImageUrl,
          available_colors: [],
          available_sizes: [],
          site: selectedSite,
          _from_moderated_link: true // Flag to indicate this came from a moderated link
        });
        setStep(3);
        setLoading(false);
        return;
      }

      // שלב 1: חילוץ מטא-דאטה מובנה (מהיר ומדויק)
      console.log('🔍 Extracting structured metadata...');
      const metadata = await extractProductMetadata(originalUrl);

      const raw = await InvokeLLM({
        prompt: `You are extracting product data from this Brandy Melville URL: ${url}

      CRITICAL INSTRUCTIONS - READ CAREFULLY:

      SKU (Product Code) - HIGHEST PRIORITY:
      The SKU is the MOST important field. You MUST extract it EXACTLY as shown on the page.
      - Look in JSON-LD script for "sku" field - use EXACT value
      - Look for "SKU: XXXXX" or "Product Code: XXXXX" text on page
      - Check URL path for codes like "M065L-622BAG720000"
      - Look in hidden inputs or data-sku attributes
      - DO NOT INVENT OR GUESS - if not found, return null
      - The SKU must be the EXACT string from the website

      PRODUCT NAME:
      - Look for: page title, <h1>, og:title meta tag, or product heading
      - Remove any " | Brandy Melville" suffix
      - Keep the original English name
      - Examples: "Duffel Bag", "Priscilla Pants", "Rosa Top"

      PRICE - CRITICAL - READ VERY CAREFULLY:
      ⚠️ THIS IS THE MOST IMPORTANT FIELD - GET IT RIGHT!
      
      YOU MUST EXTRACT THE EXACT PRICE THE CUSTOMER PAYS RIGHT NOW.
      
      What to look for (IN THIS ORDER):
      1. Look in JSON-LD structured data: <script type="application/ld+json"> for "price" or "offers.price"
      2. Look for meta tags: <meta property="product:price:amount" content="XX.XX">
      3. Look for the main displayed price near "Add to Cart" or "Add to Bag" button
      4. Look for price in the page's main heading area with the product name
      
      ABSOLUTE RULES:
      - ❌ NEVER use crossed-out prices (text-decoration: line-through)
      - ❌ NEVER use "was" / "original" / "regular" prices
      - ❌ NEVER use prices with any strikethrough styling
      - ✅ ONLY use the CURRENT ACTIVE price (the one customer will actually pay)
      - ✅ If JSON-LD data exists, it is usually the most accurate source
      - ✅ Return ONLY the numeric value (e.g., for £15.00 return: 15)
      - ✅ If you see both sale and regular price, take the LOWER one (sale price)
      - ⚠️ DOUBLE CHECK: Does this price make sense for clothing? (typically £10-60, $15-80, €15-70)
      
      Example scenarios:
      - Page shows: "£24.00" (crossed out) and "£15.00" → Return: 15
      - JSON-LD shows: "price": "15.00" → Return: 15
      - Page shows only: "£15" → Return: 15

      DESCRIPTION:
      - Find the product description text
      - Usually under "Product Description:", "Details:", or similar heading
      - If not found, return null

      COLORS & SIZES:
      - Extract ALL available options from dropdown menus, radio buttons, selection buttons
      - Look for labels like "Color:", "Size:", "Options:"
      - Return complete lists

      IMPORTANT: Return valid data for at least product_name and price. SKU must be exact or null. Price must be the CURRENT active price only.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            product_sku: { type: ["string", "null"] },
            product_description: { type: ["string", "null"] },
            price: { type: "number" },
            available_colors: { type: "array", items: { type: "string" } },
            available_sizes: { type: "array", items: { type: "string" } },
            currency_found: { type: "string" }
          },
          required: ["product_name", "price", "currency_found"]
        }
      });

      const llmResult = await normalizeLLMResult(raw);
      console.log("LLM extraction result:", llmResult);

      // שלב 3: שילוב תוצאות (מטא-דאטה + LLM)
      const result = mergeMetadataWithLLM(metadata, llmResult);
      console.log("✅ Final merged result:", result);

      // Fallback name from URL if needed
      let productName = (typeof result?.product_name === 'string' ? result.product_name.trim() : '') || nameFromUrl(url) || '';
      if (!productName) {
        throw new Error("לא הצלחנו לזהות את שם המוצר. אנא נסי שוב או בחרי מוצר אחר.");
      }

      const priceNum = parseFloat(result?.price);
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        throw new Error(`לא הצלחנו לזהות את המחיר של המוצר. המידע שנמצא: ${result?.price || 'לא זמין'}. אנא נסי שוב או בחרי מוצר אחר.`);
      }

      const expectedCurrency = siteInfo[selectedSite]?.currency || 'USD';
      const extractedSku = result?.product_sku || 'SKU לא נמצא';

      // PRIORITY: Check our databases first for uploaded images
      console.log('🔍 Checking for existing image for SKU:', extractedSku);
      let finalImageUrl = null;
      
      if (extractedSku && extractedSku !== 'SKU לא נמצא') {
        const existingImage = await findImageForSku(extractedSku);
        if (existingImage) {
          console.log('✅ Using existing image from database for SKU:', extractedSku, existingImage);
          finalImageUrl = existingImage;
        }
      }

      setCurrentItem({
        product_url: originalUrl, // שומרים את הקישור המקורי בדיוק
        product_name: productName,
        product_sku: extractedSku,
        product_description: result?.product_description || 'תיאור לא זמין',
        original_price: priceNum,
        color: '',
        size: '',
        quantity: 1,
        original_currency: expectedCurrency,
        item_image_url: finalImageUrl,
        available_colors: Array.isArray(result?.available_colors) ? result.available_colors : [],
        available_sizes: Array.isArray(result?.available_sizes) ? result.available_sizes : [],
        site: selectedSite
      });
      setStep(3);
    } catch (error) {
      console.error('Error fetching product details:', error);
      alert(`שגיאה בשליפת פרטי המוצר:\n\n${error.message}\n\nטיפ: וודאי שהקישור מוביל לעמוד מוצר בודד ושהמוצר זמין לרכישה.`);
    } finally { setLoading(false); }
  };

  const handleProductConfirm = async (product) => {
        if (confirmingItem) return;
    setConfirmingItem(true);

    const siteForOperation = editingItem ? editingItem.site : selectedSite;
    if (!siteForOperation) {
      alert("אנא בחרי אתר תחילה.");
      setConfirmingItem(false);
      return;
    }

    try {
      const targetId = product.id || editingItem?.id;
      if (targetId) {
        // Check if item exists before updating
        try {
          await CartItem.get(targetId);
          await CartItem.update(targetId, { ...product, site: product.site || siteForOperation });
        } catch (e) {
          if (isNotFoundError(e)) {
            // Item doesn't exist anymore, create a new one instead
            const productWithSite = { ...product, site: siteForOperation };
            delete productWithSite.id; // Remove the old ID
            delete productWithSite.created_date;
            delete productWithSite.updated_date;
            delete productWithSite.created_by_id;
            delete productWithSite.is_sample;
            await CartItem.create(productWithSite);
          } else {
            throw e; // re-throw if it's not a 404
          }
        }
      } else {
        const productWithSite = { ...product, site: siteForOperation };
        let created = await CartItem.create(productWithSite);
        if (typeof Response !== 'undefined' && created instanceof Response) {
          created = await created.json();
        } else if (created && created.data) {
          created = created.data;
        }
      }
      refreshCart();
      await loadCart();
      setCurrentItem(null);
      setEditingItem(null);
      setProductUrl('');
      setStep(3.5); // Go to loading screen before cart
    } catch (error) {
      console.error("Error confirming product:", error);
      alert("שגיאה בשמירת הפריט לסל.");
    } finally {
      setConfirmingItem(false);
    }
  };

  const handleRemoveFromCart = async (itemId) => {
    try {
      // Pre-check existence; if not found, just remove locally and bail out
      try {
        await CartItem.get(itemId);
      } catch (e) {
        if (isNotFoundError(e)) {
          setCart(cur => cur.filter(item => item.id !== itemId));
          refreshCart();
          return; // do not call delete on a non-existing item
        } else {
          throw e; // rethrow if it's not a 404
        }
      }

      // Proceed with delete only if item exists (or the pre-check passed)
      await CartItem.delete(itemId);
      setCart(cur => cur.filter(item => item.id !== itemId));
      refreshCart();
    } catch (error) {
      console.error("Error removing item from cart:", error);
      if (isNotFoundError(error)) {
        // Remove from UI if backend already deleted it
        setCart(cur => cur.filter(item => item.id !== itemId));
        refreshCart();
      } else {
        loadCart();
        alert("שגיאה במחיקת פריט מהסל. נסה שוב.");
      }
      // Removed: throw error;  // prevent bubbling to global error collector
    }
  };

  const handleUpdateCartQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await CartItem.update(itemId, { quantity: newQuantity });
      loadCart();
    } catch (error) {
      console.error("Error updating cart quantity:", error);
      if (isNotFoundError(error)) {
        setCart(cur => cur.filter(item => item.id !== itemId));
        refreshCart();
        alert("הפריט שרצית לעדכן לא נמצא. הוא הוסר מהסל.");
      } else {
        loadCart();
        alert("שגיאה בעדכון כמות הפריט. נסה שוב.");
      }
    }
  };

  const handleEditItem = (item) => { setEditingItem(item); setCurrentItem(item); setStep(3); };

  const handlePriceConfirm = (price, weight, breakdown) => { 
    setTotalPriceILS(price); 
    setTotalWeight(weight); 
    setPriceBreakdown(breakdown); 
    if (breakdown && breakdown.redeemedPoints) {
      setRedeemedPoints(breakdown.redeemedPoints);
    }
    setStep(6); 
  };

  // CHANGED: on customer submit create order with awaiting_payment status
  // Cart items are NOT deleted until payment is confirmed
  const handleCustomerSubmit = async (data) => {
    setCustomerData(data);
    setLoading(true);
    try {
      const order = await submitOrder(data);
      setCurrentOrder(order);

      // Do NOT clear cart items here - they will be cleared only after successful payment

      setStep(7); // Go to Tranzila payment step
    } catch (error) {
      console.error("Error creating order:", error);
      alert('שגיאה ביצירת ההזמנה. אנא נסי שוב.');
    } finally {
      setLoading(false);
    }
  };

  // CHANGED: submitOrder accepts override customer data
  const submitOrder = async (overrideCustomerData = null) => {
    setLoading(true); // Ensure loading is active here, as submitOrder might set it to false
    try {
      const orderNumber = `BM${Date.now()}`;
              const customerPayload = overrideCustomerData || customerData || {}; // Use override if provided

              // הוספת customer_price_ils לכל פריט מתוך ה-breakdown
              const itemsWithCustomerPrice = cart.map((item, idx) => {
                const breakdownItem = priceBreakdown?.items?.[idx];
                return {
                  ...item,
                  customer_price_ils: breakdownItem?.fullPrice || 0
                };
              });

              let newOrder = await Order.create({
                order_number: orderNumber,
                site: selectedSite,
                items: itemsWithCustomerPrice,
              total_price_ils: totalPriceILS,
              total_weight_kg: totalWeight,
              price_breakdown: priceBreakdown,
              ...customerPayload, // Use the customerPayload
              status: 'awaiting_payment',
              payment_status: 'pending'
              });
      // Normalize possible Response shapes
      if (typeof Response !== 'undefined' && newOrder instanceof Response) {
        newOrder = await newOrder.json();
      } else if (newOrder && newOrder.data) {
        newOrder = newOrder.data;
      }
      return newOrder;
    } catch (error) {
      console.error("Order submission error:", error);
      alert('שגיאה בשליחת ההזמנה. אנא נסי שוב.');
      throw error;
    } finally { setLoading(false); }
  };

  // Handle successful payment completion
  const handlePaymentSuccess = async () => {
    console.log('🔥 handlePaymentSuccess called');
    console.log('🔥 Current cart:', cart);
    
    try {
      // Redeem points if used
      if (redeemedPoints > 0) {
        try {
          await redeemPoints({
            points_to_redeem: redeemedPoints,
            order_total: totalPriceILS
          });
        } catch (e) {
          console.error("Failed to redeem points:", e);
        }
      }

      // Update order payment status AND move to pending (confirmed) status
      if (currentOrder?.id) {
        await Order.update(currentOrder.id, { 
          payment_status: 'completed',
          status: 'pending' // Move from awaiting_payment to pending
        });
        
        // Update local stock quantities for local items
        const localItems = cart.filter(item => item.site === 'local' || item.product_type === 'local');
        console.log('🔥 Local items found:', localItems);
        
        if (localItems.length > 0) {
          for (const item of localItems) {
            console.log('🔥 Processing item:', item.product_name, 'SKU:', item.product_sku, 'internal_sku:', item.internal_sku);
            
            // Find the stock item by matching SKU or name
            const stockItems = await LocalStockItem.filter({
              internal_sku: item.product_sku || item.internal_sku
            });
            
            console.log('🔥 Stock items found:', stockItems);
            
            if (stockItems && stockItems.length > 0) {
              const stockItem = stockItems[0];
              const newQuantity = Math.max(0, stockItem.quantity_available - item.quantity);
              console.log('🔥 Updating stock:', stockItem.id, 'from', stockItem.quantity_available, 'to', newQuantity);
              
              await LocalStockItem.update(stockItem.id, {
                quantity_available: newQuantity
              });
              
              console.log('🔥 Stock updated successfully');
            } else {
              console.log('🔥 ERROR: No stock item found for SKU:', item.product_sku || item.internal_sku);
            }
          }
        } else {
          console.log('🔥 No local items in cart');
        }
      }

      // Earn points for completed order
      try {
        await base44.functions.invoke('earnPoints', { order_id: currentOrder.id });
        console.log('Points earned successfully');
      } catch (e) {
        console.error('Failed to earn points:', e);
      }

      // Do NOT delete cart items - they are saved in the order anyway
      // The cart will be cleared when user starts a new order (selects a site)

      const trackOrderPageUrl = new URL(createPageUrl('TrackOrder'), window.location.origin).href;
      const chatPageUrl = new URL(createPageUrl('Chat'), window.location.origin).href;

      // Build email values (ILS-only)
      const effectiveCustomer = customerData || {};
      
      // Determine recipient email - prefer logged-in user's email, fallback to customer email
      const recipientEmail = (user && user.email) ? user.email : effectiveCustomer.customer_email;

      const emailHtml = buildOrderConfirmationEmailHTML({
        order: currentOrder,
        customerName: effectiveCustomer.customer_name,
        customerEmail: recipientEmail,
        trackOrderUrl: trackOrderPageUrl,
        chatUrl: chatPageUrl,
        cart,
        totalILS: totalPriceILS,
        breakdown: priceBreakdown
      });

      // Send confirmation email
      if (recipientEmail) {
        try {
          await SendEmail({
            from_name: "Brandy Melville to Israel",
            to: recipientEmail,
            subject: `אישור הזמנה #${currentOrder?.order_number} • ${formatMoney(totalPriceILS, 'ILS')}`,
            body: emailHtml
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      }

      setStep(8); // Go to success page
    } catch (error) {
      console.error("Error completing payment:", error);
      setStep(8); // Still show success since payment went through Tranzila
    }
  };

  const resetFlow = () => {
    setStep(1); setSelectedSite(''); setCart([]); setProductUrl(''); setCurrentItem(null); setEditingItem(null);
    setCustomerData(null); setTotalPriceILS(0); setTotalWeight(0); setPriceBreakdown(null); setCurrentOrder(null); loadCart();
  };

  const renderStep = () => {
    const safeCart = Array.isArray(cart) ? cart : [];
    switch (step) {
      case 1: return <SiteSelector onSiteSelect={handleSiteSelect} />;
      case 2: return <CartImport site={selectedSite} onImportComplete={handleCartImported} onBack={() => setStep(1)} loading={loading} />;
      case 3: return <ProductPreview productData={currentItem} onConfirm={handleProductConfirm} onBack={() => { setStep(2); setEditingItem(null); }} />;
      case 3.5: return <LoadingCalculation onComplete={() => setStep(4)} />;
      case 4: return <CartSummary cart={safeCart} onRemove={handleRemoveFromCart} onUpdateQuantity={handleUpdateCartQuantity} onEdit={handleEditItem} onAddAnother={() => setStep(2)} onCheckout={() => setStep(5)} onBack={() => setStep(1)} />;
      case 5: {
        const siteForCalculation = selectedSite || (safeCart.length > 0 ? safeCart[0].site : '');
        return <PriceCalculator cart={safeCart} site={siteForCalculation} onConfirm={handlePriceConfirm} onBack={() => setStep(4)} />;
      }
      case 6: return <CustomerForm onSubmit={handleCustomerSubmit} onBack={() => setStep(5)} />;
      case 7: // Tranzila Payment
        return (
          <div className="max-w-2xl mx-auto">
            <FinalPriceSummary 
              finalPriceILS={totalPriceILS} 
              breakdown={priceBreakdown}
              userPoints={user?.points_balance || 0}
              onRedeemPoints={setRedeemedPoints}
              redeemedAmount={redeemedPoints}
              maxRedeemAmount={Math.floor(totalPriceILS * maxRedeemPct)}
            />
            <div className="mt-6">
              <TranzilaPayment
                order={currentOrder}
                totalAmount={totalPriceILS}
                customerData={customerData}
                cart={cart}
                onSuccess={handlePaymentSuccess}
                onBack={() => setStep(6)}
              />
            </div>
          </div>
        );
      case 8: // Success page
        return (
          <div className="text-center p-8 max-w-lg mx-auto bg-stone-50 border-2 border-rose-200/50 shadow-lg" dir="rtl">
            <div className="flex justify-center mb-6"><LottieSuccess size={100} /></div>
            <h2 className="text-3xl font-semibold text-stone-900 mb-3">ההזמנה נשלחה בהצלחה!</h2>
            <p className="text-base text-stone-600 mb-2">מספר הזמנה: {currentOrder?.order_number}</p>
            <p className="text-base text-stone-600 mb-2">סכום לתשלום: ₪{Math.round(totalPriceILS)}</p>
            <p className="text-base text-stone-600 mb-8">אישור הזמנה נשלח למייל.</p>
            <button onClick={resetFlow} className="bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 px-8 transition-all duration-300 shadow-lg flex items-center gap-2 mx-auto">
              <Heart className="w-4 h-4 fill-white" /> בצעי הזמנה חדשה
            </button>
          </div>
        );
      default: return <SiteSelector onSiteSelect={handleSiteSelect} />;
    }
  };

  return (
    <div className="container mx-auto" dir="rtl">
      <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
    </div>
  );
  }