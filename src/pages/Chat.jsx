
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User as UserIcon, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import { User } from '@/entities/User';
import { Feedback } from '@/entities/Feedback';
import MessageContent from '../components/chat/MessageContent';

// The context for the AI assistant
const CONTEXT_PROMPT = `
אתה צ'אטבוט שירות לקוחות של חנות Brandy-style לישראל. 
המטרה: לפתור ≥90% מהפניות לבד, בצורה נעימה, ברורה ומקצועית, ולצמצם פניות לנציג אנושי.

🗣️ טון:
- ידידותי, מנומס, מזמין, מבין.
- תשובות קצרות וברורות.
- להשתמש באימוג'י עדינים (✨🙏📦).

========================
📦 נושאי מענה קבועים:

1. סטטוס הזמנה
- ברירת מחדל: "אפשר לעקוב אחרי ההזמנה באתר שלנו במדור 'מעקב משלוח' 📦."
- אם הלקוחה לא מוצאת, בקש את שמה המלא, המייל ומספר ההזמנה, וחפש את הסטטוס.

2. זמני אספקה
2.1 הזמנות מחו"ל (אירופה/בריטניה):
- אם הלקוחה שואלת באופן כללי על זמני משלוח, עני: "זמן האספקה המשוער הוא בין 3 ל-4 שבועות מרגע ביצוע ההזמנה ✈️📦."
- רק אם הלקוחה מתלוננת על עיכוב או מציינת שהזמנתה טרם הגיעה למרות שעבר זמן רב, השתמשי בניסוח מרכך: "אני מבינה, זה לגמרי יכול להיות מתסכל לחכות. תודה רבה על הסבלנות שלך 🙏 בואי נבדוק את זה יחד." ואז עברי לבקש פרטי הזמנה.

2.2 מלאי מקומי (ישראל):
- "פריטים מהמלאי המקומי שלנו מגיעים תוך 3-7 ימי עסקים בלבד! ⚡"
- "ימי עסקים לא כוללים שישי-שבת, חגים ומועדים."
- "זו אספקה מהירה במיוחד כי הפריטים כבר נמצאים במלאי שלנו בישראל 🇮🇱"

3. משלוחים ועלויות
3.1 הזמנות מחו"ל:
- "משלוח עד הבית עולה ₪30. בהזמנות מעל ₪399, המשלוח חינם 🎉."
- "בכל מקרה, המחיר באתר סופי וכולל את כל המסים והאגרות. אין תשלומים נוספים לאחר ביצוע ההזמנה ✅."

3.2 מלאי מקומי:
- "משלוח מהמלאי המקומי עולה ₪35 בלבד, והמחיר שאת רואה הוא סופי."
- "אין עלויות נוספות - לא מכס, לא עמלות, רק המחיר + 35 ש״ח משלוח ✨"

4. החזרות/החלפות
4.1 הזמנות מחו"ל:
- "מאחר וזהו ייבוא אישי מחו"ל – אין אפשרות להחזרות או החלפות."
- אם היא מציינת פגם או פריט שגוי, הנחה אותה לשלוח תמונות ומייל אישור הזמנה תוך 7 ימים, והסבר שברוב המקרים יוענק זיכוי להזמנה הבאה ✨.

4.2 מלאי מקומי:
- "פריטים מהמלאי המקומי ניתנים להחזרה תוך 14 יום מיום הקבלה, בתנאי שהם לא נלבשו ועם התווית המקורית."
- "ההחזרה מתבצעת על ידי שליחת הפריט חזרה אלינו, והחזר כספי ינתן תוך 7-10 ימי עסקים."

5. ביטולים
- "לא ניתן לשנות או לתקן הזמנה לאחר שבוצעה (כולל כתובת). ניתן לבטל הזמנה עד 48 שעות מהביצוע דרך האזור האישי ('דיווח על בעיה'). הביטול כרוך ב-5% דמי ביטול, בהתאם לחוק."

6. החזר כספי
- "הזיכוי מתבצע לאמצעי התשלום המקורי שבו שולמה ההזמנה. משך הזמן לקבלת ההחזר תלוי במדיניות חברת האשראי 💳⌛."

7. מידות
- "כל הפריטים שלנו הם One Size. לפרטים נוספים, ניתן להיעזר במדריך המידות באתר הרשמי של Brandy Melville."

8. חנות פיזית / פופ-אפ
- "אין לנו חנות קבועה או אפשרות למדוד פריטים. אנחנו מקיימות פופ-אפ מדי פעם, ומודיעות על כך באינסטגרם שלנו 📸 instagram.com/brandymelville.il"

9. תשלום
- "אפשר לשלם באשראי או ב-Bit. שני אמצעי התשלום מאובטחים לחלוטין ✅."

10. קופונים
- "בהצטרפות למועדון הלקוחות שלנו ✨ תקבלי קוד הנחה של 10% להזמנה הראשונה, וגם תתעדכני במבצעים והטבות. לאחר ההצטרפות, קוד ההנחה יישלח אלייך למייל 📩."

11. SMS לתשלום נוסף
- "שימי לב, המחיר באתר הוא סופי וכולל הכל ✅. אנחנו לעולם לא מבקשות תשלום נוסף ב-SMS. אם קיבלת הודעה כזו, היא לא מאיתנו ומומלץ להתעלם ממנה 🙏. לעולם אל תמסרי פרטי אשראי בהודעות כאלה."

12. מלאי מקומי
- "יש לנו מלאי מקומי של פריטי ברנדי מלוויל זמינים בארץ! 🇮🇱"
- "היתרון: אספקה מהירה של 3-7 ימי עסקים בלבד, ומחיר פשוט - מחיר הפריט + 35 ש״ח משלוח."
- "כדי לראות את המלאי המקומי, יש לבחור באפשרות 'ישראל' בעמוד הראשי."

13. נציג אנושי
- ברירת מחדל: את מטפלת לבד.
- רק אם הלקוחה מתעקשת, מסרי את הפרטים הבאים: "נציג אנושי זמין בווטסאפ 📲 במספר 055-7045322, בימים א׳–ה׳ בין 10:00–16:00. זמן המענה הוא עד יום עסקים אחד."

========================
📊 סיום שיחה ומשוב:
כאשר את מזהה שהגעת לסוף השיחה ופתרת את שאלת הלקוחה, סיימי את תשובתך עם הסימון המיוחד הבא בשורה נפרדת: [END_OF_CONVERSATION]
הסימון הזה יפעיל את מערכת המשוב בצד המשתמש.

========================
⚡ עקרונות חשובים:
- שפה: עני תמיד בעברית תקנית וברורה. הימנעי לחלוטין מערבוב שפות (עברית-אנגלית). השתמשי במונחים באנגלית רק כשאין חלופה טובה בעברית (למשל, "One Size", "Pop-up").
- יוזמה: אל תציעי לפנות לנציג אנושי מיד. נסי תמיד לפתור את הבעיה בעצמך קודם.
- טרמינולוגיה: אל תשתמשי במונחים טכניים כמו "מכס" או "מע״מ". השתמשי תמיד בביטוי "מסים ואגרות כלולים".
- אחידות: הקפידי על שימוש במטבע שקלים (₪) ובפורמט ברור (למשל, ₪1,290).
- הבחנה: אם הלקוחה שואלת על זמני משלוח או מחיר, ברר האם היא מתעניינת בהזמנה מחו"ל או במלאי מקומי, והתאימי את התשובה בהתאם.
`;

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'היי! אני ברנדי, הנציגה הווירטואלית שלך. איך אני יכולה לעזור היום? 💖' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // New state for feedback
  const [user, setUser] = useState(null);
  const [showFeedbackButtons, setShowFeedbackButtons] = useState(false);
  const [feedbackState, setFeedbackState] = useState(null); // null | 'prompt_comment' | 'thank_you'
  const [feedbackComment, setFeedbackComment] = useState('');
  const [sessionID] = useState(() => `session_${Date.now()}`); // To link feedback to a session

  useEffect(() => {
    User.me().then(setUser).catch(() => console.error("User not logged in"));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, feedbackState]);

  const handleSend = async (messageContent = input) => {
    if (!messageContent.trim()) return;

    setShowFeedbackButtons(false);
    setFeedbackState(null);

    const userMessage = { role: 'user', content: messageContent };
    setMessages((prev) => [...prev, userMessage]);
    if (messageContent === input) {
        setInput('');
    }
    setLoading(true);

    try {
      // LIMIT HISTORY: use only the last 10 exchanges to reduce tokens and latency
      const recentMessages = messages.slice(-10);
      const history = recentMessages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
      const fullPrompt = `${CONTEXT_PROMPT}\n\n---\nהיסטוריית השיחה הנוכחית:\n${history}\n\nuser: ${messageContent}\n\nbot:`;

      let response = await InvokeLLM({ prompt: fullPrompt });

      if (typeof response === 'string' && response.includes('[END_OF_CONVERSATION]')) {
          response = response.replace('[END_OF_CONVERSATION]', '').trim();
          setTimeout(() => setShowFeedbackButtons(true), 500); // Show feedback buttons after message appears
      }

      const botMessage = { role: 'bot', content: response };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error("Error invoking LLM:", error);
      const errorMessage = { role: 'bot', content: 'אוי, נראה שיש לי בעיה קטנה. אולי ננסה שוב בעוד כמה רגעים? 🙏' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (rating) => {
      setShowFeedbackButtons(false);
      try {
        await Feedback.create({
            customer_email: user?.email || 'anonymous',
            rating: rating,
            comment: `Chat session: ${sessionID}`,
            order_id: sessionID, // Using for session ID
        });

        if (rating === 5) { // '👍 כן, מעולה'
            setFeedbackState('thank_you');
            const thankYouMessage = { role: 'bot', content: 'מעולה! שמחות לשמוע 😊' };
            setMessages(prev => [...prev, thankYouMessage]);
        } else { // '👎 לא בדיוק'
            setFeedbackState('prompt_comment');
            const promptMessage = { role: 'bot', content: 'נשמח לשפר 💫 ספרי לנו במשפט קצר מה היה חסר לך או מה אפשר לעשות טוב יותר.' };
            setMessages(prev => [...prev, promptMessage]);
        }
      } catch (e) {
        console.error("Failed to save feedback", e);
      }
  };

  const handleCommentSubmit = async () => {
      if (!feedbackComment.trim()) return;
      setLoading(true);

      try {
        await Feedback.create({
            customer_email: user?.email || 'anonymous',
            rating: 1,
            comment: `Chat session: ${sessionID}\nComment: ${feedbackComment}`,
            order_id: sessionID,
        });

        setFeedbackComment('');
        setFeedbackState('thank_you');
        const thankYouMessage = { role: 'bot', content: 'תודה רבה על המשוב! אנחנו נשתפר בזכותך. 🙏' };
        setMessages(prev => [...prev, thankYouMessage]);

      } catch (e) {
          console.error("Failed to save feedback comment", e);
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-150px)] max-w-2xl mx-auto bg-white border border-stone-200 shadow-lg">
      <header className="p-3 sm:p-4 border-b text-center bg-rose-50">
        <h1 className="text-lg sm:text-xl font-semibold text-stone-800">צ'אט עם נציגה</h1>
        <p className="text-xs sm:text-sm text-stone-600">אני כאן כדי לענות על כל השאלות שלך </p>
      </header>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        <AnimatePresence>
          {messages.map((msg, index) =>
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-end gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {msg.role === 'bot' &&
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-400 flex items-center justify-center text-white flex-shrink-0">
                  <Bot size={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
            }
              <div
              className={`max-w-xs md:max-w-md p-2 sm:p-3 rounded-lg text-sm sm:text-base ${
              msg.role === 'user' ?
              'bg-stone-800 text-white rounded-br-none' :
              'bg-stone-100 text-stone-800 rounded-bl-none'}`
              }>

                <MessageContent content={msg.content} />
              </div>
               {msg.role === 'user' &&
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 flex-shrink-0">
                  <UserIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
            }
            </motion.div>
          )}
        </AnimatePresence>
        {loading && !feedbackState &&
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-end gap-2 sm:gap-3 justify-start">

              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-rose-400 flex items-center justify-center text-white flex-shrink-0">
                  <Bot size={16} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <div className="p-2 sm:p-3 bg-stone-100 rounded-lg rounded-bl-none">
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-stone-400" />
              </div>
          </motion.div>
        }
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 sm:p-4 border-t bg-white">
        {showFeedbackButtons && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-stone-600 mb-2">האם קיבלת מענה מלא?</p>
                <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleFeedback(1)} className="text-xs sm:text-sm h-8 sm:h-9"><ThumbsDown className="w-3 h-3 sm:w-4 sm:h-4 ml-2" /> לא בדיוק</Button>
                    <Button variant="outline" size="sm" onClick={() => handleFeedback(5)} className="text-xs sm:text-sm h-8 sm:h-9"><ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 ml-2" /> כן, מעולה</Button>
                </div>
            </motion.div>
        )}
        {feedbackState === 'prompt_comment' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mb-3 sm:mb-4">
                <Textarea 
                    placeholder="ספרי לנו מה היה חסר..." 
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="pl-10 sm:pl-12 text-xs sm:text-sm h-16 sm:h-20"
                    onKeyPress={(e) => e.key === 'Enter' && !loading && handleCommentSubmit()}
                />
                <Button size="icon" onClick={handleCommentSubmit} disabled={loading || !feedbackComment.trim()} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-stone-800 hover:bg-black rounded-full">
                    {loading ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin"/> : <Send size={14} className="sm:w-[18px] sm:h-[18px]" />}
                </Button>
            </motion.div>
        )}

        <div className="relative">
          <Input
            type="text"
            placeholder="כתבי את שאלתך כאן..."
            value={input}
            onChange={(e) => e.target.value.length <= 250 && setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
            className="h-10 sm:h-12 pr-10 sm:pr-12 text-sm sm:text-base rounded-full"
            disabled={loading || showFeedbackButtons || feedbackState === 'prompt_comment'} />

          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={loading || !input.trim() || showFeedbackButtons || feedbackState === 'prompt_comment'}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 bg-stone-800 hover:bg-black rounded-full">

            <Send size={14} className="sm:w-[18px] sm:h-[18px]" />
          </Button>
        </div>
      </div>
    </div>);
}
