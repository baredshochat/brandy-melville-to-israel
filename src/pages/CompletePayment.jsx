import React, { useState, useEffect } from "react";
import { Order } from "@/entities/Order";
import { SendEmail } from "@/integrations/Core";
import { createPageUrl } from "@/utils";
import { Heart, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import TranzilaPayment from '../components/payment/TranzilaPayment';

// Helper: format money
const formatMoney = (amount, currency = 'ILS') => {
  const n = Number(amount || 0);
  try {
    return n.toLocaleString(currency === 'ILS' ? 'he-IL' : 'en-US', { style: 'currency', currency });
  } catch {
    const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
    return `${symbol}${n.toFixed(2)}`;
  }
};

// Build confirmation email
function buildOrderConfirmationEmailHTML({ order, customerName, customerEmail, trackOrderUrl, chatUrl, totalILS }) {
  const brandName = "Brandy Melville to Israel";
  const primary = "#443E41";
  const accent = "#FFCAD4";
  const border = "#FCE8EF";
  const muted = "#9CA3AF";
  const bg = "#FFFDFC";

  const isLocalOrder = order?.site === 'local';
  const items = order?.items || [];

  const itemsRows = items.map((item) => {
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
    <title>אישור הזמנה #${order?.order_number || ""}</title>
  </head>
  <body dir="rtl" style="margin:0; background:${bg}; font-family:Assistant, Arial, Helvetica, sans-serif;">
    <div style="max-width:640px; margin:24px auto; background:#fff; border:1px solid ${border};">
      <div style="padding:16px 20px; border-bottom:1px solid ${border};">
        <div style="font-size:16px; font-weight:700; color:${primary};">${brandName}</div>
        <div style="font-size:12px; color:${muted};">מס׳ הזמנה: ${order?.order_number || ""}</div>
      </div>
      <div style="padding:24px 20px;">
        <h1 style="margin:0 0 8px 0; font-size:20px; color:${primary};">שלום ${customerName || 'יקרה'},</h1>
        <p style="margin:0 0 12px 0; font-size:14px; color:${primary}; line-height:1.6;">
          התשלום התקבל בהצלחה! 🎉 אנחנו מתחילות לטפל בהזמנה שלך.
        </p>
        <div style="margin:16px 0; padding:12px; background:${accent}22; border:1px solid ${accent};">
          <p style="margin:0; font-size:13px; color:${primary};">
            <strong>זמן אספקה משוער:</strong> ${deliveryTimeText}
          </p>
        </div>
        <div style="margin:18px 0; border:1px solid ${border}; padding:16px;">
          <h3 style="margin:0 0 12px 0; font-size:14px; color:${primary};">הפריטים שהזמנת:</h3>
          <table style="width:100%; border-collapse:collapse;">
            <tbody>${itemsRows}</tbody>
          </table>
          <div style="display:flex; justify-content:space-between; gap:10px; margin-top:14px; padding:12px; background:${bg}; border:1px solid ${border};">
            <div style="font-size:15px; color:${primary}; font-weight:700;">סה״כ</div>
            <div style="font-size:18px; color:${primary}; font-weight:800;">${totalILSStr}</div>
          </div>
        </div>
        <div style="margin:20px 0; text-align:center;">
          <a href="${trackOrderUrl}" style="display:inline-block; background:${primary}; color:#fff; text-decoration:none; padding:10px 16px; font-size:14px; font-weight:700; margin:4px 6px;">
            עקבי אחרי ההזמנה שלך
          </a>
          <a href="${chatUrl}" style="display:inline-block; background:#fff; color:${primary}; border:2px solid ${accent}; text-decoration:none; padding:10px 16px; font-size:14px; font-weight:700; margin:4px 6px;">
            צ׳אט עם הנציגה
          </a>
        </div>
        <p style="margin:16px 0 0 0; font-size:12px; color:${muted}; text-align:center;">
          תודה שבחרת בנו! 💖
        </p>
      </div>
    </div>
  </body>
  </html>`;
}

export default function CompletePayment() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('orderId');
        
        if (!orderId) {
          setError('לא נמצא מזהה הזמנה');
          setLoading(false);
          return;
        }

        const orderData = await Order.get(orderId);
        
        if (!orderData) {
          setError('ההזמנה לא נמצאה');
          setLoading(false);
          return;
        }

        // Check if already paid
        if (orderData.payment_status === 'completed' || orderData.status !== 'awaiting_payment') {
          setPaymentComplete(true);
          setOrder(orderData);
          setLoading(false);
          return;
        }

        setOrder(orderData);
      } catch (err) {
        console.error('Error loading order:', err);
        setError('שגיאה בטעינת ההזמנה');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, []);

  const handlePaymentSuccess = async () => {
    try {
      if (order?.id) {
        await Order.update(order.id, { 
          payment_status: 'completed',
          status: 'pending'
        });
      }

      // Send confirmation email
      const trackOrderPageUrl = new URL(createPageUrl('TrackOrder'), window.location.origin).href;
      const chatPageUrl = new URL(createPageUrl('Chat'), window.location.origin).href;

      if (order?.customer_email) {
        try {
          const emailHtml = buildOrderConfirmationEmailHTML({
            order,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            trackOrderUrl: trackOrderPageUrl,
            chatUrl: chatPageUrl,
            totalILS: order.total_price_ils
          });

          await SendEmail({
            from_name: "Brandy Melville to Israel",
            to: order.customer_email,
            subject: `אישור הזמנה #${order.order_number} • ${formatMoney(order.total_price_ils, 'ILS')}`,
            body: emailHtml
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      }

      setPaymentComplete(true);
    } catch (err) {
      console.error('Error completing payment:', err);
      setPaymentComplete(true); // Still show success since payment went through
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-4" />
        <p className="text-stone-600">טוען פרטי הזמנה...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 max-w-lg mx-auto" dir="rtl">
        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-stone-900 mb-3">{error}</h2>
        <p className="text-stone-600 mb-6">נסי לחזור לעמוד הראשי ולהזמין מחדש</p>
        <Button onClick={() => window.location.href = createPageUrl('Home')}>
          חזרה לעמוד הראשי
        </Button>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="text-center p-8 max-w-lg mx-auto bg-stone-50 border-2 border-rose-200/50 shadow-lg" dir="rtl">
        <div className="flex justify-center mb-6">
          <Heart className="w-20 h-20 text-rose-400 fill-rose-400" />
        </div>
        <h2 className="text-3xl font-semibold text-stone-900 mb-3">התשלום הושלם בהצלחה!</h2>
        <p className="text-base text-stone-600 mb-2">מספר הזמנה: {order?.order_number}</p>
        <p className="text-base text-stone-600 mb-2">סכום ששולם: ₪{Math.round(order?.total_price_ils || 0)}</p>
        <p className="text-base text-stone-600 mb-8">אישור הזמנה נשלח למייל.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => window.location.href = createPageUrl('TrackOrder') + `?orderNumber=${order?.order_number}`}
            className="bg-rose-500 hover:bg-rose-600"
          >
            מעקב אחר ההזמנה
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = createPageUrl('Home')}
          >
            חזרה לעמוד הראשי
          </Button>
        </div>
      </div>
    );
  }

  // Show payment form
  const customerData = {
    customer_name: order?.customer_name,
    customer_email: order?.customer_email,
    customer_phone: order?.customer_phone,
    shipping_address: order?.shipping_address,
    city: order?.city
  };

  return (
    <div className="container mx-auto" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-stone-900 mb-2">השלמת תשלום</h1>
          <p className="text-stone-600">הזמנה #{order?.order_number}</p>
        </div>
        
        {/* Order Summary */}
        <div className="bg-white border border-stone-200 p-4 mb-6">
          <h3 className="font-medium text-stone-800 mb-3">סיכום הזמנה</h3>
          <div className="space-y-2 text-sm">
            {order?.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.product_name} × {item.quantity}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-medium">
              <span>סה״כ לתשלום:</span>
              <span>₪{Math.round(order?.total_price_ils || 0)}</span>
            </div>
          </div>
        </div>

        <TranzilaPayment
          order={order}
          totalAmount={order?.total_price_ils}
          customerData={customerData}
          cart={order?.items || []}
          onSuccess={handlePaymentSuccess}
          onBack={() => window.location.href = createPageUrl('Home')}
        />
      </div>
    </div>
  );
}