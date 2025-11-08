import React from "react";
import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto bg-white p-8 border border-stone-200"
    >
      <div className="prose prose-stone max-w-none rtl text-right">
        <h1 className="text-4xl font-semibold text-stone-900 mb-6">תקנון האתר</h1>
        
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">1. כללי</h2>
        <p>
          אנו מברכים אותך על השימוש באתר BrandyStyle Finder. השימוש באתר, לרבות כל התכנים והשירותים המוצעים בו, כפוף לתנאים המפורטים בתקנון זה. אנא קראי את התקנון בעיון, שכן שימוש באתר מהווה הסכמה לכל תנאיו.
        </p>
        
        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">2. מהות השירות</h2>
        <p>
          האתר מספק שירותי תיווך וסיוע ברכישת מוצרים מאתרי Brandy Melville הרשמיים בחו"ל ושילוחם לישראל. אנו פועלים כשליח אישי עבורך, מבצעים את ההזמנה בשמך, ומטפלים בכל הלוגיסטיקה הכרוכה בכך, לרבות שילוח בינלאומי, עמילות מכס ומשלוח פנים-ארצי.
        </p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">3. אחריות וביטולים</h2>
        <p>
          מאחר ואנו פועלים כשירות תיווך, אחריותנו מוגבלת לטיפול תקין בהזמנה ובתהליך השילוח. מדיניות ההחזרות והביטולים כפופה למדיניות האתר המקורי ממנו בוצעה ההזמנה ובתוספת עלויות השילוח והטיפול. במקרה של מוצר פגום, נעשה כל מאמץ לסייע מול האתר המקורי.
        </p>

        <h2 className="text-2xl font-semibold text-stone-800 mt-8 mb-4">4. עלויות ותשלום</h2>
        <p>
          המחיר הסופי המוצג באתר כולל את כל העלויות: מחיר המוצר, משלוחים, מיסים (מכס ומע"מ), ועמלת השירות שלנו. אין עלויות נסתרות. התשלום מתבצע מראש והוא תנאי לביצוע ההזמנה.
        </p>

        <p className="mt-8">
          <strong>ניתן לעדכן את תוכן התקנון כאן.</strong>
        </p>
      </div>
    </motion.div>
  );
}