import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CreditCard, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { tranzilaCreateHandshake } from '@/functions/tranzilaCreateHandshake';
import { createPageUrl } from '@/utils';

export default function TranzilaPayment({ 
  order, 
  totalAmount, 
  customerData, 
  cart = [],
  onSuccess, 
  onBack 
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [handshakeData, setHandshakeData] = useState(null);
  const formRef = useRef(null);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    initializePayment();
  }, []);

  const initializePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data } = await tranzilaCreateHandshake({ sum: totalAmount });
      
      if (!data || !data.thtk) {
        throw new Error('לא התקבל אסימון תשלום');
      }
      
      setHandshakeData(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to initialize payment:', err);
      setError('שגיאה באתחול מערכת התשלום. אנא נסי שוב.');
      setLoading(false);
    }
  };

  const handleSubmitPayment = () => {
    if (formRef.current && !formSubmitted) {
      setFormSubmitted(true);
      formRef.current.submit();
    }
  };

  // Build product description for invoice
  const productDescription = cart
    .map(item => `${item.product_name} x${item.quantity}`)
    .join(', ')
    .substring(0, 100);

  // Build JSON purchase data for invoice
  const buildPurchaseData = () => {
    const items = cart.map(item => ({
      product_name: (item.product_name || 'מוצר').substring(0, 50),
      product_quantity: item.quantity || 1,
      product_price: Math.round((totalAmount / cart.reduce((sum, i) => sum + (i.quantity || 1), 0)) * (item.quantity || 1))
    }));
    return encodeURIComponent(JSON.stringify(items));
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] p-6"
      >
        <Loader2 className="w-10 h-10 animate-spin text-rose-400 mb-4" />
        <p className="text-stone-600">מאתחל מערכת תשלום מאובטחת...</p>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center"
      >
        <div className="bg-red-50 border border-red-200 p-6 max-w-md">
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onBack}>
              חזרה
            </Button>
            <Button onClick={initializePayment} className="bg-rose-500 hover:bg-rose-600">
              נסי שוב
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-4 sm:p-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <CreditCard className="w-6 h-6 text-rose-400" />
          <h2 className="text-2xl font-semibold text-stone-900">תשלום מאובטח</h2>
        </div>
        <p className="text-stone-600 text-sm">הזמנה #{order?.order_number}</p>
      </div>

      {/* Order Summary */}
      <div className="bg-stone-50 border border-stone-200 p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-stone-600">סה״כ לתשלום:</span>
          <span className="text-2xl font-bold text-stone-900">₪{Math.round(totalAmount).toLocaleString('he-IL')}</span>
        </div>
        <div className="text-xs text-stone-500 text-center">
          כולל מע״מ, משלוח וכל העלויות
        </div>
      </div>

      {/* Hidden Form for Tranzila */}
      <form
        ref={formRef}
        action={`https://direct.tranzila.com/${handshakeData?.supplier}/iframenew.php`}
        target="tranzila-iframe"
        method="POST"
        className="hidden"
      >
        {/* Required payment fields */}
        <input type="hidden" name="sum" value={totalAmount} />
        <input type="hidden" name="currency" value="1" /> {/* 1 = NIS */}
        <input type="hidden" name="cred_type" value="1" /> {/* 1 = Credit card */}
        <input type="hidden" name="new_process" value="1" />
        <input type="hidden" name="thtk" value={handshakeData?.thtk || ''} />
        
        {/* Display customization */}
        <input type="hidden" name="lang" value="il" />
        <input type="hidden" name="trBgColor" value="FFFFFF" />
        <input type="hidden" name="trTextColor" value="1C1917" />
        <input type="hidden" name="trButtonColor" value="F43F5E" />
        <input type="hidden" name="buttonLabel" value="שלמי עכשיו" />
        <input type="hidden" name="nologo" value="1" />
        <input type="hidden" name="accessibility" value="2" />
        
        {/* Payment options */}
        <input type="hidden" name="bit_pay" value="1" />
        
        {/* Customer information */}
        <input type="hidden" name="contact" value={customerData?.customer_name || ''} />
        <input type="hidden" name="email" value={customerData?.customer_email || ''} />
        <input type="hidden" name="phone" value={customerData?.customer_phone || ''} />
        <input type="hidden" name="address" value={customerData?.shipping_address || ''} />
        <input type="hidden" name="city" value={customerData?.city || ''} />
        
        {/* Product info */}
        <input type="hidden" name="pdesc" value={productDescription} />
        <input type="hidden" name="remarks" value={`הזמנה ${order?.order_number}`} />
      </form>

      {/* Payment iframe container */}
      <div className="bg-white border-2 border-stone-200 overflow-hidden mb-4">
        {!formSubmitted ? (
          <div className="p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-800 mb-2">מוכנה לתשלום?</h3>
            <p className="text-sm text-stone-600 mb-6">
              לחצי על הכפתור למעבר לטופס התשלום המאובטח
            </p>
            <Button 
              onClick={handleSubmitPayment}
              className="bg-rose-500 hover:bg-rose-600 text-white h-12 px-8 text-lg"
            >
              המשיכי לתשלום
              <ArrowRight className="w-5 h-5 mr-2" />
            </Button>
          </div>
        ) : (
          <iframe
            name="tranzila-iframe"
            id="tranzila-iframe"
            title="תשלום מאובטח"
            allowpaymentrequest="true"
            className="w-full h-[500px] sm:h-[550px] border-0"
          />
        )}
      </div>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-2 text-stone-500 text-xs">
        <ShieldCheck className="w-4 h-4 text-green-500" />
        <span>תשלום מאובטח בתקן PCI-DSS</span>
      </div>

      {/* Back button */}
      <div className="mt-6 text-center">
        <Button variant="ghost" onClick={onBack} className="text-stone-600">
          חזרה לפרטים
        </Button>
      </div>
    </motion.div>
  );
}