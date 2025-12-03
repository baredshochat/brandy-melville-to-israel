import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Order } from "@/entities/Order";
import { User } from "@/entities/User";
import { SendEmail } from "@/integrations/Core";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { subDays, format, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import {
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  Search,
  Filter,
  Download,
  BarChart3,
  Settings,
  Edit,
  Eye,
  Calculator,
  AlertTriangle,
  Copy,
  Mail,
  MoreHorizontal,
  FileText,
  Truck,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";

import { OrderStatusSteps } from "@/entities/OrderStatusSteps";

// Import components
import OrderDetailsDrawer from '../components/admin/OrderDetailsDrawer';
import BulkActionsBar from '../components/admin/BulkActionsBar';
import SavedViewsDropdown from '../components/admin/SavedViewsDropdown';
import ExportDialog from '../components/admin/ExportDialog';
import ShoppingListTab from '../components/admin/orders/ShoppingListTab';
import SupplierTrackingTab from '../components/admin/orders/SupplierTrackingTab';
import InlineStatusSelect from '../components/admin/InlineStatusSelect';

// NEW: add dialog imports for email preview
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// Import pricing engine for calculations
import { calcFinalPriceILS } from '../components/pricing/PricingEngine';

// NEW: validators for email and order completeness
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());

const isCompleteOrder = (order) => {
  if (!order) return false;
  const hasItems = Array.isArray(order.items) && order.items.length > 0;
  const hasName = !!(order.customer_name && String(order.customer_name).trim());
  const hasEmail = isValidEmail(order.customer_email);
  const hasAddress = !!(order.shipping_address && String(order.shipping_address).trim());
  const hasCity = !!(order.city && String(order.city).trim());
  return hasItems && hasName && hasEmail && hasAddress && hasCity;
};

// Status configuration
const statusConfig = {
  pending: { label: "ממתין", style: "bg-stone-200 text-stone-800", color: "stone" },
  ordered: { label: "הוזמן", style: "bg-gray-200 text-gray-800", color: "gray" },
  warehouse: { label: "במחסן", style: "bg-blue-100 text-blue-800", color: "blue" },
  shipping_to_israel: { label: "בדרך לישראל", style: "bg-orange-100 text-orange-800", color: "orange" },
  in_israel: { label: "בארץ", style: "bg-purple-100 text-purple-800", color: "purple" },
  shipping_to_customer: { label: "בדרך ללקוחה", style: "bg-amber-100 text-amber-800", color: "amber" },
  delivered: { label: "נמסר", style: "bg-green-100 text-green-800", color: "green" }
};

const siteInfo = {
  us: { name: 'ארה״ב', flag: '🇺🇸', currency: 'USD' },
  eu: { name: 'אירופה', flag: '🇪🇺', currency: 'EUR' },
  uk: { name: 'בריטניה', flag: '🇬🇧', currency: 'GBP' }
};

// The new function provided by the user for accurate net profit calculation
function computeNetProfit(snapshot) {
  const vat = snapshot.vat_pct;

  const domesticIncomeEx = snapshot.domestic_vat_applies
    ? snapshot.domestic_charge_to_customer / (1 + vat)
    : snapshot.domestic_charge_to_customer;

  const domesticCostEx = snapshot.domestic_cost_includes_vat
    ? snapshot.domestic_ship_cost_ils / (1 + vat)
    : snapshot.domestic_ship_cost_ils;

  const revenueEx = snapshot.priceExVAT + domesticIncomeEx;

  let feeBase;
  switch (snapshot.processor_fee_on) {
    case 'gross':  feeBase = snapshot.priceGross; break;
    case 'final':  feeBase = snapshot.finalPriceILS; break;
    default:       feeBase = snapshot.priceExVAT + domesticIncomeEx;
  }
  const processorFees = feeBase * snapshot.processor_pct_used + snapshot.processor_fixed_used;

  const totalCostsEx = snapshot.cost_ex_vat + (domesticCostEx || 0) + (snapshot.refunds_and_adjustments_exVAT || 0);

  const net = revenueEx - processorFees - totalCostsEx;
  const marginPct = revenueEx > 0 ? net / revenueEx : 0;

  return { net_profit_ils: net, margin_pct: marginPct, revenue_exVAT: revenueEx, processor_fees: processorFees, total_costs_exVAT: totalCostsEx };
}

const calculateOrderPricing = (order) => {
    if (!order.items || order.items.length === 0) {
      console.log('Order has no items:', order.order_number);
      return null;
    }

    try {
      const totalProductPrice = order.items.reduce((sum, item) =>
        sum + (item.original_price * item.quantity), 0);

      const totalWeight = order.items.reduce((sum, item) =>
        sum + ((item.weight || 0.35) * item.quantity), 0);

      const site = order.site || 'us';
      const currency = siteInfo[site]?.currency || 'USD';

      // Mock exchange rates - in real implementation, get from settings
      const fxRates = {
        USD: 3.7,
        EUR: 4.0,
        GBP: 4.5
      };

      const result = calcFinalPriceILS({
        currency,
        productPrice: totalProductPrice,
        weight_kg: totalWeight,
        fxToILS: fxRates[currency],
        fxUSDToILS: fxRates.USD,
        dimensions_cm: { L: 0, W: 0, H: 0 },
        payment_method: 'card'
      });

      const breakdown = result.breakdown;

      // Construct snapshot for the new computeNetProfit function
      const snapshot = {
        vat_pct: breakdown?.vat_pct || 0.18,
        domestic_vat_applies: true, // Assumption
        domestic_charge_to_customer: breakdown?.domestic_charge_to_customer || 0,
        domestic_cost_includes_vat: true, // Assumption
        domestic_ship_cost_ils: (breakdown?.domestic_absorbed_cost || 0) + (breakdown?.domestic_charge_to_customer || 0),
        priceExVAT: breakdown?.priceExVAT || 0,
        processor_fee_on: 'final', // Assumption
        priceGross: breakdown?.priceGross || 0,
        finalPriceILS: result.finalPriceILS || 0,
        processor_pct_used: breakdown?.processor_pct_used || 0.025,
        processor_fixed_used: breakdown?.processor_fixed_used || 1.2,
        cost_ex_vat: breakdown?.cost_ex_vat || 0,
        refunds_and_adjustments_exVAT: 0 // Assumption
      };

      const { net_profit_ils, margin_pct, processor_fees } = computeNetProfit(snapshot);

      const enhancedBreakdown = {
        ...breakdown,
        net_profit_ils: net_profit_ils,
        profit_pct_of_final: margin_pct, // Using the new accurate margin
        processor_fees: processor_fees, // Storing the calculated processor fees
        customsILS: breakdown?.customsILS || 0
      };

      return {
        ...result,
        breakdown: enhancedBreakdown
      };
    } catch (error) {
      console.error('Error calculating pricing for order', order.order_number, error);
      return null;
    }
  };


// Helper: Build nice HTML email for status updates
function buildStatusUpdateEmailHTML({ customerName, orderNumber, statusLabel, trackUrl, chatUrl }) {
  const brand = "Brandy Melville to Israel";
  const primary = "#443E41";
  const accent = "#FFCAD4";
  const border = "#FCE8EF";
  const muted = "#6B7280";

  return `
  <!doctype html>
  <html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap" rel="stylesheet">
    <title>עדכון סטטוס להזמנה #${orderNumber}</title>
  </head>
  <body style="margin:0;background:#FFFDFC;font-family:Assistant,Arial,Helvetica,sans-serif" dir="rtl">
    <div style="max-width:640px;margin:24px auto;background:#fff;border:1px solid ${border};">
      <div style="padding:16px 20px;border-bottom:1px solid ${border};display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;border-radius:50%">💖</div>
          <div>
            <div style="font-weight:700;color:${primary}">${brand}</div>
            <div style="font-size:12px;color:${muted}">הדרך הקלה להזמין ברנדי מחו״ל</div>
          </div>
        </div>
        <div style="font-size:12px;color:${muted}">מס׳ הזמנה: <strong style="color:${primary}">${orderNumber}</strong></div>
      </div>

      <div style="padding:22px 20px">
        <h1 style="margin:0 0 8px 0;color:${primary};font-size:20px}>היי ${customerName || 'יקרה'} 🌸</h1>
        <p style="margin:0 0 10px 0;color:${primary};line-height:1.7">
          עדכנו את סטטוס ההזמנה שלך ל<strong> "${statusLabel}"</strong>.
          רצינו להגיד תודה על הסבלנות והאמון — אנחנו על זה ומטפלות בכל אהבה! ✨
        </p>

        <div style="margin:16px 0;padding:14px;border:1px dashed ${border};background:${accent}11;color:${primary}">
          סטטוס נוכחי: <strong>${statusLabel}</strong>
        </div>

        <div style="text-align:center;margin:18px 0 6px">
          <a href="${trackUrl}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:10px 16px;margin:4px 6px;font-weight:700">עקבי אחרי ההזמנה</a>
          <a href="${chatUrl}" style="display:inline-block;background:#fff;color:${primary};border:2px solid ${accent};text-decoration:none;padding:10px 16px;margin:4px 6px;font-weight:700">צ׳אט עם הנציגה</a>
        </div>

        <p style="margin:16px 0 0 0;color:${muted};font-size:12px;text-align:center">
          אם יש לך שאלות, אנחנו כאן בשבילך תמיד 💖
        </p>
      </div>
    </div>
  </body>
  </html>
  `;
}

// Helper: Build payment confirmation email to customer
function buildPaymentConfirmationEmailHTML({ customerName, orderNumber, totalILS, trackUrl, chatUrl }) {
  const brand = "Brandy Melville to Israel";
  const primary = "#443E41";
  const accent = "#FFCAD4";
  const border = "#FCE8EF";
  const muted = "#6B7280";

  return `
  <!doctype html>
  <html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700&display=swap" rel="stylesheet">
    <title>תשלום התקבל להזמנה #${orderNumber}</title>
  </head>
  <body style="margin:0;background:#FFFDFC;font-family:Assistant,Arial,Helvetica,sans-serif" dir="rtl">
    <div style="max-width:640px;margin:24px auto;background:#fff;border:1px solid ${border};">
      <div style="padding:16px 20px;border-bottom:1px solid ${border};display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:32px;height:32px;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;border-radius:50%">💖</div>
          <div>
            <div style="font-weight:700;color:${primary}">${brand}</div>
            <div style="font-size:12px;color:${muted}">הדרך הקלה להזמין ברנדי מחו״ל</div>
          </div>
        </div>
        <div style="font-size:12px;color:${muted}">מס׳ הזמנה: <strong style="color:${primary}">${orderNumber}</strong></div>
      </div>

      <div style="padding:22px 20px">
        <h1 style="margin:0 0 8px 0;color:${primary};font-size:20px>היי ${customerName || 'יקרה'} 🌸</h1>
        <p style="margin:0 0 10px 0;color:${primary};line-height:1.7">
          התשלום להזמנה שלך התקבל בהצלחה! אנחנו מתחילות לטפל בהזמנה שלך. סכום ששולם: <strong>₪${Number(totalILS || 0).toLocaleString()}</strong>.
        </p>
        <div style="text-align:center;margin:18px 0 6px">
          <a href="${trackUrl}" style="display:inline-block;background:${primary};color:#fff;text-decoration:none;padding:10px 16px;margin:4px 6px;font-weight:700">עקבי אחרי ההזמנה</a>
          <a href="${chatUrl}" style="display:inline-block;background:#fff;color:${primary};border:2px solid ${accent};text-decoration:none;padding:10px 16px;margin:4px 6px;font-weight:700">צ׳אט עם הנציגה</a>
        </div>
        <p style="margin:16px 0 0 0;color:${muted};font-size:12px;text-align:center">
          תודה שבחרת בנו! 💖
        </p>
      </div>
    </div>
  </body>
  </html>
  `;
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  // FIX: initialize with useState instead of a bare Set (which caused a syntax error)
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // New state for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ordersToDelete, setOrdersToDelete] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    site: 'all',
    status: 'all',
    dateRange: 'all',
    paymentStatus: 'all',
    minAmount: '',
    maxAmount: '',
    minMargin: '',
    country: 'all'
  });

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    orderNumber: true,
    customer: true,
    date: true,
    total: true,
    netProfit: true,
    margin: true,
    site: true,
    status: true,
    items: true,
    weight: false,
    eta: false,
    forwarder: false,
    notes: false
  });

  // NEW: expanded rows state
  const [expandedRows, setExpandedRows] = useState(new Set());
  // NEW: map שלבי סטטוס -> מספר שלב
  const [statusStepsMap, setStatusStepsMap] = useState({});

  // NEW: state for email preview dialog
  const [emailPreview, setEmailPreview] = useState({ open: false, to: "", subject: "", html: "" });

  // helpers for email preview
  const openEmailPreview = (to, subject, html) => setEmailPreview({ open: true, to, subject, html });
  const closeEmailPreview = () => setEmailPreview(prev => ({ ...prev, open: false }));
  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
      // Optionally provide user feedback
      alert("התוכן הועתק בהצלחה!");
    } catch (err) {
      console.error("Failed to copy text:", err);
      alert("שגיאה בהעתקה: נסו שוב או העתיקו ידנית.");
    }
  };
  const stripHtml = (html) => (html || "").replace(/<[^>]+>/g, "");
  const downloadHtml = () => {
    const blob = new Blob([emailPreview.html || ""], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `email_${(emailPreview.subject || "message").replace(/[^a-zA-Z0-9]/g, '_')}.html`; // Sanitize filename
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  // UPDATE: load all orders (not only paid), sort by created_date desc
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Order.list('-created_date');
      // Enrich orders with calculated pricing data
      const enrichedOrders = data.map(order => {
        const calculatedPricing = calculateOrderPricing(order);
        return {
          ...order,
          calculatedPricing
        };
      });
      setOrders(enrichedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // NEW: טעינת שלבי סטטוס לתרשים התקדמות
  const loadStatusSteps = useCallback(async () => {
    try {
      const steps = await OrderStatusSteps.list();
      const seen = new Set();
      const latestPerKey = [];
      const sorted = steps.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      for (const s of sorted) {
        if (!seen.has(s.status_key)) {
          latestPerKey.push(s);
          seen.add(s.status_key);
        }
      }
      const map = {};
      latestPerKey.forEach(s => { map[s.status_key] = { label: s.label, step: s.step_number }; });
      setStatusStepsMap(map);
    } catch (e) {
      console.error("Error loading status steps:", e);
      // Fallback ברירת מחדל
      setStatusStepsMap({
        pending: { label: "ממתין", step: 1 },
        ordered: { label: "הוזמן", step: 2 },
        warehouse: { label: "במחסן", step: 3 },
        shipping_to_israel: { label: "בדרך לישראל", step: 4 },
        in_israel: { label: "בארץ", step: 5 },
        shipping_to_customer: { label: "בדרך ללקוחה", step: 6 },
        delivered: { label: "נמסר", step: 7 }
      });
    }
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUserRole(user.role);
        loadOrders();
        // NEW: טען גם את שלבי הסטטוס
        loadStatusSteps();
      } catch (error) {
        window.location.href = createPageUrl('Home');
      }
    };
    checkAccess();
  }, [loadOrders, loadStatusSteps]);

  // UPDATE: send status/payment emails — if הלקוחה לא רשומה לאפליקציה → פותחים חלון תצוגה למייל ידני
  const handleUpdateOrder = async (orderId, data) => {
    try {
      await Order.update(orderId, data);

      // Send status update email if status changed (existing)
      if (data.status) {
        const order = orders.find(o => o.id === orderId);
        if (order && data.status !== order.status) {
          // Get status step number to determine if email should be sent
          const statusStep = statusStepsMap[data.status]?.step;
          
          // Skip email for steps 2 and 3 (ordered and warehouse)
          const shouldSkipEmail = statusStep === 2 || statusStep === 3;
          
          if (!shouldSkipEmail) {
            // Check if the customer is a registered app user to comply with platform email policy
            const matches = await User.filter({ email: order.customer_email });
            const isAppUser = Array.isArray(matches) && matches.length > 0;

            const trackOrderPageUrl = new URL(createPageUrl('TrackOrder'), window.location.origin).href;
            const chatPageUrl = new URL(createPageUrl('Chat'), window.location.origin).href;
            const statusLabel = statusConfig[data.status]?.label || data.status;

            const emailHtml = buildStatusUpdateEmailHTML({
              customerName: order.customer_name,
              orderNumber: order.order_number,
              statusLabel,
              trackUrl: trackOrderPageUrl,
              chatUrl: chatPageUrl
            });

            const subject = `עדכון סטטוס להזמנה #${order.order_number}: ${statusLabel}`;

            if (isAppUser) {
              await SendEmail({
                from_name: "Brandy Melville to Israel",
                to: order.customer_email,
                subject,
                body: emailHtml
              });
            } else {
              // NEW: If not an app user, open email preview for manual sending
              openEmailPreview(order.customer_email, subject, emailHtml);
            }
          }
        }
      }

      // If payment completed and not emailed yet → email customer (only if she's an app user)
      if (data.payment_status) {
        const order = orders.find(o => o.id === orderId);
        if (order && data.payment_status === 'completed' && !order.email_sent_to_customer) {
          try {
            // Check if the customer is a registered app user to comply with platform email policy
            const matches = await User.filter({ email: order.customer_email });
            const isAppUser = Array.isArray(matches) && matches.length > 0;

            const trackOrderPageUrl = new URL(createPageUrl('TrackOrder'), window.location.origin).href;
            const chatPageUrl = new URL(createPageUrl('Chat'), window.location.origin).href;
            const emailHtml = buildPaymentConfirmationEmailHTML({
              customerName: order.customer_name,
              orderNumber: order.order_number,
              totalILS: order.total_price_ils,
              trackUrl: trackOrderPageUrl,
              chatUrl: chatPageUrl
            });

            const subject = `תשלום התקבל • הזמנה #${order.order_number}`;

            if (isAppUser) {
              await SendEmail({
                from_name: "Brandy Melville to Israel",
                to: order.customer_email,
                subject,
                body: emailHtml
              });

              // Mark as emailed to avoid duplicates (only if sent automatically)
              await Order.update(orderId, { email_sent_to_customer: true });
            } else {
              // NEW: If not an app user, open email preview for manual sending
              openEmailPreview(order.customer_email, subject, emailHtml);
              // Do NOT mark email_sent_to_customer: true as it was not sent automatically
            }
          } catch (e) {
            console.warn('Payment confirmation email skipped or failed:', e);
          }
        }
      }

      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('שגיאה בעדכון ההזמנה.');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setOrdersToDelete([order]);
    setDeleteDialogOpen(true);
  };

  const handleBulkDelete = () => {
    const ordersToDeleteArray = orders.filter(o => selectedOrderIds.has(o.id));
    setOrdersToDelete(ordersToDeleteArray);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      // Delete all selected orders
      const deletePromises = ordersToDelete.map(order => Order.delete(order.id));
      await Promise.all(deletePromises);

      // Clear selections and close dialog
      setSelectedOrderIds(new Set());
      setDeleteDialogOpen(false);
      setOrdersToDelete([]);

      // Reload orders
      loadOrders();

      // Show success message
      alert(`${ordersToDelete.length} הזמנות נמחקו בהצלחה`);
    } catch (error) {
      console.error('Error deleting orders:', error);
      alert('שגיאה במחיקת ההזמנות');
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleRowExpand = (orderId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // Filter and search logic
  // UPDATE: filteredOrders → only complete orders are shown (even if not paid)
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Show only orders with full details (incl. valid email)
      if (!isCompleteOrder(order)) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchFields = [
          order.order_number,
          order.customer_name,
          order.customer_email,
          ...(order.items || []).map(item => item.product_sku || ''),
          ...(order.items || []).map(item => item.product_name || '')
        ];

        if (!searchFields.some(field => field?.toLowerCase().includes(query))) {
          return false;
        }
      }

      // Basic filters
      const siteMatch = filters.site === 'all' || order.site === filters.site;
      const statusMatch = filters.status === 'all' || order.status === filters.status;
      const dateMatch = filters.dateRange === 'all' ||
        new Date(order.created_date) >= subDays(new Date(), parseInt(filters.dateRange));

      // Amount filters
      const amountMatch = (!filters.minAmount || order.total_price_ils >= parseFloat(filters.minAmount)) &&
                         (!filters.maxAmount || order.total_price_ils <= parseFloat(filters.maxAmount));

      // Margin filter (still exists for filtering purposes, though column display changed)
      const marginMatch = !filters.minMargin ||
        ((order.calculatedPricing?.breakdown?.profit_pct_of_final || 0) * 100) >= parseFloat(filters.minMargin);

      return siteMatch && statusMatch && dateMatch && amountMatch && marginMatch;
    });
  }, [orders, searchQuery, filters]);

  // KPI calculations
  const kpis = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_price_ils || 0), 0);
    const pendingOrders = filteredOrders.filter(order => order.status === 'pending').length;
    const completedOrders = filteredOrders.filter(order => order.status === 'delivered').length;

    return { totalOrders, totalRevenue, pendingOrders, completedOrders };
  }, [filteredOrders]);

  const handleRowClick = (order) => {
    setSelectedOrder(order);
    setDrawerOpen(true);
  };

  const handleBulkAction = (action, orderIds) => {
    if (action === 'delete') {
      handleBulkDelete();
    } else {
      console.log('Bulk action:', action, 'on orders:', orderIds);
      // Implement other bulk actions here
    }
  };

  // NEW: sorted list of status steps for the interactive stepper
  const sortedStatusEntries = useMemo(() => {
    // statusStepsMap is guaranteed to have default values if API fails from loadStatusSteps
    return Object.entries(statusStepsMap).sort(([, a], [, b]) => a.step - b.step);
  }, [statusStepsMap]);


  if (userRole !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4"></div>
        <p className="text-stone-600">בודק הרשאות...</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-stone-900 mb-2 tracking-tight">לוח בקרת הזמנות</h1>
            <p className="text-lg text-stone-600">ניהול מתקדם ומעקב מלא אחר כל ההזמנות</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              הגדרות עמוד
            </Button>
            <ExportDialog orders={filteredOrders} />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full md:w-auto">
            <TabsTrigger value="orders">הזמנות לקוחות</TabsTrigger>
            <TabsTrigger value="shopping">רשימת קניות</TabsTrigger>
            <TabsTrigger value="supplier">מעקב ספקים</TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {/* Search and Saved Views */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-3 w-4 h-4 text-stone-400" />
                <Input
                  placeholder="חיפוש לפי מספר הזמנה, אימייל, שם לקוח, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <SavedViewsDropdown onLoadView={(view) => setFilters(view.filters)} />
              <Button
                variant="outline"
                onClick={() => setFiltersOpen(prev => !prev)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                {filtersOpen ? 'הסתר מסננים' : 'סינון מתקדם'}
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilters({...filters, status: 'pending'})}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-stone-600 mb-1">הזמנות ממתינות</p>
                      <p className="text-2xl font-bold text-stone-900">{kpis.pendingOrders}</p>
                    </div>
                    <Clock className="w-8 h-8 text-stone-400" />
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setFilters({...filters, status: 'delivered'})}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-stone-600 mb-1">הזמנות שהושלמו</p>
                      <p className="text-2xl font-bold text-green-700">{kpis.completedOrders}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-stone-600 mb-1">סה״כ הכנסות</p>
                      <p className="text-2xl font-bold text-blue-700">₪{kpis.totalRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-stone-600 mb-1">סה״כ הזמנות</p>
                      <p className="text-2xl font-bold text-stone-900">{kpis.totalOrders}</p>
                    </div>
                    <Package className="w-8 h-8 text-stone-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters (toggleable) */}
            {filtersOpen && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <div>
                      <Label>אתר</Label>
                      <Select value={filters.site} onValueChange={(value) => setFilters({...filters, site: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל האתרים</SelectItem>
                          <SelectItem value="us">🇺🇸 ארה״ב</SelectItem>
                          <SelectItem value="eu">🇪🇺 אירופה</SelectItem>
                          <SelectItem value="uk">🇬🇧 בריטניה</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>סטטוס</Label>
                      <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל הסטטוסים</SelectItem>
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>{config.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>תקופה</Label>
                      <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">כל הזמנים</SelectItem>
                          <SelectItem value="7">שבוע אחרון</SelectItem>
                          <SelectItem value="30">חודש אחרון</SelectItem>
                          <SelectItem value="90">3 חודשים</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>סכום מינימום</Label>
                      <Input
                        type="number"
                        placeholder="₪"
                        value={filters.minAmount}
                        onChange={(e) => setFilters({...filters, minAmount: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>סכום מקסימום</Label>
                      <Input
                        type="number"
                        placeholder="₪"
                        value={filters.maxAmount}
                        onChange={(e) => setFilters({...filters, maxAmount: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>מרווח מינימום (%)</Label>
                      <Input
                        type="number"
                        placeholder="%"
                        value={filters.minMargin}
                        onChange={(e) => setFilters({...filters, minMargin: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Button variant="outline" onClick={() => setFilters({
                      site: 'all', status: 'all', dateRange: 'all', paymentStatus: 'all',
                      minAmount: '', maxAmount: '', minMargin: '', country: 'all'
                    })}>
                      נקה מסננים
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bulk Actions (still present if needed for other selections, but not from table rows directly now) */}
            {selectedOrderIds.size > 0 && (
              <BulkActionsBar
                selectedCount={selectedOrderIds.size}
                onAction={handleBulkAction}
                onClear={() => setSelectedOrderIds(new Set())}
              />
            )}

            {/* Orders Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>הזמנות ({filteredOrders.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      עמודות
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                  {loading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4"></div>
                      <p className="text-stone-600">טוען הזמנות...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-stone-50 border-b border-stone-200">
                          <tr>
                            <th className="p-3 w-10">
                              <Checkbox
                                checked={filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedOrderIds(new Set(filteredOrders.map(o => o.id)));
                                  } else {
                                    setSelectedOrderIds(new Set());
                                  }
                                }}
                              />
                            </th>
                            {/* Simplified columns per request */}
                            <th className="text-right p-3 font-medium">מספר הזמנה</th>
                            <th className="text-right p-3 font-medium">לקוח</th>
                            <th className="text-right p-3 font-medium">תאריך</th>
                            <th className="text-right p-3 font-medium w-56">פעולות</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((order) => {
                            const netProfit = order.calculatedPricing?.breakdown?.net_profit_ils || 0;
                            const customsAmount = order.calculatedPricing?.breakdown?.customsILS || 0;
                            const isExpanded = expandedRows.has(order.id);

                            // NEW: Status progress calculations
                            const daysSince = order.created_date ? differenceInDays(new Date(), new Date(order.created_date)) : null; // Calculate days since creation

                            return (
                              <React.Fragment key={order.id}>
                                <tr
                                  className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer"
                                  onClick={() => handleRowClick(order)} // Clicking anywhere on the row still opens the drawer
                                >
                                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
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
                                  <td className="p-3 font-mono text-sm">{order.order_number}</td>

                                  {/* Customer cell: name + email only */}
                                  <td className="p-3">
                                    <div className="font-medium">{order.customer_name}</div>
                                    <div className="text-sm text-stone-500">{order.customer_email}</div>
                                  </td>

                                  <td className="p-3 text-sm">
                                    {order.created_date ? format(new Date(order.created_date), "dd/MM/yyyy") : "—"}
                                    {daysSince !== null && (
                                      <div className="text-xs text-stone-500 mt-1">עברו {daysSince} ימים</div>
                                    )}
                                  </td>

                                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                                    {/* Quick status updater */}
                                    <InlineStatusSelect
                                      value={order.status}
                                      onChange={(val) => handleUpdateOrder(order.id, { status: val })}
                                      className="mb-2"
                                    />
                                    <div className="flex gap-2 justify-start">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleRowExpand(order.id)}
                                      >
                                        {isExpanded ? (
                                          <>
                                            <ChevronUp className="w-4 h-4 ml-1" />
                                            הסתר
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="w-4 h-4 ml-1" />
                                            עוד פרטים
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRowClick(order)}
                                      >
                                        <Eye className="w-4 h-4 ml-1" />
                                        הצג מלא
                                      </Button>
                                    </div>
                                  </td>
                                </tr>

                                {/* NEW: full-width horizontal status stepper row */}
                                <tr className="bg-transparent">
                                  <td colSpan={5} className="px-3 pb-3">
                                    <div className="p-2 rounded-md border border-stone-200 bg-white/70">
                                      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
                                        <span className="text-[11px] font-semibold tracking-wide text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                          סטטוס
                                        </span>
                                        {sortedStatusEntries.map(([statusKey, statusInfo], idx, arr) => {
                                          const currentOrderStep = statusStepsMap[order.status]?.step || 0;
                                          const isActive = statusInfo.step <= currentOrderStep;
                                          const isCurrent = statusInfo.step === currentOrderStep;
                                          const isLast = idx === arr.length - 1;

                                          return (
                                            <React.Fragment key={statusKey}>
                                              <button
                                                className={`w-7 h-7 sm:w-8 sm:h-8 grid place-items-center border rounded-md text-xs sm:text-sm font-semibold transition-all shadow-sm
                                                  ${isActive ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'}
                                                  ${isCurrent ? 'ring-2 ring-rose-300' : ''}
                                                `}
                                                title={statusInfo.label}
                                                onClick={(e) => { e.stopPropagation(); handleUpdateOrder(order.id, { status: statusKey }); }}
                                              >
                                                {statusInfo.step}
                                              </button>
                                              {!isLast && (
                                                <div className={`h-0.5 w-3 sm:w-4 rounded-full ${isActive ? 'bg-rose-300' : 'bg-stone-200 opacity-70'}`} />
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                        {/* Current status name right after the stepper */}
                                        <span className="text-xs sm:text-sm text-stone-700 px-2 py-0.5 bg-stone-50 border border-stone-200 rounded ml-1">
                                          {statusConfig[order.status]?.label || order.status}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>

                                {/* Expanded details row spans all 5 columns */}
                                {isExpanded && (
                                  <tr className="bg-stone-50 border-b border-stone-100">
                                    <td colSpan={5} className="p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div className="space-y-1">
                                          <div className="text-stone-500">סה״כ בש״ח</div>
                                          <div className="font-semibold">₪{(order.total_price_ils || 0).toLocaleString()}</div>
                                        </div>
                                        <div className="space-y-1">
                                          <div className="text-stone-500">רווח נטו</div>
                                          <div className="font-semibold text-green-600">
                                            ₪{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <div className="text-stone-500">מכס</div>
                                          <div className="font-semibold text-red-600">
                                            {customsAmount > 0 ? `₪${customsAmount.toLocaleString()}` : 'לא חויב'}
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <div className="text-stone-500">מספר פריטים</div>
                                          <div className="font-semibold">{order.items?.length || 0}</div>
                                        </div>
                                        <div className="space-y-1">
                                          <div className="text-stone-500">אתר</div>
                                          <div className="font-semibold">{siteInfo[order.site]?.name} {siteInfo[order.site]?.flag}</div>
                                        </div>
                                        <div className="space-y-1">
                                          <div className="text-stone-500">סטטוס תשלום</div>
                                          <div className="font-semibold">
                                            {order.payment_status === 'completed' ? 'שולם' : order.payment_status === 'failed' ? 'נכשל' : 'ממתין'}
                                          </div>
                                        </div>

                                        <div className="space-y-1 md:col-span-3">
                                          <div className="text-stone-500">פרטי משלוח</div>
                                          <div className="font-medium">
                                            {order.shipping_address ? `${order.shipping_address}${order.city ? `, ${order.city}` : ''}` : '—'}
                                          </div>
                                        </div>

                                        {order.internal_notes && (
                                          <div className="space-y-1 md:col-span-3">
                                            <div className="text-stone-500">הערות פנימיות</div>
                                            <div className="font-medium">{order.internal_notes}</div>
                                          </div>
                                        )}

                                        <div className="md:col-span-3 flex gap-2 pt-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => { e.stopPropagation(); toggleRowExpand(order.id); }}
                                          >
                                            סגור פרטים
                                          </Button>
                                          <Button
                                            size="sm"
                                            onClick={(e) => { e.stopPropagation(); handleRowClick(order); }}
                                          >
                                            פתח פרטים מלאים
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            className="bg-red-600 hover:bg-red-700"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                                          >
                                            <AlertTriangle className="w-4 h-4 ml-1" />
                                            מחק הזמנה
                                          </Button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
          </TabsContent>

          {/* Shopping List Tab */}
          <TabsContent value="shopping">
            <ShoppingListTab orders={orders} onUpdated={loadOrders} />
          </TabsContent>

          {/* Supplier Tracking Tab */}
          <TabsContent value="supplier">
            <SupplierTrackingTab orders={orders} onUpdated={loadOrders} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                אישור מחיקה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-stone-700">
                {ordersToDelete.length === 1
                  ? `האם אתה בטוח שברצונך למחוק את הזמנה #${ordersToDelete[0]?.order_number}?`
                  : `האם אתה בטוח שברצונך למחוק ${ordersToDelete.length} הזמנות?`
                }
              </p>

              {ordersToDelete.length > 0 && ordersToDelete.length <= 3 && (
                <div className="bg-red-50 p-3 rounded border border-red-200">
                  <p className="text-sm font-medium text-red-800 mb-2">הזמנות למחיקה:</p>
                  {ordersToDelete.map(order => (
                    <div key={order.id} className="text-sm text-red-700">
                      #{order.order_number} - {order.customer_name}
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>אזהרה:</strong> פעולה זו בלתי הפיכה. כל המידע על ההזמנות יימחק לצמיתות.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setOrdersToDelete([]);
                  }}
                  disabled={deleteLoading}
                >
                  ביטול
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      מוחק...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 ml-2" />
                      מחק סופית
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* NEW: Email Preview Dialog for manual sending */}
      <Dialog open={emailPreview.open} onOpenChange={closeEmailPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>שליחת מייל ידנית</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="email-to">אל</Label>
              <Input id="email-to" value={emailPreview.to} readOnly className="mt-1" />
            </div>
            <div className="flex items-end gap-2"> {/* Align items-end for button alignment */}
              <div className="flex-1">
                <Label htmlFor="email-subject">נושא</Label>
                <Input id="email-subject" value={emailPreview.subject} readOnly className="mt-1" />
              </div>
              <Button variant="outline" onClick={() => copyText(emailPreview.subject)}>
                <Copy className="w-4 h-4 ml-2" /> העתק נושא
              </Button>
            </div>
            <div>
              <Label htmlFor="email-html-content">תוכן (HTML)</Label>
              <div id="email-html-content" className="mt-1 border rounded-md p-3 max-h-64 overflow-auto bg-stone-50 text-sm" dangerouslySetInnerHTML={{ __html: emailPreview.html }} />
              <div className="flex flex-wrap gap-2 mt-3">
                <Button variant="outline" onClick={() => copyText(emailPreview.html)}>
                  <Copy className="w-4 h-4 ml-2" /> העתק HTML
                </Button>
                <Button variant="outline" onClick={downloadHtml}>
                  <Download className="w-4 h-4 ml-2" /> הורד HTML
                </Button>
                <a
                  href={`mailto:${encodeURIComponent(emailPreview.to)}?subject=${encodeURIComponent(emailPreview.subject)}&body=${encodeURIComponent(stripHtml(emailPreview.html))}`}
                  target="_blank" // Open in new tab
                  rel="noopener noreferrer" // Security best practice
                  className="inline-flex items-center justify-center h-10 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Mail className="w-4 h-4 ml-2" /> פתח מייל (טקסט)
                </a>
              </div>
            </div>
          </div >
          <DialogFooter>
            <Button onClick={closeEmailPreview}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        order={selectedOrder}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdateOrder={handleUpdateOrder}
        onDeleteOrder={handleDeleteOrder}
        statusConfig={statusConfig}
      />
    </motion.div>
  );
}