import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift } from 'lucide-react';

export default function BirthdayGiftCard({ amount = null, expiresText = null, tiers = [], currentTierName = '' }) {
  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-stone-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-stone-800"><Gift className="w-5 h-5 text-purple-500" /> מתנת יום הולדת</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-center">
        {amount ? (
          <div>
            <p className="text-3xl font-bold text-rose-600 mb-1">מחכות לך {amount} נקודות מתנה</p>
            {expiresText && <p className="text-md text-stone-700">בתוקף עד סוף חודש {expiresText}</p>}
          </div>
        ) : (
          <p className="text-md text-stone-700">בחודש יום ההולדת מחכה לך מתנה לפי הסטטוס שלך</p>
        )}
        {Array.isArray(tiers) && tiers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`p-3 rounded border ${t.name === currentTierName ? 'border-rose-300 bg-rose-50' : 'border-stone-200 bg-white/60'}`}
              >
                <p className="text-sm font-semibold text-stone-800">{t.name}</p>
                <p className="text-xs text-stone-600">מתנת יום הולדת: {t.birthdayGift} נקודות</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}