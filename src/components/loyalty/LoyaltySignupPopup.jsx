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

  useEffect(() => {
    checkAndShowPopup();
  }, []);

  const checkAndShowPopup = async () => {
    // Check if user dismissed the popup before
    const dismissed = localStorage.getItem('loyalty_popup_dismissed');
    if (dismissed) return;

    try {
      const [userData, settingsData] = await Promise.all([
        User.me(),
        LoyaltySettings.list()
      ]);
      setUser(userData);

      const map = {};
      (settingsData || []).forEach(s => { map[s.setting_key] = s.value; });
      setPopupSettings(map);

      const enabled = (map.popup_enabled ?? 'true') !== 'false';
      if (userData && !userData.club_member && enabled) {
        const delay = parseInt(map.popup_delay_ms || '1500') || 1500;
        setTimeout(() => setOpen(true), delay);
      }
    } catch (e) {
      // ignore
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
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Gift className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-2xl font-semibold text-stone-900 mb-2">
              {popupSettings.popup_title || 'הצטרפי למועדון! ✨'}
            </h2>
            <p className="text-sm text-stone-600">
              {popupSettings.popup_subtitle || 'צברי נקודות וקבלי הטבות מיוחדות'}
            </p>
          </div>

          {/* Benefits */}
          <div className="px-8 py-6 space-y-3 bg-white">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Star className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900">{popupSettings.popup_benefit_1 || '10% נקודות על כל הזמנה'}</p>
                <p className="text-xs text-stone-500">כל נקודה = 1 ₪ הנחה</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900">הטבת יום הולדת מיוחדת</p>
                <p className="text-xs text-stone-500">20% הנחה ביום ההולדת שלך</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-rose-50 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-rose-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900">30 נקודות בונוס עכשיו!</p>
                <p className="text-xs text-stone-500">מתנה בהצטרפות</p>
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
                (popupSettings.popup_cta_text || 'הצטרפי וקבלי 30 נקודות 🎁')
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