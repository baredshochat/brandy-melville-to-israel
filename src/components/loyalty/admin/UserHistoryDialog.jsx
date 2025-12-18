import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function UserHistoryDialog({ open, onOpenChange, user, ledger = [] }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>היסטוריית נקודות — {user?.full_name || user?.email}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-80 pr-2">
          <div className="space-y-3">
            {ledger.length === 0 && <p className="text-sm text-stone-600">אין תנועות להצגה.</p>}
            {ledger.map((e) => (
              <div key={e.id} className="p-3 border bg-white">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium">{e.type}</span> • {e.description || e.source}
                  </div>
                  <div className={`font-semibold ${e.type.includes('deduct') || e.type === 'use' ? 'text-red-600' : 'text-green-600'}`}>
                    {e.type.includes('deduct') || e.type === 'use' ? '-' : '+'}{Number(e.amount)} נק׳
                  </div>
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  יתרה לאחר הפעולה: {Number(e.balance_after || 0)} • בתאריך: {new Date(e.created_date).toLocaleString('he-IL')}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}