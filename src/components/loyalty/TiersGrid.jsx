import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function TiersGrid({ tiers = [], userTier }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-stone-800 text-center">שלבי המועדון</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiers.map((t) => {
          const Icon = t.icon;
          const isCurrent = userTier?.name === t.name;
          return (
            <Card key={t.name} className={`text-center p-4 shadow-sm transition-colors ${isCurrent ? 'border border-rose-300' : 'border border-stone-200'} bg-white`}>
              <CardContent className="space-y-1.5">
                {Icon && <Icon className={`w-6 h-6 mx-auto ${isCurrent ? 'text-stone-800' : 'text-stone-500'}`} />}
                <h4 className="text-base font-semibold text-stone-800">{t.name}</h4>
                <p className="text-xs text-stone-700">{t.earn} צבירה</p>
                <p className="text-xs text-stone-700">{t.birthdayGift} נקודות יום הולדת</p>
                {t.name === 'Gold' && <p className="text-xs font-semibold text-amber-600">VIP ✨</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}