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

        {/* 1 */}
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">1. כללי</h2>
        <p>1.1. אתר BrandyOrderIL מופעל על ידי בעלי האתר.</p>
        <p>1.2. השימוש באתר כפוף לתנאים המפורטים בתקנון זה ומהווה הסכמה מלאה לתנאים אלו.</p>
        <p>1.3. בעל האתר רשאי לעדכן את התקנון מעת לעת, ללא צורך בהודעה מוקדמת.</p>

        {/* 2 */}
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">2. אופי השירות</h2>
        <p>
          2.1. האתר מציע שירות הזמנת פריטי לבוש הנמכרים ממלאי קיים בישראל וכן שירות הזמנה מיוחדת מאתרים
          בחו"ל.
        </p>
        <p>2.2. השירות כולל:</p>
        <ul className="list-disc pr-6 space-y-1">
          <li>הצגת מוצרים במלאי מקומי.</li>
          <li>אפשרות שליחת קישורים/צילומי מסך להזמנת פריטים מאתרים בינלאומיים.</li>
          <li>ניהול רכישה, שילוח ותמחור המבוצעים על ידי בעל האתר.</li>
        </ul>

        {/* 3 */}
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">3. מחירים ותשלום</h2>
        <p>3.1. המחירים המוצגים באתר כוללים מע"מ כחוק, אלא אם צוין אחרת.</p>
        <p>3.2. בעת הזמנה מאתרים בחו"ל המחיר הסופי יחושב לפי:</p>
        <ul className="list-disc pr-6 space-y-1">
          <li>מחיר המוצר המקורי</li>
          <li>עלויות שילוח, מסים ועמלות</li>
          <li>רווח קבוע ומוגדר מראש</li>
        </ul>
        <p>3.3. התשלום יתבצע באמצעות אמצעי התשלום הזמינים באתר.</p>

        {/* 4 */}
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">4. אספקה ומשלוחים</h2>
        <p>4.1. זמן האספקה למלאי מקומי: 2–7 ימי עסקים.</p>
        <p>4.2. זמן האספקה להזמנה מחו"ל משתנה לפי זמני השילוח, המכס והספקים בחו"ל.</p>
        <p>4.3. עיכובים שאינם בשליטת האתר אינם מהווים עילה להחזר.</p>

        {/* 5 */}
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">5. זכויות יוצרים</h2>
        <p>5.1. כל התמונות, הטקסטים והעיצובים באתר שייכים ל-BrandyOrderIL ואין להשתמש בהם ללא אישור.</p>

        {/* 6 */}
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">6. מידע ופרטיות</h2>
        <p>6.1. כל פרטי הלקוחות נשמרים במאגר מאובטח.</p>
        <p>6.2. פרטי תשלום אינם נשמרים באתר.</p>
        <p>6.3. לא ייעשה שימוש במידע הלקוח מלבד לצורך תפעול ההזמנה ועדכון הלקוחה.</p>

        {/* 7 */}
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">
          7. אחריות, הגבלת אחריות ושימוש במערכות צד שלישי
        </h2>

        <p>
          7.1. האתר עושה שימוש בפלטפורמת Base44 ובמערכות צד שלישי נוספות לצורך תפעול, ניהול מידע, הצגת
          נתונים, תקשורת עם לקוחות וביצוע פעולות טכניות שונות.
        </p>
        <p>
          7.2. ייתכנו תקלות, אי-דיוקים, שיבושים, טעויות תצוגה, עיכובים בהצגת נתונים או חוסר זמינות זמני
          של האתר הנובעים ממערכות אלו. לבעל האתר אין שליטה על אירועים אלו ולא תוטל עליו כל אחריות.
        </p>
        <p>
          7.3. בעל האתר לא יהיה אחראי לכל נזק הנובע מהסתמכות על מידע שהוצג באתר בעקבות שגיאה טכנית או
          תקלה במערכות צד שלישי.
        </p>
        <p>
          7.4. במקרה של פער בין המידע באתר לבין המידע במערכות התפעוליות – המידע במערכות התפעוליות ייחשב
          כמחייב.
        </p>
        <p>
          7.5. שימוש באתר מהווה ויתור על כל טענה הקשורה לתקלות שמקורן בצד שלישי.
        </p>

        {/* 8 - סעיף צ'אט בוט */}
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">
          8. שימוש בצ'אט־בוט ובמערכת אוטומטית (AI)
        </h2>

        <p>
          8.1. האתר מציע מערכת תמיכה אוטומטית (צ'אט־בוט) המספקת מידע והכוונה המבוססים על אלגוריתמים של
          בינה מלאכותית.
        </p>
        <p>
          8.2. ייתכנו טעויות, חוסר דיוקים, מידע חלקי או מידע שאינו משקף את מצב המלאי, המחירים או תנאי
          השירות בפועל.
        </p>
        <p>
          8.3. המידע של הצ'אט־בוט אינו מהווה התחייבות של האתר ואינו מהווה מידע מחייב.
        </p>
        <p>
          8.4. בכל מקרה של סתירה – המידע באתר ובמערכות התפעוליות הוא הקובע.
        </p>
        <p>
          8.5. בעל האתר אינו אחראי לכל נזק הנובע מהסתמכות על מידע שמגיע מצ'אט־בוט או מערכת AI.
        </p>
        <p>
          8.6. השימוש בצ'אט־בוט מהווה הסכמה של הלקוחה לכך שמדובר במערכת אוטומטית העלולה לטעות.
        </p>

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
