import React, { useState, useEffect, useMemo } from "react";
import { OrderStatusSteps } from "@/entities/OrderStatusSteps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Clock, Heart, Package, Check, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { he } from 'date-fns/locale';
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { trackOrder } from "@/functions/trackOrder";

export default function TrackOrder() {
  const location = useLocation();
  
  // Default status steps as constant
  const defaultStatusSteps = {
    awaiting_payment: { label: "ממתין לתשלום", step: 0, estimatedDays: 0, timeRange: "השלימי תשלום" },
    pending: { label: "ההזמנה התקבלה", step: 1, estimatedDays: 21, timeRange: "3-4 שבועות" },
    ordered: { label: "הוזמן מ-Brandy", step: 2, estimatedDays: 18, timeRange: "2.5-3 שבועות" },
    warehouse: { label: "הגיע למחסן בחול", step: 3, estimatedDays: 14, timeRange: "2-3 שבועות" },
    shipping_to_israel: { label: "בדרך לישראל", step: 4, estimatedDays: 10, timeRange: "1.5-2 שבועות" },
    in_israel: { label: "הגיע למכס בארץ", step: 5, estimatedDays: 5, timeRange: "3-7 ימים" },
    shipping_to_customer: { label: "נמסר לשליח", step: 6, estimatedDays: 2, timeRange: "1-3 ימים" },
    delivered: { label: "נמסר ללקוחה", step: 7, estimatedDays: 0, timeRange: "הושלם" }
  };

  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusSteps, setStatusSteps] = useState(defaultStatusSteps);
  const [statusLoading, setStatusLoading] = useState(true);

  // Check if this is a local order
  const isLocalOrder = order?.site === 'local';

  // Check for orderNumber in URL params and auto-search
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderNumberParam = params.get('orderNumber');
    if (orderNumberParam) {
      setOrderNumber(orderNumberParam);
      // Auto-search after setting the order number
      const autoSearch = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await trackOrder({
            order_number: orderNumberParam
          });
          
          if (response.data.success) {
            setOrder(response.data.order);
          } else {
            setError(response.data.error || 'מספר ההזמנה לא נמצא במערכת שלנו');
          }
        } catch (err) {
          console.error('Track order error:', err);
          setError('אירעה שגיאה בחיפוש ההזמנה');
        } finally {
          setLoading(false);
        }
      };
      autoSearch();
    }
  }, [location.search]);

  // Load status steps only once, with timeout for fast mobile load
  useEffect(() => {
    setStatusSteps(defaultStatusSteps);
    setStatusLoading(false);
    
    // Don't block page load - load custom steps in background
    const loadStatusSteps = async () => {
      try {
        const steps = await OrderStatusSteps.list();
        if (!steps || steps.length === 0) return;

        const uniqueSteps = [];
        const seenStatusKeys = new Set();
        const sortedSteps = steps.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        for (const step of sortedSteps) {
          if (!seenStatusKeys.has(step.status_key)) {
            uniqueSteps.push(step);
            seenStatusKeys.add(step.status_key);
          }
        }

        const stepsObj = {};
        uniqueSteps.forEach((step) => {
          stepsObj[step.status_key] = {
            label: step.label,
            step: step.step_number,
            estimatedDays: step.estimated_days_remaining,
            timeRange: step.time_range_text
          };
        });
        
        setStatusSteps({ ...defaultStatusSteps, ...stepsObj });
      } catch (error) {
        // Silent fail - already using defaults
      }
    };
    
    // Defer loading for better mobile performance
    setTimeout(loadStatusSteps, 100);
  }, []);

  const searchOrder = async (e) => {
    e.preventDefault();
    if (!orderNumber) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const response = await trackOrder({
        order_number: orderNumber
      });
      
      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        setError(response.data.error || 'מספר ההזמנה לא נמצא במערכת שלנו');
      }
    } catch (err) {
      console.error('Track order error:', err);
      setError('אירעה שגיאה בחיפוש ההזמנה');
    } finally {
      setLoading(false);
    }
  };

  // Local order specific statuses (simplified flow)
  const localStatusSteps = useMemo(() => {
    return {
      pending: { label: "ההזמנה התקבלה", step: 1, estimatedDays: 3, timeRange: "מעבדים..." },
      ordered: { label: "באריזה", step: 2, estimatedDays: 5, timeRange: "3-7 ימי עסקים" },
      shipping_to_customer: { label: "נמסר לשליח", step: 3, estimatedDays: 1, timeRange: "1-3 ימים" },
      delivered: { label: "נמסר ללקוחה", step: 4, estimatedDays: 0, timeRange: "הושלם" }
    };
  }, []);

  const currentStatusSource = isLocalOrder ? localStatusSteps : (statusSteps || defaultStatusSteps);
  const currentStep = order?.status && currentStatusSource?.[order.status] ? currentStatusSource[order.status].step : 0;
  const currentStatusInfo = order?.status && currentStatusSource?.[order.status] ? currentStatusSource[order.status] : null;

  // MEMO: סדר הסטטוסים למניעת sort בכל רינדור
  const sortedStatusEntries = useMemo(() => {
    const stepsToUse = statusSteps || defaultStatusSteps;
    return Object.entries(stepsToUse).sort(([, a], [, b]) => a.step - b.step);
  }, [statusSteps]);

  const localSortedEntries = useMemo(() => {
    return Object.entries(localStatusSteps).sort(([, a], [, b]) => a.step - b.step);
  }, [localStatusSteps]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-rose-50/30 to-stone-100">
      {/* Hero Section with Background */}
      <div className="relative overflow-hidden bg-gradient-to-r from-stone-100 to-rose-100/40 py-8 sm:py-12 md:py-20">
        <div className="relative max-w-lg mx-auto text-center px-4">
          <div className="flex justify-center mb-3 sm:mb-4 md:mb-6">
            <Heart className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-rose-400 fill-rose-400/20" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-light text-stone-800 mb-2 sm:mb-3 md:mb-4 tracking-wide">
            איפה ההזמנה שלי?
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-stone-600 font-light">הזיני את מספר ההזמנה שלך</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-3 sm:px-4 -mt-4 sm:-mt-6 md:-mt-10 relative z-10">
        {/* Search Card */}
        <div className="bg-white border border-stone-200 shadow-lg p-4 sm:p-6">

          <form onSubmit={searchOrder} className="space-y-3 sm:space-y-4">
            <div className="relative">
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="לדוגמה: BM12345"
                className="h-12 sm:h-14 text-base sm:text-lg text-center bg-stone-50 border-stone-200 focus:border-rose-300 focus:ring-rose-200 placeholder:text-stone-400"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters" />

            </div>
            <Button
              type="submit"
              disabled={loading || !orderNumber.trim()}
              className="w-full h-12 sm:h-14 bg-stone-800 hover:bg-stone-900 text-white text-base sm:text-lg transition-colors disabled:opacity-50">

              {loading ? (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>מחפש...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <Search className="w-5 h-5" />
                  <span>איפה ההזמנה שלי?</span>
                </div>
              )}
            </Button>
          </form>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-3 sm:p-4 bg-rose-50 border border-rose-200 text-center"
              >
                <p className="text-sm sm:text-base text-rose-800">{error}</p>
              </motion.div>
            )}

            {order && statusSteps && Object.keys(statusSteps).length > 0 && (
              <motion.div 
                key="order"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 sm:mt-8"
              >

                {/* Order Header */}
                <div className="text-center mb-6 p-4 sm:p-6 bg-gradient-to-r from-stone-50 to-rose-50/30 border border-stone-200">
                  <div className="mb-2">
                    {isLocalOrder && (
                      <span className="inline-block px-2 sm:px-3 py-1 bg-rose-100 text-rose-800 text-xs font-medium">
                        ⚡ מלאי מקומי - אספקה מהירה
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-light text-stone-800 mb-1 sm:mb-2">
                    הזמנה #{order.order_number}
                  </h3>
                  <p className="text-sm sm:text-base text-stone-600 font-light">
                    בוצעה ב-{order.created_date ? format(new Date(order.created_date), "d בMMMM, yyyy", { locale: he }) : 'זמן האחרון'}
                  </p>
                  
                  {/* Updated Time Estimate */}
                  {currentStatusInfo && currentStatusInfo.estimatedDays > 0 && (
                    <div className="mt-3 p-3 bg-white border border-rose-200">
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4 text-rose-400" />
                        <span className="text-sm text-stone-700">
                          זמן הגעה: {currentStatusInfo.timeRange}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        {isLocalOrder ? 'ימי עסקים' : 'משוער'}
                      </p>
                    </div>
                  )}

                  {currentStatusInfo && currentStatusInfo.estimatedDays === 0 && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200">
                      <div className="flex flex-col items-center gap-2">
                        <Check className="w-12 h-12 text-rose-500" />
                        <span className="text-sm text-rose-800 font-medium">
                          ההזמנה נמסרה! ✨
                        </span>
                      </div>
                    </div>
                  )}
                  </div>

                {/* Status Timeline */}
                <div className="space-y-0">
                  {(isLocalOrder ? localSortedEntries : sortedStatusEntries).filter(Boolean).map(([statusKey, statusInfo], index, arr) => {
                    if (!statusInfo || typeof statusInfo.step === 'undefined') return null;
                    const isActive = statusInfo.step <= currentStep;
                    const isCurrent = statusInfo.step === currentStep;
                    const isLast = index === arr.length - 1;

                    return (
                      <div key={statusKey} className="relative">
                          <div className="flex items-start gap-4 pb-8">
                            {/* Status Indicator */}
                            <div className="flex flex-col items-center">
                              <div
                            className={`w-10 h-10 flex items-center justify-center border-2 transition-all duration-500 ${
                            isActive ?
                            'bg-rose-400 border-rose-400 text-white' :
                            'bg-white border-stone-300 text-stone-400'}`
                            }>

                                {isActive ?
                            <Check className="w-5 h-5" /> :

                            <span className="text-sm font-light">{statusInfo.step}</span>
                            }
                              </div>
                              
                              {/* Connecting Line */}
                              {!isLast &&
                          <div
                            className={`w-0.5 h-12 mt-2 transition-all duration-500 ${
                            isActive ? 'bg-rose-300' : 'bg-stone-200'}`
                            } />

                          }
                            </div>

                            {/* Status Content */}
                            <div className="flex-1 pt-2">
                              <h4 className={`text-lg font-light tracking-wide mb-1 ${
                          isActive ? 'text-stone-800' : 'text-stone-500'}`
                          }>
                                {statusInfo.label}
                              </h4>
                              
                              {isCurrent &&
                          <div className="space-y-2">
                                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800">
                                    <Package className="w-3 h-3" />
                                    <span className="text-sm font-light">סטטוס נוכחי</span>
                                  </div>
                                  
                                  {statusInfo.timeRange &&
                            <div className="flex items-center gap-2 text-sm text-stone-600">
                                      <Clock className="w-3 h-3" />
                                      <span className="font-light">
                                        {isLocalOrder 
                                          ? `זמן אספקה: ${statusInfo.timeRange}`
                                          : `נותרו כ-${statusInfo.timeRange}`}
                                      </span>
                                    </div>
                            }
                                </div>
                          }
                            </div>
                          </div>
                        </div>);

                  })}
                </div>

                {/* Order Items Preview */}
                {order?.items && Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-white/50 border border-stone-200/50">
                    <h4 className="text-base sm:text-lg font-light text-stone-800 mb-3 sm:mb-4">הפריטים שלך</h4>
                    <div className="space-y-2 sm:space-y-3">
                      {order.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-rose-300 flex-shrink-0"></div>
                          <span className="font-light text-stone-700 line-clamp-1">{item.product_name}</span>
                          <span className="text-stone-500">·</span>
                          <span className="text-stone-500 font-light whitespace-nowrap">כמות: {item.quantity}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-stone-300 flex-shrink-0"></div>
                          <span className="text-stone-500 font-light">
                            +{order.items.length - 3} פריטים נוספים
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-8 sm:mt-12 px-3 sm:px-4 pb-6">
          <p className="text-stone-500 font-light text-xs sm:text-sm mb-3 sm:mb-4">
            יש לך שאלות? אנחנו כאן לעזור.
          </p>
          <Button
            asChild
            className="w-auto px-4 sm:px-6 py-2 sm:py-3 bg-stone-800 hover:bg-stone-900 text-white text-sm sm:text-base font-light tracking-wide transition-all duration-300"
          >
            <Link to={createPageUrl('Chat')} className="flex items-center">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
              צ'אט עם נציגה
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}