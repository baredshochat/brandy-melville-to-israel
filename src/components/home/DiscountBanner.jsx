import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Clock } from 'lucide-react';

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
      hours: Math.floor(difference / (1000 * 60 * 60) % 24),
      minutes: Math.floor(difference / 1000 / 60 % 60),
      seconds: Math.floor(difference / 1000 % 60)
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
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-rose-50 border border-rose-200 py-3 px-4 mb-6"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center">
        <div className="flex items-center gap-2">
          <span className="text-rose-600 font-medium">✨ 15% הנחה לכבוד ההשקה</span>
        </div>
        
        <span className="hidden sm:block text-rose-300">|</span>
        
        <div className="flex items-center gap-2 text-stone-600 text-sm">
          <span>נגמר בעוד</span>
          <div className="flex gap-1 font-mono text-rose-700">
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