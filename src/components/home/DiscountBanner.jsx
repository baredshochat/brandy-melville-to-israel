import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DISCOUNT_END_DATE = new Date('2025-12-13T00:00:00');

export default function DiscountBanner() {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const now = new Date();
    const difference = DISCOUNT_END_DATE - now;

    if (difference <= 0) {
      return null;
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!timeLeft) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-stone-50 border-b border-stone-200 py-2.5 px-4 mb-4"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
        <span className="text-stone-700 text-sm">
          <span className="font-medium">15% הנחה לכבוד ההשקה</span>
          <span className="text-stone-400 mx-2">•</span>
          <span className="text-stone-500">לזמן מוגבל</span>
        </span>
        
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <span>נותרו</span>
          <span className="font-medium text-stone-700">{timeLeft.days}</span>
          <span>ימים</span>
          <span className="font-medium text-stone-700">{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}</span>
        </div>
      </div>
    </motion.div>
  );
}