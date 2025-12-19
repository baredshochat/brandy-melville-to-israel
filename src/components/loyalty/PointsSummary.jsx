import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PointsSummary({ points = 0, expiringDateString = null }) {
  const p = Number(points || 0);
  return (
    <Card className="bg-white shadow-sm border border-stone-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-stone-800 text-sm font-medium"><Star className="w-4 h-4 text-rose-500" /> הנקודות שלך</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-center">
        <div className="text-4xl font-extrabold text-rose-600">{p}</div>
        <p className="text-sm text-stone-700">כל נקודה מקרבת אותך עוד</p>
        {expiringDateString &&
        <p className="text-xs text-orange-600 flex items-center justify-center gap-1">
            <Calendar className="w-4 h-4" /> יש לך נקודות שעומדות לפוג בתאריך {expiringDateString}
          </p>
        }
        {p > 0 &&
        <div className="pt-2">
            <Link to={createPageUrl('Home')}>
              <Button className="bg-stone-900 hover:bg-stone-800 h-9 px-3 text-sm flex items-center gap-2">
                נצלי {p} ₪ עכשיו <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        }
      </CardContent>
    </Card>);

}