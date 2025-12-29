import React, { useState, useEffect } from 'react';
import { GiftCard } from '@/entities/GiftCard';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Loader2, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import GiftCardForm from './GiftCardForm';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function ManageGiftCards() {
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);

  useEffect(() => {
    loadGiftCards();
  }, []);

  const loadGiftCards = async () => {
    try {
      setLoading(true);
      const data = await GiftCard.list('-created_date');
      setGiftCards(data || []);
    } catch (error) {
      console.error('Error loading gift cards:', error);
      toast.error('שגיאה בטעינת הגיפטקארדים');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async (formData) => {
    try {
      if (editingCard) {
        await GiftCard.update(editingCard.id, formData);
        toast.success('הגיפטקארד עודכן בהצלחה');
      } else {
        await GiftCard.create(formData);
        toast.success('הגיפטקארד נוצר בהצלחה');
      }
      setShowForm(false);
      setEditingCard(null);
      loadGiftCards();
    } catch (error) {
      console.error('Error saving gift card:', error);
      toast.error('שגיאה בשמירת הגיפטקארד');
    }
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    try {
      await GiftCard.delete(cardToDelete.id);
      toast.success('הגיפטקארד נמחק בהצלחה');
      setDeleteDialogOpen(false);
      setCardToDelete(null);
      loadGiftCards();
    } catch (error) {
      console.error('Error deleting gift card:', error);
      toast.error('שגיאה במחיקת הגיפטקארד');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('הקוד הועתק ללוח');
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      redeemed: 'bg-stone-100 text-stone-600',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-orange-100 text-orange-800'
    };
    const labels = {
      active: 'פעיל',
      redeemed: 'נוצל',
      expired: 'פג תוקף',
      cancelled: 'בוטל'
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${styles[status] || ''}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingCard(null); setShowForm(true); }} className="bg-rose-500 hover:bg-rose-600">
          <Plus className="w-4 h-4 ml-2" />
          צור גיפטקארד חדש
        </Button>
      </div>

      {giftCards.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-stone-500 mb-4">אין עדיין גיפטקארדים</p>
          <Button onClick={() => setShowForm(true)} variant="outline">
            צור גיפטקארד ראשון
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>קוד</TableHead>
                <TableHead>נמען</TableHead>
                <TableHead className="text-left">ערך התחלתי</TableHead>
                <TableHead className="text-left">יתרה</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>תוקף</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {giftCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{card.code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(card.code)}
                        className="h-6 px-2"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {card.recipient_name && <div className="font-medium">{card.recipient_name}</div>}
                      {card.recipient_email && <div className="text-stone-500">{card.recipient_email}</div>}
                      {!card.recipient_name && !card.recipient_email && <span className="text-stone-400">לא צוין</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-left font-medium">₪{card.initial_value?.toFixed(2)}</TableCell>
                  <TableCell className="text-left">
                    <span className={`font-semibold ${card.current_balance > 0 ? 'text-green-600' : 'text-stone-400'}`}>
                      ₪{card.current_balance?.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(card.status)}</TableCell>
                  <TableCell className="text-sm text-stone-600">
                    {card.valid_until ? format(new Date(card.valid_until), 'dd/MM/yyyy') : 'ללא תפוגה'}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingCard(card); setShowForm(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setCardToDelete(card); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'עריכת גיפטקארד' : 'יצירת גיפטקארד חדש'}</DialogTitle>
          </DialogHeader>
          <GiftCardForm
            card={editingCard}
            onSave={handleSaveCard}
            onCancel={() => { setShowForm(false); setEditingCard(null); }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת גיפטקארד</AlertDialogTitle>
            <AlertDialogDescription>
              האם את בטוחה שברצונך למחוק את הגיפטקארד "{cardToDelete?.code}"? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard} className="bg-red-500 hover:bg-red-600">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}