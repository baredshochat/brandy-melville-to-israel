import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function TiersGrid({ tiers = [], userTier }) {
  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-stone-800 text-center">שלבי המועדון</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiers.map((t) => {
          const Icon = t.icon;
          const isCurrent = userTier?.name === t.name;
          return (
            <Card key={t.name} className={`text-center p-6 shadow-lg transition-all duration-300 ${isCurrent ? 'border-4 border-rose-400 scale-105' : 'border border-stone-200'} ${isCurrent ? `bg-gradient-to-br ${t.grad}` : 'bg-white'}`}>
              <CardContent className="space-y-2">
                {Icon && <Icon className={`w-10 h-10 mx-auto ${isCurrent ? 'text-stone-800' : 'text-stone-500'}`} />}
                <h4 className="text-xl font-bold text-stone-800">{t.name}</h4>
                <p className="text-sm text-stone-700">{t.earn} צבירה</p>
                <p className="text-sm text-stone-700">{t.birthdayGift} נקודות יום הולדת</p>
                {t.name === 'Gold' && <p className="text-sm font-bold text-amber-600">VIP ✨</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}