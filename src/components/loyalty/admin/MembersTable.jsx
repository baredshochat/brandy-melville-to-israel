import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, Plus, Minus } from 'lucide-react';

function getTier(points) {
  const p = Number(points || 0);
  if (p >= 1500) return { name: 'Gold', color: 'bg-amber-100 text-amber-800' };
  if (p >= 500) return { name: 'Silver', color: 'bg-slate-100 text-slate-800' };
  return { name: 'Member', color: 'bg-rose-100 text-rose-800' };
}

export default function MembersTable({ users = [], onAdjust, onOpenHistory }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(u =>
      (u.full_name || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s)
    );
  }, [q, users]);

  const startAdjust = (u, sign) => {
    setSelected({ ...u, sign });
    setDelta('');
    setReason('');
  };

  const confirmAdjust = () => {
    const n = Number(delta);
    if (!selected || !Number.isFinite(n) || n <= 0) return;
    const signed = selected.sign === 'minus' ? -n : n;
    onAdjust(selected, signed, reason);
    setSelected(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="חיפוש לפי שם או אימייל" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
      </div>

      <div className="border rounded-md bg-white overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>אימייל</TableHead>
              <TableHead className="text-center">נקודות</TableHead>
              <TableHead className="text-center">סטטוס</TableHead>
              <TableHead className="text-center">חברה במועדון</TableHead>
              <TableHead className="text-center">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => {
              const tier = getTier(u.points_balance);
              return (
                <TableRow key={u.id}>
                  <TableCell>{u.full_name || '-'}</TableCell>
                  <TableCell className="ltr">{u.email}</TableCell>
                  <TableCell className="text-center font-semibold">{Number(u.points_balance || 0)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={tier.color}>{tier.name}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{u.club_member ? 'כן' : 'לא'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => startAdjust(u, 'plus')} className="h-8 px-2"><Plus className="w-3 h-3" /> הוסף</Button>
                      <Button size="sm" variant="outline" onClick={() => startAdjust(u, 'minus')} className="h-8 px-2"><Minus className="w-3 h-3" /> הפחת</Button>
                      <Button size="sm" variant="ghost" onClick={() => onOpenHistory(u)} className="h-8 px-2"><Eye className="w-4 h-4" /> היסטוריה</Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עדכון נקודות ל{selected?.full_name || selected?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">כמות נקודות</label>
                <Input type="number" value={delta} onChange={e => setDelta(e.target.value)} placeholder="לדוגמה: 50" />
              </div>
              <div>
                <label className="text-sm">סיבה (אופציונלי)</label>
                <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="לדוגמה: פיצוי/בונוס" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelected(null)}>בטל</Button>
              <Button onClick={confirmAdjust}>{selected?.sign === 'minus' ? 'הפחת' : 'הוסף'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}