import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { Feedback } from "@/entities/Feedback";
import { ChatConversation } from "@/entities/ChatConversation";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Search, Loader2, ThumbsUp, ThumbsDown, Calendar, Mail, Trash2, Eye, Bot, User as UserIcon, Check, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function ChatLogs() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [viewMode, setViewMode] = useState('conversations');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUserRole(user.role);
        loadData();
      } catch (error) {
        window.location.href = createPageUrl('Home');
      }
    };
    checkAccess();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [feedbackData, conversationData] = await Promise.all([
        Feedback.list('-created_date', 100),
        ChatConversation.list('-created_date', 100)
      ]);
      const chatFeedbacks = feedbackData.filter(f => f.order_id?.startsWith('session_') || f.comment?.includes('Chat session'));
      setFeedbacks(chatFeedbacks);
      setConversations(conversationData);
    } catch (error) {
      console.error("Error loading data:", error);
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

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const hasMatchingMessage = c.messages?.some(m => m.content?.toLowerCase().includes(query));
    return (
      c.customer_email?.toLowerCase().includes(query) ||
      c.session_id?.toLowerCase().includes(query) ||
      hasMatchingMessage
    );
  });

  // ✨ פונקציה חדשה - סימון כנקרא/לא נקרא
  const toggleReadStatus = async (conversationId) => {
    try {
      const conversation = conversations.find(c => c.id === conversationId);
      const newReadStatus = !conversation.is_read;
      
      // עדכון בשרת
      await ChatConversation.update(conversationId, { is_read: newReadStatus });
      
      // עדכון ב-state
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, is_read: newReadStatus } : c
      ));
    } catch (error) {
      console.error("Error updating read status:", error);
      alert("שגיאה בעדכון סטטוס");
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    if (!confirm("למחוק את השיחה הזו?")) return;
    try {
      await ChatConversation.delete(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
    } catch (error) {
      console.error("Error deleting conversation:", error);
      alert("שגיאה במחיקה");
    }
  };

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
    const commentMatch = comment.match(/Comment:\s*(.+)/);
    if (commentMatch) {
      return commentMatch[1];
    }
    return null;
  };

  const handleDelete = async (feedbackId) => {
    if (!confirm("למחוק את המשוב הזו?")) return;
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

  // ✨ ספירת שיחות לא נקראות
  const unreadCount = conversations.filter(c => !c.is_read).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">לוג שיחות צ'אט</h1>
          <p className="text-stone-600">צפייה בשיחות ומשובים מהבוט</p>
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

      {/* View Toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={viewMode === 'conversations' ? 'default' : 'outline'}
          onClick={() => setViewMode('conversations')}
          className="flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          שיחות ({conversations.length})
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </Button>
        <Button
          variant={viewMode === 'feedbacks' ? 'default' : 'outline'}
          onClick={() => setViewMode('feedbacks')}
          className="flex items-center gap-2"
        >
          <ThumbsUp className="w-4 h-4" />
          משובים ({feedbacks.length})
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
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-stone-900">{conversations.length}</div>
            <p className="text-sm text-stone-500">סה"כ שיחות</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-rose-600">{unreadCount}</div>
            <p className="text-sm text-stone-500">לא נקראו</p>
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

      {/* Conversations List */}
      {viewMode === 'conversations' && (
        <Card>
          <CardHeader>
            <CardTitle>שיחות ({filteredConversations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-stone-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-stone-300" />
                <p>אין שיחות להצגה</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredConversations.map((conversation) => (
                  <div 
                    key={conversation.id} 
                    className={`p-4 border transition-colors ${
                      conversation.is_read 
                        ? 'border-stone-200 bg-white hover:bg-stone-50' 
                        : 'border-rose-300 bg-rose-50 hover:bg-rose-100'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-4">
                        {/* ✨ אינדיקטור נקרא/לא נקרא */}
                        {!conversation.is_read && (
                          <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-100 px-2 py-1 rounded">
                            <Circle className="w-3 h-3 fill-rose-600" />
                            חדש
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-sm text-stone-700 font-medium">
                          <MessageSquare className="w-4 h-4" />
                          {conversation.messages?.length || 0} הודעות
                        </span>
                        <span className="flex items-center gap-1 text-sm text-stone-500">
                          <Mail className="w-3 h-3" />
                          {conversation.customer_email || 'אנונימי'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-stone-400">
                          <Calendar className="w-3 h-3" />
                          {conversation.created_date ? format(new Date(conversation.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '—'}
                        </span>
                        {/* ✨ כפתור סימון כנקרא */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleReadStatus(conversation.id)}
                          className={`h-7 w-7 p-0 ${
                            conversation.is_read 
                              ? 'text-stone-400 hover:text-stone-600 hover:bg-stone-100' 
                              : 'text-rose-500 hover:text-rose-700 hover:bg-rose-100'
                          }`}
                          title={conversation.is_read ? 'סמן כלא נקרא' : 'סמן כנקרא'}
                        >
                          {conversation.is_read ? <Circle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedConversation(conversation)}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-7 w-7 p-0"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConversation(conversation.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Preview last message */}
                    {conversation.messages?.length > 0 && (
                      <div className={`mt-2 p-3 text-sm truncate ${
                        conversation.is_read ? 'bg-stone-50 text-stone-600' : 'bg-white text-stone-700'
                      }`}>
                        {conversation.messages[conversation.messages.length - 1]?.content?.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feedbacks List */}
      {viewMode === 'feedbacks' && (
        <Card>
          <CardHeader>
            <CardTitle>משובים ({filteredFeedbacks.length})</CardTitle>
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
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-stone-400">
                          <Calendar className="w-3 h-3" />
                          {feedback.created_date ? format(new Date(feedback.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '—'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(feedback.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
      )}

      {/* Conversation Detail Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={() => setSelectedConversation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              צפייה בשיחה
            </DialogTitle>
          </DialogHeader>
          
          {selectedConversation && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-stone-500 border-b pb-3">
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {selectedConversation.customer_email || 'אנונימי'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {selectedConversation.created_date ? format(new Date(selectedConversation.created_date), 'dd/MM/yyyy HH:mm', { locale: he }) : '—'}
                </span>
              </div>
              
              <div className="space-y-3">
                {selectedConversation.messages?.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'bot' && (
                      <div className="w-7 h-7 bg-rose-400 flex items-center justify-center text-white flex-shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[80%] p-3 text-sm ${
                      msg.role === 'user' 
                        ? 'bg-stone-800 text-white' 
                        : 'bg-stone-100 text-stone-800'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 bg-stone-700 flex items-center justify-center text-white flex-shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}