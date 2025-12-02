import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, ArrowLeft } from "lucide-react";

export default function ReturnsPolicyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto bg-white p-8 border border-stone-200"
    >
      <div className="prose prose-stone max-w-none rtl text-right">
        <h1 className="text-4xl font-semibold text-stone-900 mb-6">מדיניות החזרה וביטולים</h1>
        
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">1. החזרות על מלאי מקומי</h2>
        <p>1.1. ניתן להחזיר פריט שנרכש מהמלאי המקומי תוך 14 ימים מיום קבלתו.</p>
        <p>1.2. הפריט חייב להיות:</p>
        <ul className="list-disc pr-6 space-y-1">
          <li>חדש, ללא סימני שימוש</li>
          <li>עם תגיות מקוריות</li>
          <li>באריזתו המקורית</li>
        </ul>
        <p>1.3. החזר יינתן בצורת זיכוי לאתר או החזר כספי בהתאם לחוק.</p>
        <p>1.4. עלות משלוח החזרה תחול על הלקוחה.</p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">2. החזרות בהזמנה מאתרים בחו"ל</h2>
        <p>2.1. הזמנה מיוחדת שמתבצעת לפי בקשת הלקוחה (שליחת לינק/סל/צילומי מסך) נחשבת "לפי מידה" או "בהזמנה אישית" ולכן אינה ניתנת לביטול לאחר ביצוע הרכישה.</p>
        <p>2.2. במקרים חריגים של טעות מצד האתר (למשל: פריט שגוי לחלוטין) יינתן פתרון הוגן בהתאם למקרה.</p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">3. ביטול עסקה לפני ביצוע הזמנה מספק בחו"ל</h2>
        <p>3.1. אם טרם בוצעה הרכישה מהספק בחו"ל — ניתן לבטל ללא עלות.</p>
        <p>3.2. אם ההזמנה כבר בוצעה — אין אפשרות ביטול.</p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">4. פריטים פגומים</h2>
        <p>4.1. במקרה של פגם מהותי במוצר שהתקבל, יש לפנות תוך 48 שעות מצילום קבלת החבילה.</p>
        <p>4.2. לאחר בדיקה — יינתן החזר, החלפה או זיכוי בהתאם למקרה.</p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">5. עיכובים במשלוח</h2>
        <p>5.1. עיכובים שנגרמים עקב מכס, חברת שילוח, חגים, או עיכובים אצל הספק אינם מזכים לביטול עסקה או החזר.</p>
        <p>5.2. הלקוחה תקבל עדכונים לאורך הדרך במידת האפשר.</p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">6. אי התאמה במידות/צבע</h2>
        <p>6.1. במוצרים מחו"ל האחריות להתאמת המידה/הצבע היא על הלקוחה.</p>
        <p>6.2. לא תינתן אחריות על מידות או צבעים המוצגים באתרי צד שלישי.</p>

        {/* Link back to Terms */}
        <div className="mt-10 p-4 bg-stone-50 border border-stone-200">
          <Link 
            to={createPageUrl("Terms")} 
            className="flex items-center justify-between text-stone-800 hover:text-rose-600 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              <span className="font-medium">תקנון האתר</span>
            </div>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}