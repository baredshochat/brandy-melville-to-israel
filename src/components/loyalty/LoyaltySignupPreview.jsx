import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Gift, Star, Calendar } from 'lucide-react';

export default function LoyaltySignupPreview({ settings = {} }) {
  const title = settings.popup_title || 'הצטרפי למועדון! ✨';
  const subtitle = settings.popup_subtitle || 'קבלי נקודות והטבות מיוחדות';
  const benefit1 = settings.popup_benefit_1 || '10% נקודות על כל הזמנה';
  const benefit2 = settings.popup_benefit_2 || 'הטבת יום הולדת מיוחדת';
  const benefit3 = settings.popup_benefit_3 || '30 נקודות בונוס בהצטרפות עכשיו!';
  const cta = settings.popup_cta_text || 'הצטרפי וקבלי 30 נקודות 🎁';
  const marketingLabel = settings.popup_marketing_text || 'אני מעוניינת לקבל עדכונים, הטבות והנחות למייל';

  return (
    <div className="max-w-md border rounded-lg overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-rose-100 via-pink-50 to-stone-50 p-8 text-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm overflow-hidden">
          {settings.popup_image_url ? (
            <img src={settings.popup_image_url} alt="icon" className="w-10 h-10 object-contain" />
          ) : (
            <Gift className="w-8 h-8 text-rose-500" />
          )}
        </div>
        <h2 className="text-2xl font-semibold text-stone-900 mb-2">{title}</h2>
        <p className="text-sm text-stone-600">{subtitle}</p>
      </div>

      {/* Benefits */}
      <div className="px-8 py-6 space-y-3 bg-white">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
            <Star className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-900">{benefit1}</p>
            <p className="text-xs text-stone-500">{settings.popup_benefit_1_sub || 'כל נקודה = 1 ₪ הנחה'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-900">{benefit2}</p>
            <p className="text-xs text-stone-500">{settings.popup_benefit_2_sub || '20% הנחה ביום ההולדת שלך'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
            <Gift className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-900">{benefit3}</p>
            <p className="text-xs text-stone-500">{settings.popup_benefit_3_sub || 'מתנה בהצטרפות'}</p>
          </div>
        </div>
      </div>

      {/* Form (disabled in preview) */}
      <div className="px-8 pb-8 space-y-4 bg-white">
        <div>
          <Label htmlFor="birthday" className="text-xs text-stone-600">תאריך יום הולדת *</Label>
          <Input id="birthday" type="date" disabled className="mt-1 h-10" />
        </div>
        <div>
          <Label htmlFor="phone" className="text-xs text-stone-600">מספר טלפון (אופציונלי)</Label>
          <Input id="phone" type="tel" placeholder="05X-XXXXXXX" disabled className="mt-1 h-10" />
        </div>
        <div className="flex items-start gap-2 pt-2">
          <Checkbox id="marketing" checked={true} disabled />
          <Label htmlFor="marketing" className="text-xs text-stone-600 leading-relaxed cursor-default">{marketingLabel}</Label>
        </div>
        <Button disabled className="w-full bg-stone-900 h-11 text-sm font-medium opacity-70 cursor-not-allowed">
          {cta}
        </Button>
        <button disabled className="w-full text-xs text-stone-400 cursor-not-allowed">אולי מאוחר יותר</button>
      </div>
    </div>
  );
}