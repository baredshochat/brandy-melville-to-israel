import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User as UserIcon, Loader2, ThumbsUp, ThumbsDown, Phone } from 'lucide-react';
import { InvokeLLM, SendEmail } from '@/integrations/Core';
import { User } from '@/entities/User';
import { Feedback } from '@/entities/Feedback';
import { ChatConversation } from '@/entities/ChatConversation';
import { Order } from '@/entities/Order';
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

1. סטטוס הזמנה / חיפוש מספר הזמנה
- ברירת מחדל: "אפשר לעקוב אחרי ההזמנה באתר שלנו במדור 'מעקב משלוח' 📦."
- אם הלקוחה לא מוצאת את מספר ההזמנה או לא זוכרת אותו, אמרי לה: "בטח! אני יכולה לעזור לך למצוא את ההזמנה שלך 🔍 כדי לאתר אותה, אני צריכה שלוש פרטים: שם מלא, כתובת אימייל ומספר טלפון."
- לאחר שהלקוחה מספקת את הפרטים, השתמשי בפורמט המיוחד הבא בדיוק (ללא שינויים):
  [SEARCH_ORDER:שם_מלא|כתובת_אימייל|מספר_טלפון]
  לדוגמה: [SEARCH_ORDER:שרה כהן|sara@example.com|0501234567]
- המערכת תחפש את ההזמנה אוטומטית ותציג את התוצאות.

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
  const [conversationId, setConversationId] = useState(null);
  
  // Human agent state
  const [frustrationCount, setFrustrationCount] = useState(0);
  const [showHumanAgentOption, setShowHumanAgentOption] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [agentNotified, setAgentNotified] = useState(false);

  useEffect(() => {
    User.me().then(setUser).catch(() => console.error("User not logged in"));
  }, []);

  // Save conversation to database
  const saveConversation = async (updatedMessages) => {
    const messagesWithTimestamp = updatedMessages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp || new Date().toISOString()
    }));
    
    try {
      if (conversationId) {
        await ChatConversation.update(conversationId, { messages: messagesWithTimestamp });
      } else {
        const newConv = await ChatConversation.create({
          session_id: sessionID,
          customer_email: user?.email || 'anonymous',
          messages: messagesWithTimestamp,
          status: 'active'
        });
        setConversationId(newConv.id);
      }
    } catch (error) {
      console.error("Error saving conversation:", error);
    }
  };

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
      }

      // Check if bot wants to search for an order
      const searchMatch = response.match(/\[SEARCH_ORDER:([^\]]+)\]/);
      if (searchMatch) {
        const [fullName, email, phone] = searchMatch[1].split('|').map(s => s.trim());
        
        // Remove the search command from response
        response = response.replace(searchMatch[0], '').trim();
        
        // Show bot response first
        const botMessage = { role: 'bot', content: response || 'מחפשת את ההזמנה שלך... רגע אחד 🔍' };
        setMessages((prev) => {
          const updated = [...prev, botMessage];
          saveConversation(updated);
          return updated;
        });

        // Search for orders
        try {
          let orders = await Order.list();
          
          // Filter by provided details
          orders = orders.filter(order => {
            const nameMatch = fullName && order.customer_name?.toLowerCase().includes(fullName.toLowerCase());
            const emailMatch = email && order.customer_email?.toLowerCase() === email.toLowerCase();
            const phoneMatch = phone && order.customer_phone?.replace(/\D/g, '').includes(phone.replace(/\D/g, ''));
            return nameMatch || emailMatch || phoneMatch;
          });

          let searchResultMessage = '';
          if (orders.length === 0) {
            searchResultMessage = 'לא מצאתי הזמנות תואמות לפרטים שסיפקת 😔 אולי יש טעות קטנה באיזה שהוא פרט? נסי שוב או פני אלינו בווטסאפ 055-7045322';
          } else if (orders.length === 1) {
            const order = orders[0];
            searchResultMessage = `מצאתי את ההזמנה שלך! 🎉\n\nמספר הזמנה: ${order.order_number}\nסטטוס: ${order.status}\nתאריך ביצוע: ${new Date(order.created_date).toLocaleDateString('he-IL')}\n\nכדי לעקוב אחרי ההזמנה, היכנסי למעקב משלוח והזיני את מספר ההזמנה 📦`;
          } else {
            searchResultMessage = `מצאתי ${orders.length} הזמנות שלך:\n\n` + 
              orders.map(o => `• ${o.order_number} (${o.status}) - ${new Date(o.created_date).toLocaleDateString('he-IL')}`).join('\n') +
              '\n\nכדי לעקוב אחרי הזמנה ספציפית, היכנסי למעקב משלוח והזיני את מספר ההזמנה 📦';
          }

          const searchResultMsg = { role: 'bot', content: searchResultMessage };
          setMessages((prev) => {
            const updated = [...prev, searchResultMsg];
            saveConversation(updated);
            return updated;
          });
        } catch (error) {
          console.error('Error searching orders:', error);
          const errorMsg = { role: 'bot', content: 'אופס, הייתה בעיה בחיפוש ההזמנה 😔 נסי שוב בעוד רגע או פני אלינו בווטסאפ 055-7045322' };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } else {
        // Normal response without search
        const botMessage = { role: 'bot', content: response };
        setMessages((prev) => {
          const updated = [...prev, botMessage];
          saveConversation(updated);
          return updated;
        });
      }
      
      // Check for frustration keywords
      const frustrationKeywords = ['לא עזר', 'לא הבנתי', 'לא מבינה', 'לא עונה', 'נציג', 'אנושי', 'בן אדם', 'מתסכל', 'לא רלוונטי', 'שטויות', 'לא נכון', 'טעות', 'בעיה', 'לא פתר', 'עדיין לא', 'כבר שאלתי', 'שוב', 'לא מספיק'];
      const userMsgLower = messageContent.toLowerCase();
      const hasFrustration = frustrationKeywords.some(kw => userMsgLower.includes(kw));
      
      if (hasFrustration) {
        setFrustrationCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 2 && !agentNotified) {
            setShowHumanAgentOption(true);
          }
          return newCount;
        });
      }

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

  const handleRequestHumanAgent = async () => {
    setShowHumanAgentOption(false);
    setWaitingForAgent(true);
    setAgentNotified(true);
    
    const waitingMessage = { role: 'bot', content: 'מעביר אותך לנציג אנושי... נציג יחזור אלייך בהקדם האפשרי 💬' };
    setMessages(prev => [...prev, waitingMessage]);

    try {
      // Build conversation history for the email
      const conversationText = messages
        .map(msg => `${msg.role === 'user' ? 'לקוח/ה' : 'בוט'}: ${msg.content}`)
        .join('\n\n');

      await SendEmail({
        to: 'Baredshochat35@gmail.com',
        subject: `🚨 בקשה לנציג אנושי - ${user?.email || 'אנונימי'}`,
        body: `
היי! לקוח/ה מבקש/ת לדבר עם נציג אנושי.

📧 פרטי הלקוח/ה:
שם: ${user?.full_name || 'לא ידוע'}
מייל: ${user?.email || 'לא ידוע'}

💬 היסטוריית השיחה:
${conversationText}

---
זמן הבקשה: ${new Date().toLocaleString('he-IL')}
מזהה שיחה: ${sessionID}
        `
      });

      const confirmMessage = { role: 'bot', content: 'הודעתך התקבלה! נציג יצור איתך קשר בהקדם. תודה על הסבלנות 🙏' };
      setMessages(prev => [...prev, confirmMessage]);
      
    } catch (error) {
      console.error("Failed to send email to agent:", error);
      const errorMessage = { role: 'bot', content: 'אופס, הייתה בעיה בשליחת הבקשה. אפשר לפנות אלינו ישירות בווטסאפ: 055-7045322 📲' };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] sm:h-[calc(100vh-150px)] max-w-2xl mx-auto bg-white border-0 sm:border border-stone-200 shadow-none sm:shadow-lg -mx-3 sm:mx-auto">
      <header className="p-3 sm:p-4 border-b text-center bg-gradient-to-r from-rose-50 to-pink-50 sticky top-0 z-10">
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-400 flex items-center justify-center text-white">
            <Bot size={18} className="sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-semibold text-stone-800">ברנדי</h1>
            <p className="text-[10px] sm:text-xs text-stone-500">נציגה וירטואלית • מוכנה לעזור</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-6 bg-stone-50/50">
        <AnimatePresence>
          {messages.map((msg, index) =>
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {msg.role === 'bot' &&
            <div className="w-7 h-7 bg-rose-400 flex items-center justify-center text-white flex-shrink-0 mt-1">
                  <Bot size={14} />
                </div>
            }
              <div
              className={`max-w-[85%] sm:max-w-md p-3 text-[13px] sm:text-base leading-relaxed ${
              msg.role === 'user' ?
              'bg-stone-800 text-white' :
              'bg-white text-stone-800 border border-stone-200 shadow-sm'}`
              }>

                <MessageContent content={msg.content} />
              </div>
               {msg.role === 'user' &&
            <div className="w-7 h-7 bg-stone-700 flex items-center justify-center text-white flex-shrink-0 mt-1">
                  <UserIcon size={14} />
                </div>
            }
            </motion.div>
          )}
        </AnimatePresence>
        {loading && !feedbackState &&
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 justify-start">

              <div className="w-7 h-7 bg-rose-400 flex items-center justify-center text-white flex-shrink-0 mt-1">
                  <Bot size={14} />
              </div>
              <div className="p-3 bg-white border border-stone-200 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                  <span className="text-xs text-stone-500">מקלידה...</span>
              </div>
          </motion.div>
        }
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 sm:p-4 border-t bg-white safe-area-bottom">
        {showHumanAgentOption && !waitingForAgent && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-2 sm:mb-4 p-2 sm:p-3 bg-rose-50 border border-rose-200">
                <p className="text-xs text-stone-700 mb-2">צריכה עזרה נוספת?</p>
                <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowHumanAgentOption(false)} className="text-[11px] sm:text-sm h-8 px-3">
                        לא, תודה
                    </Button>
                    <Button size="sm" onClick={handleRequestHumanAgent} className="text-[11px] sm:text-sm h-8 px-3 bg-rose-500 hover:bg-rose-600">
                        <Phone className="w-3 h-3 ml-1" /> נציג אנושי
                    </Button>
                </div>
            </motion.div>
        )}
        {showFeedbackButtons && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-2 sm:mb-4">
                <p className="text-xs text-stone-600 mb-2">קיבלת מענה מלא?</p>
                <div className="flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleFeedback(1)} className="text-[11px] sm:text-sm h-8 px-3"><ThumbsDown className="w-3 h-3 ml-1" /> לא</Button>
                    <Button variant="outline" size="sm" onClick={() => handleFeedback(5)} className="text-[11px] sm:text-sm h-8 px-3"><ThumbsUp className="w-3 h-3 ml-1" /> כן</Button>
                </div>
            </motion.div>
        )}
        {feedbackState === 'prompt_comment' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mb-2 sm:mb-4">
                <Textarea 
                    placeholder="ספרי לנו מה היה חסר..." 
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    className="pl-12 text-sm h-14 sm:h-20 resize-none"
                    onKeyPress={(e) => e.key === 'Enter' && !loading && handleCommentSubmit()}
                />
                <Button size="icon" onClick={handleCommentSubmit} disabled={loading || !feedbackComment.trim()} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-rose-500 hover:bg-rose-600">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send size={16} />}
                </Button>
            </motion.div>
        )}

        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="כתבי הודעה..."
            value={input}
            onChange={(e) => e.target.value.length <= 250 && setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
            className="flex-1 h-11 sm:h-12 text-sm sm:text-base border-stone-300 focus:border-rose-300"
            disabled={loading || showFeedbackButtons || feedbackState === 'prompt_comment'} />

          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={loading || !input.trim() || showFeedbackButtons || feedbackState === 'prompt_comment'}
            className="h-11 w-11 sm:h-12 sm:w-12 bg-rose-500 hover:bg-rose-600 flex-shrink-0">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </div>
    </div>);
}