import React, { useState, useEffect } from "react";
import { BackInStockNotification } from "@/entities/BackInStockNotification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Mail, CheckCircle, Clock, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function BackInStockNotificationsTab() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState({});

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await BackInStockNotification.list('-created_date');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('למחוק התראה זו?')) return;
    
    setDeleting(prev => ({ ...prev, [id]: true }));
    try {
      await BackInStockNotification.delete(id);
      await loadNotifications();
    } catch (error) {
      console.error("Error deleting notification:", error);
      alert("שגיאה במחיקת ההתראה");
    } finally {
      setDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleMarkAsNotified = async (notification) => {
    try {
      await BackInStockNotification.update(notification.id, {
        notified: true,
        notified_date: new Date().toISOString()
      });
      await loadNotifications();
    } catch (error) {
      console.error("Error updating notification:", error);
      alert("שגיאה בעדכון ההתראה");
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      n.product_name?.toLowerCase().includes(query) ||
      n.customer_email?.toLowerCase().includes(query) ||
      n.customer_name?.toLowerCase().includes(query)
    );
  });

  const pendingCount = notifications.filter(n => !n.notified).length;
  const notifiedCount = notifications.filter(n => n.notified).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-light text-stone-800 mb-2">התראות חזרה למלאי</h2>
        <p className="text-stone-600">ניהול בקשות ללקוחות שרוצים להתעדכן כשפריטים חוזרים</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">סה"כ בקשות</p>
                <p className="text-2xl font-bold text-stone-800">{notifications.length}</p>
              </div>
              <Mail className="w-8 h-8 text-stone-300" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">ממתינות</p>
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-300" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">נשלחו</p>
                <p className="text-2xl font-bold text-green-600">{notifiedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 w-5 h-5 text-stone-400" />
            <Input
              placeholder="חיפוש לפי שם פריט, אימייל או שם לקוח..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת בקשות ({filteredNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <p className="text-center text-stone-500 py-8">אין בקשות התאמות</p>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 border border-stone-200 hover:border-stone-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-stone-800">
                          {notification.product_name || 'פריט לא ידוע'}
                        </h3>
                        {notification.notified ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <CheckCircle className="w-3 h-3 ml-1" />
                            נשלח
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                            <Clock className="w-3 h-3 ml-1" />
                            ממתין
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-stone-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-stone-400" />
                          <span>{notification.customer_email}</span>
                        </div>
                        {notification.customer_name && (
                          <div className="flex items-center gap-2">
                            <span className="text-stone-400">שם:</span>
                            <span>{notification.customer_name}</span>
                          </div>
                        )}
                        <div className="text-xs text-stone-400">
                          נוצר: {format(new Date(notification.created_date), "d בMMM yyyy, HH:mm", { locale: he })}
                        </div>
                        {notification.notified && notification.notified_date && (
                          <div className="text-xs text-green-600">
                            נשלח: {format(new Date(notification.notified_date), "d בMMM yyyy, HH:mm", { locale: he })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!notification.notified && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsNotified(notification)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 ml-1" />
                          סמן כנשלח
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleting[notification.id]}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        {deleting[notification.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}