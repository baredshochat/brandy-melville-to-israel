import React from 'react';
import { Truck, ShieldCheck, MessageSquare } from 'lucide-react';

export default function ValueProps() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="flex items-center gap-3 bg-white/80 border border-stone-200 p-3">
        <Truck className="w-5 h-5 text-rose-500" />
        <div>
          <p className="text-sm font-medium text-stone-800">אספקה מהירה מהמלאי</p>
          <p className="text-xs text-stone-500">מוצרים מקומיים נשלחים תוך 3–7 ימי עסקים</p>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-white/80 border border-stone-200 p-3">
        <ShieldCheck className="w-5 h-5 text-rose-500" />
        <div>
          <p className="text-sm font-medium text-stone-800">מחיר סופי – ללא הפתעות</p>
          <p className="text-xs text-stone-500">מיסים ועמלות כבר כלולים בתמחור</p>
        </div>
      </div>
      <div className="flex items-center gap-3 bg-white/80 border border-stone-200 p-3">
        <MessageSquare className="w-5 h-5 text-rose-500" />
        <div>
          <p className="text-sm font-medium text-stone-800">שירות לקוחות אנושי</p>
          <p className="text-xs text-stone-500">עוזרות בכל שלב בדרך</p>
        </div>
      </div>
    </div>
  );
}