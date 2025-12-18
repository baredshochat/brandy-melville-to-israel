import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function NewsletterList({ users = [] }) {
  const [q, setQ] = useState('');
  const subs = useMemo(() => users.filter(u => !!u.marketing_opt_in && !!u.club_member), [users]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return subs;
    return subs.filter(u => (u.full_name || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s));
  }, [q, subs]);

  const copyEmails = () => {
    const str = filtered.map(u => u.email).join(', ');
    navigator.clipboard.writeText(str);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="חיפוש לפי שם/אימייל" value={q} onChange={e => setQ(e.target.value)} className="max-w-xs" />
        <Button variant="outline" onClick={copyEmails}>העתק אימיילים</Button>
      </div>
      <div className="grid gap-2">
        {filtered.map(u => (
          <div key={u.id} className="p-3 border bg-white flex items-center justify-between">
            <div>
              <div className="font-medium">{u.full_name || '-'}</div>
              <div className="text-sm ltr">{u.email}</div>
            </div>
            <div className="text-xs text-stone-500">מצטרפת לניוזלטר</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-stone-600">אין מנויים תואמים.</div>
        )}
      </div>
    </div>
  );
}