import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Feedback } from "@/entities/Feedback";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Search, Loader2, ThumbsUp, ThumbsDown, Calendar, Mail, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function ChatLogs() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUserRole(user.role);
        loadFeedbacks();
      } catch (error) {
        window.location.href = createPageUrl('Home');
      }
    };
    checkAccess();
  }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const data = await Feedback.list('-created_date', 100);
      // Filter only chat session feedbacks
      const chatFeedbacks = data.filter(f => f.order_id?.startsWith('session_') || f.comment?.includes('Chat session'));
      setFeedbacks(chatFeedbacks);
    } catch (error) {
      console.error("Error loading feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      f.customer_email?.toLowerCase().includes(query) ||
      f.comment?.toLowerCase().includes(query) ||
      f.order_id?.toLowerCase().includes(query)
    );
  });

  const getRatingDisplay = (rating) => {
    if (rating === 5) {
      return <span className="flex items-center gap-1 text-green-600"><ThumbsUp className="w-4 h-4" /> חיובי</span>;
    } else if (rating === 1) {
      return <span className="flex items-center gap-1 text-red-600"><ThumbsDown className="w-4 h-4" /> שלילי</span>;
    }
    return <span className="text-stone-500">לא דורג</span>;
  };

  const extractComment = (comment) => {
    if (!comment) return null;
    // Extract actual comment if exists
    const commentMatch = comment.match(/Comment:\s*(.+)/);
    if (commentMatch) {
      return commentMatch[1];
    }
    return null;
  };

  const handleDelete = async (feedbackId) => {
    if (!confirm("למחוק את המשוב הזה?")) return;
    try {
      await Feedback.delete(feedbackId);
      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
    } catch (error) {
      console.error("Error deleting feedback:", error);
      alert("שגיאה במחיקה");
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-stone-400 mb-4" />
          <p className="text-stone-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">לוג שיחות צ'אט</h1>
          <p className="text-stone-600">צפייה במשובים ושיחות מהבוט</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.location.href = createPageUrl('Chat')}
          className="flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          לצ'אט
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute right-3 top-3 w-5 h-5 text-stone-400" />
          <Input
            placeholder="חיפוש לפי מייל או תוכן..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-stone-900">{feedbacks.length}</div>
            <p className="text-sm text-stone-500">סה"כ משובים</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">
              {feedbacks.filter(f => f.rating === 5).length}
            </div>
            <p className="text-sm text-stone-500">משובים חיוביים</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-red-600">
              {feedbacks.filter(f => f.rating === 1).length}
            </div>
            <p className="text-sm text-stone-500">משובים שליליים</p>
          </CardContent>
        </Card>
      </div>

      {/* Feedbacks List */}
      <Card>
        <CardHeader>
          <CardTitle>משובים אחרונים ({filteredFeedbacks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-stone-400" />
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-stone-300" />
              <p>אין משובים להצגה</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFeedbacks.map((feedback) => (
                <div 
                  key={feedback.id} 
                  className="p-4 border border-stone-200 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-4">
                      {getRatingDisplay(feedback.rating)}
                      <span className="flex items-center gap-1 text-sm text-stone-500">
                        <Mail className="w-3 h-3" />
                        {feedback.customer_email || 'אנונימי'}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-stone-400">
                      <Calendar className="w-3 h-3" />
                      {feedback.created_date ? format(new Date(feedback.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '—'}
                    </span>
                  </div>
                  
                  {extractComment(feedback.comment) && (
                    <div className="mt-2 p-3 bg-stone-50 text-sm text-stone-700">
                      <strong>תגובת הלקוח:</strong> {extractComment(feedback.comment)}
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-stone-400">
                    מזהה שיחה: {feedback.order_id || '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}