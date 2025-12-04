import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto bg-white p-8 border border-stone-200"
    >
      <div className="prose prose-stone max-w-none rtl text-right">
        <h1 className="text-4xl font-semibold text-stone-900 mb-6">תקנון אתר</h1>
        
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">1. כללי</h2>
        <p>1.1. אתר BrandyOrderIL מופעל על ידי בעלי האתר.</p>
        <p>1.2. השימוש באתר כפוף לתנאים המפורטים בתקנון זה ומהווה הסכמה מלאה לתנאים אלו.</p>
        <p>1.3. בעל האתר רשאי לעדכן את התקנון מעת לעת, ללא צורך בהודעה מוקדמת.</p>
        
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">2. אופי השירות</h2>
        <p>2.1. האתר מציע שירות הזמנת פריטי לבוש הנמכרים ממלאי קיים בישראל וכן שירות הזמנה מיוחדת מאתרים בחו"ל.</p>
        <p>2.2. השירות כולל:</p>
        <ul className="list-disc pr-6 space-y-1">
          <li>הצגת מוצרים במלאי מקומי.</li>
          <li>אפשרות שליחת קישורים/צילומי מסך להזמנת פריטים מאתרים בינלאומיים.</li>
          <li>ניהול רכישה, שילוח ותמחור המבוצעים על ידי בעל האתר.</li>
        </ul>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">3. מחירים ותשלום</h2>
        <p>3.1. המחירים המוצגים באתר כוללים מע"מ כחוק, אלא אם צוין אחרת.</p>
        <p>3.2. בעת הזמנה מאתרים בחו"ל המחיר הסופי יחושב לפי:</p>
        <ul className="list-disc pr-6 space-y-1">
          <li>מחיר המוצר המקורי</li>
          <li>עלויות שילוח, מסים ועמלות</li>
          <li>רווח קבוע ומוגדר מראש</li>
        </ul>
        <p>3.3. התשלום יתבצע באמצעות אמצעי התשלום הזמינים באתר (כגון כרטיס אשראי/העברת תשלום/קישור תשלום).</p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">4. אספקה ומשלוחים</h2>
        <p>4.1. זמן האספקה למלאי מקומי: 2–7 ימי עסקים.</p>
        <p>4.2. זמן האספקה להזמנה מאתרים בחו"ל משתנה לפי זמני השילוח, המכס והספקים בחו"ל.</p>
        <p>4.3. עיכובים שאינם בשליטת האתר (חגים, עומסים, מכס, עיכובי הספק בחו"ל) אינם מהווים עילה להחזר.</p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">5. זכויות יוצרים</h2>
        <p>5.1. כל התמונות, הטקסטים והעיצובים באתר שייכים ל-BrandyOrderIL ואין להעתיק, לשכפל או להשתמש בהם ללא אישור.</p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">6. מידע ופרטיות</h2>
        <p>6.1. כל פרטי הלקוחות נשמרים במאגר מאובטח.</p>
        <p>6.2. פרטי תשלום אינם נשמרים באתר.</p>
        <p>6.3. לא ייעשה שימוש במידע הלקוח מלבד לצורך תפעול ההזמנה ועדכון הלקוחה.</p>

        {/* Link to Returns Policy */}
        <div className="mt-10 p-4 bg-stone-50 border border-stone-200">
          <Link 
            to={createPageUrl("ReturnsPolicy")} 
            className="flex items-center justify-between text-stone-800 hover:text-rose-600 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="font-medium">מדיניות החזרה וביטולים</span>
            </div>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}