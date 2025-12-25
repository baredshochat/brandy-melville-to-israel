import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BackInStockNotification } from '@/entities/BackInStockNotification';
import { Loader2, Mail, User } from 'lucide-react';

export default function WaitingListDialog({ open, onOpenChange, itemId, itemName }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      loadNotifications();
    }
  }, [open, itemId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await BackInStockNotification.filter({
        local_stock_item_id: itemId,
        notified: false
      });
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>רשימת ממתינות - {itemName}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <p>אין ממתינות כרגע</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif, index) => (
                <div
                  key={notif.id}
                  className="flex items-center justify-between p-4 bg-stone-50 rounded-lg border border-stone-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 font-medium">
                      {index + 1}
                    </div>
                    <div>
                      {notif.customer_name && (
                        <div className="flex items-center gap-2 font-medium text-stone-900">
                          <User className="w-4 h-4 text-stone-400" />
                          {notif.customer_name}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-stone-600">
                        <Mail className="w-4 h-4 text-stone-400" />
                        {notif.customer_email}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-stone-400">
                    {new Date(notif.created_date).toLocaleDateString('he-IL')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}