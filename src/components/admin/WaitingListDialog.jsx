import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BackInStockNotification } from '@/entities/BackInStockNotification';
import { Loader2, Mail, User, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function WaitingListDialog({ open, onOpenChange, itemId, itemName }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

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

  const handleAddNotification = async () => {
    if (!newEmail || !itemId) return;
    
    setAdding(true);
    try {
      await BackInStockNotification.create({
        local_stock_item_id: itemId,
        product_name: itemName,
        customer_email: newEmail,
        customer_name: newName,
        notified: false
      });
      
      setNewEmail('');
      setNewName('');
      setAddDialogOpen(false);
      loadNotifications();
    } catch (error) {
      console.error('Error adding notification:', error);
      alert('שגיאה בהוספת הממתינה');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!confirm('למחוק את הממתינה מהרשימה?')) return;
    
    try {
      await BackInStockNotification.delete(notificationId);
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('שגיאה במחיקת הממתינה');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>רשימת ממתינות - {itemName}</DialogTitle>
            <Button
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="bg-rose-500 hover:bg-rose-600"
            >
              <Plus className="w-4 h-4 ml-2" />
              הוסף ממתינה
            </Button>
          </div>
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
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-stone-400">
                      {new Date(notif.created_date).toLocaleDateString('he-IL')}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteNotification(notif.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Add Notification Dialog */}
    <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>הוסף ממתינה לרשימה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>שם (אופציונלי)</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="השם של הלקוחה"
            />
          </div>
          <div className="space-y-2">
            <Label>אימייל *</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
            ביטול
          </Button>
          <Button
            onClick={handleAddNotification}
            disabled={!newEmail || adding}
            className="bg-rose-500 hover:bg-rose-600"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            הוסף
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}