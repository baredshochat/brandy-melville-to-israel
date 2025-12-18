import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StickyCTA({ points = 0 }) {
  const p = Number(points || 0);
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-stone-200 p-3 flex items-center justify-between gap-3">
      <div className="text-sm text-stone-700">
        {p > 0 ? `יש לך ₪${p} לניצול` : 'הטבות מחכות לך'}
      </div>
      <Link to={createPageUrl('Home')}>
        <Button className="bg-stone-900 hover:bg-stone-800 h-10 px-4 gap-2">
          <ShoppingBag className="w-4 h-4" /> קני עכשיו
        </Button>
      </Link>
    </div>
  );
}