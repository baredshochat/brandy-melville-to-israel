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
      animate={{ opacity: 1, y: 0 }} className="bg-red-100 text-white mb-6 px-4 py-3 from-rose-500 via-pink-500 to-rose-500 shadow-lg">


      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-center">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <span className="text-slate-800 text-lg font-bold">15% הנחה לכבוד ההשקה</span>
          <Sparkles className="w-5 h-5" />
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="text-slate-800 lucide lucide-clock w-4 h-4" />
          <span className="text-sm">נגמר בעוד:</span>
          <div className="flex gap-1 font-mono font-bold text-sm">
            <span className="bg-white/20 px-2 py-1">{timeLeft.days}י</span>
            <span className="bg-white/20 px-2 py-1">{String(timeLeft.hours).padStart(2, '0')}ש</span>
            <span className="bg-white/20 px-2 py-1">{String(timeLeft.minutes).padStart(2, '0')}ד</span>
            <span className="bg-white/20 px-2 py-1">{String(timeLeft.seconds).padStart(2, '0')}ש</span>
          </div>
        </div>
      </div>
    </motion.div>);

}