import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Loader2 } from 'lucide-react';

export default function LoadingCalculation({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center justify-center min-h-[400px] p-8"
    >
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="inline-block mb-6"
        >
          <Calculator className="w-16 h-16 text-rose-400" />
        </motion.div>
        
        <h2 className="text-2xl font-semibold text-stone-900 mb-3">
          מחשב עלויות משלוח
        </h2>
        
        <div className="flex items-center justify-center gap-2 text-stone-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p>אנא המתיני רגע...</p>
        </div>
        
        <p className="text-sm text-stone-500 mt-4">
          מחשבים משלוח בינלאומי, מכס ועמלות
        </p>
      </div>
    </motion.div>
  );
}