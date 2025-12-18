import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PointsSummary({ points = 0, expiringDateString = null }) {
  const p = Number(points || 0);
  return (
    <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-stone-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-stone-800"><Star className="w-5 h-5 text-rose-500" /> הנקודות שלך</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-center">
        <div className="text-5xl font-extrabold text-rose-600">{p}</div>
        <p className="text-md text-stone-700">כל נקודה שווה 1 ₪ בקנייה הבאה</p>
        {expiringDateString && (
          <p className="text-sm text-orange-600 flex items-center justify-center gap-1">
            <Calendar className="w-4 h-4" /> יש לך נקודות שעומדות לפוג בתאריך {expiringDateString}
          </p>
        )}
        {p > 0 && (
          <div className="pt-2">
            <Link to={createPageUrl('Home')}>
              <Button className="bg-stone-900 hover:bg-stone-800 h-10 px-4 flex items-center gap-2">
                נצלי {p} ₪ עכשיו <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}