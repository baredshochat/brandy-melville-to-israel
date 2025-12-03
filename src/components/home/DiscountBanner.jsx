import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock } from 'lucide-react';

export default function DiscountBanner() {
  const discountEndDate = useMemo(() => new Date('2025-12-13T00:00:00'), []);
  
  const calculateTimeLeft = () => {
    const now = new Date();
    const difference = discountEndDate - now;

    if (difference <= 0) {
      return null;
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [discountEndDate]);

  if (!timeLeft) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-stone-50 border-b border-rose-200/50 py-3 px-4 mb-4"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-center">
        <div className="flex items-center gap-2 text-stone-800">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span className="font-medium">השקה חגיגית! 15% הנחה</span>
        </div>
        
        <div className="flex items-center gap-2 text-stone-600 text-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>נגמר בעוד:</span>
          <div className="flex gap-1 font-medium text-rose-600">
            <span>{timeLeft.days}י</span>
            <span>:</span>
            <span>{String(timeLeft.hours).padStart(2, '0')}ש</span>
            <span>:</span>
            <span>{String(timeLeft.minutes).padStart(2, '0')}ד</span>
            <span>:</span>
            <span>{String(timeLeft.seconds).padStart(2, '0')}ש</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}