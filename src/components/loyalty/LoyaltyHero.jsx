import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Truck, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LoyaltyHero({ user, points = 0 }) {
  const firstName = user?.first_name || user?.full_name?.split(' ')[0] || 'יקרה';
  return (
    <div className="text-center space-y-3">
      <h1 className="text-3xl font-semibold text-stone-800">מועדון הלקוחות שלנו <span className="text-rose-400">💖</span></h1>
      <p className="text-sm text-stone-600">קונות, צוברות נקודות, ומקבלות יותר – פשוט כי אתן כאן.</p>
      <p className="text-base font-medium text-rose-500 flex items-center justify-center gap-2">
        היי {firstName}! את כבר חברה במועדון
      </p>
      {Number(points) > 0 && (
        <p className="text-base text-stone-700">יש לך כרגע ₪{Number(points)} לניצול ברכישה הבאה</p>
      )}
      <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
        <Link to={createPageUrl('Home')}>
          <Button className="bg-stone-900 hover:bg-stone-800 h-9 px-4 text-sm flex items-center gap-2">
            <ShoppingBag className="w-3 h-3" /> התחילי הזמנה חדשה
          </Button>
        </Link>
        <Link to={createPageUrl('LocalStock')}>
          <Button variant="outline" className="h-9 px-4 text-sm flex items-center gap-2">
            <Truck className="w-3 h-3" /> מלאי מקומי – אספקה מהירה
          </Button>
        </Link>
        <Link to={createPageUrl('Chat')}>
          <Button variant="ghost" className="h-11 px-6 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> צריך עזרה?
          </Button>
        </Link>
      </div>
    </div>
  );
}