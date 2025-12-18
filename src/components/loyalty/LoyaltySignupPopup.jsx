import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Star, Calendar, Loader2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { User } from '@/entities/User';
import { LoyaltySettings } from '@/entities/LoyaltySettings';
import { joinClub } from '@/functions/joinClub';

export default function LoyaltySignupPopup() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ birthday: '', phone: '', marketing_opt_in: false });
  const [joining, setJoining] = useState(false);
  const [popupSettings, setPopupSettings] = useState({});
  const signupBonus = Number(popupSettings?.signup_bonus || 30);
  const title = popupSettings?.popup_title || 'הצטרפי למועדון! ✨';
  const subtitle = popupSettings?.popup_subtitle || 'צברי נקודות וקבלי הטבות מיוחדות';
  const benefit1 = popupSettings?.popup_benefit_1 || '10% נקודות על כל הזמנה';
  const benefit2 = popupSettings?.popup_benefit_2 || '{benefit2}';
  const benefit3 = popupSettings?.popup_benefit_3 || `${signupBonus} נקודות בונוס בהצטרפות!`;
  const ctaText = popupSettings?.popup_cta_text || `הצטרפי וקבלי ${signupBonus} נקודות 🎁`;
  const marketingLabel = popupSettings?.popup_marketing_label || '{marketingLabel}';
  const imageUrl = popupSettings?.popup_image_url || '';

  useEffect(() => {
    checkAndShowPopup();
  }, []);

  const checkAndShowPopup = async () => {
    // Check if user dismissed the popup before
    const dismissed = localStorage.getItem('loyalty_popup_dismissed');
    if (dismissed) return;

    try {
      const userData = await User.me();
      setUser(userData);

      // Load popup settings
      let dict = {};
      try {
        const list = await LoyaltySettings.list();
        (list || []).forEach((s) => { dict[s.setting_key] = s.value; });
      } catch (_) {}
      setPopupSettings(dict);

      const enabled = (dict.popup_enabled ?? 'true') !== 'false';
      const delayMs = parseInt(dict.popup_delay_ms || '1500', 10);

      // Show popup only if user is logged in, not a club member, and popup enabled
      if (enabled && userData && !userData.club_member) {
        setTimeout(() => setOpen(true), isNaN(delayMs) ? 1500 : delayMs);
      }
    } catch (e) {
      // User not logged in, don't show popup
    }
  };

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem('loyalty_popup_dismissed', 'true');
  };

  const handleJoin = async () => {
    if (!formData.birthday) {
      alert('אנא הזיני תאריך יום הולדת');
      return;
    }

    setJoining(true);
    try {
      const { data } = await joinClub(formData);
      if (data.success) {
        alert(`🎉 הצטרפת בהצלחה למועדון!\nקיבלת ${data.bonus_points} נקודות בונוס!`);
        setOpen(false);
        localStorage.setItem('loyalty_popup_dismissed', 'true');
        window.location.reload();
      } else {
        alert(data.message || 'שגיאה בהצטרפות למועדון');
      }
    } catch (error) {
      console.error('Error joining club:', error);
      alert('שגיאה בהצטרפות למועדון');
    } finally {
      setJoining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors"
          >
            <X className="w-4 h-4 text-stone-600" />
          </button>

          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-rose-100 via-pink-50 to-stone-50 p-8 text-center">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-4 shadow-sm" />
            ) : (
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Gift className="w-8 h-8 text-rose-500" />
              </div>
            )}
            <h2 className="text-2xl font-semibold text-stone-900 mb-2">
              {title}
            </h2>
            <p className="text-sm text-stone-600">
              {subtitle}
            </p>
          </div>

          {/* Benefits */}
          <div className="px-8 py-6 space-y-3 bg-white">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900">{benefit1}</p>
                {popupSettings?.popup_benefit_1 ? null : (
                  <p className="text-xs text-stone-500">כל נקודה = 1 ₪ הנחה</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900">{benefit2}</p>
                {popupSettings?.popup_benefit_2 ? null : (
                  <p className="text-xs text-stone-500">20% הנחה ביום ההולדת שלך</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900">30 נקודות בונוס עכשיו!</p>
                {popupSettings?.popup_benefit_3 ? null : (
                  <p className="text-xs text-stone-500">מתנה בהצטרפות</p>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 pb-8 space-y-4 bg-white">
            <div>
              <Label htmlFor="birthday" className="text-xs text-stone-600">
                תאריך יום הולדת *
              </Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                className="mt-1 h-10"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-xs text-stone-600">
                מספר טלפון (אופציונלי)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="05X-XXXXXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 h-10"
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <Checkbox
                id="marketing"
                checked={formData.marketing_opt_in}
                onCheckedChange={(checked) => setFormData({ ...formData, marketing_opt_in: checked })}
              />
              <Label htmlFor="marketing" className="text-xs text-stone-600 leading-relaxed cursor-pointer">
                אני מעוניינת לקבל עדכונים, הטבות והנחות בלעדיות למייל
              </Label>
            </div>

            <Button
              onClick={handleJoin}
              disabled={!formData.birthday || joining}
              className="w-full bg-stone-900 hover:bg-stone-800 h-11 text-sm font-medium"
            >
              {joining ? (
                <><Loader2 className="w-4 h-4 animate-spin ml-2" /> מצטרפת...</>
              ) : (
                ctaText
              )}
            </Button>

            <button
              onClick={handleClose}
              className="w-full text-xs text-stone-500 hover:text-stone-700 transition-colors"
            >
              אולי מאוחר יותר
            </button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}