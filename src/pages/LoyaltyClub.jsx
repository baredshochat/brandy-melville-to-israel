import React, { useEffect, useMemo, useState } from 'react';
import { User } from '@/entities/User';
import { PointsLedger } from '@/entities/PointsLedger';
import { joinClub } from '@/functions/joinClub';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Loader2, Gift, Star, Calendar, Award, TrendingUp, Crown, CheckCircle, Mail, ShoppingBag, Truck, ShieldCheck, MessageSquare, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, isFuture, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import LoyaltyHero from '@/components/loyalty/LoyaltyHero';
import ValueProps from '@/components/loyalty/ValueProps';
import PointsSummary from '@/components/loyalty/PointsSummary';
import BirthdayGiftCard from '@/components/loyalty/BirthdayGiftCard';
import TiersGrid from '@/components/loyalty/TiersGrid';
import StickyCTA from '@/components/loyalty/StickyCTA';

export default function LoyaltyClub() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentLedger, setRecentLedger] = useState([]);
  const [joinForm, setJoinForm] = useState({ birthday: '', phone: '', marketing_opt_in: false });
  const [joining, setJoining] = useState(false);
  const [updatingMarketing, setUpdatingMarketing] = useState(false);

  // Tiers definition (read-only display)
  const TIERS = useMemo(() => ([
    { name: 'Member', earn: '5%', birthdayGift: 50, minPoints: 0, desc: 'כל התחלה שווה נקודות', icon: Star, grad: 'from-rose-50 to-rose-100' },
    { name: 'Silver', earn: '7%', birthdayGift: 75, minPoints: 500, desc: 'כאן זה כבר מתחיל להיות משתלם', icon: Award, grad: 'from-slate-200 to-slate-300' },
    { name: 'Gold', earn: '10%', birthdayGift: 100, minPoints: 1500, desc: 'זה הסטטוס הגבוה במועדון – ואת שם ✨', icon: Crown, grad: 'from-amber-200 to-amber-300' },
  ]), []);

  // Load user + recent ledger
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const u = await User.me();
        setUser(u);
        if (u && u.club_member) {
          const ledger = await PointsLedger.filter({ user_email: u.email }, '-created_date', 10);
          setRecentLedger(Array.isArray(ledger) ? ledger : []);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Compute tier by points (display only)
  const userTier = useMemo(() => {
    if (!user?.club_member) return TIERS[0];
    const pts = Number(user?.points_balance || 0);
    const best = [...TIERS].reverse().find(t => pts >= t.minPoints) || TIERS[0];
    return best;
  }, [user, TIERS]);

  const nextTier = useMemo(() => {
    const idx = TIERS.findIndex(t => t.name === userTier.name);
    return idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  }, [userTier, TIERS]);

  const tierProgress = useMemo(() => {
    if (!nextTier) return 100;
    const pts = Number(user?.points_balance || 0);
    const span = nextTier.minPoints - userTier.minPoints;
    if (span <= 0) return 100;
    const val = Math.max(0, Math.min(100, Math.round(((pts - userTier.minPoints) / span) * 100)));
    return val;
  }, [user, userTier, nextTier]);

  // Expiring points (looks for any entry with future expires_at)
  const expiringEntry = useMemo(() => {
    return recentLedger.find(e => !!e.expires_at && isFuture(parseISO(e.expires_at)));
  }, [recentLedger]);

  const expiringDateStr = useMemo(
    () => (expiringEntry ? format(parseISO(expiringEntry.expires_at), 'dd/MM/yyyy', { locale: he }) : null),
    [expiringEntry]
  );

  // Active birthday bonus if exists
  const birthdayBonusActive = useMemo(() => {
    const entry = recentLedger.find(e => e.type === 'birthday_bonus' && !!e.expires_at && isFuture(parseISO(e.expires_at)));
    if (entry) return { amount: entry.amount, expires: parseISO(entry.expires_at) };
    return null;
  }, [recentLedger]);

  const isBirthdayMonth = useMemo(() => {
    if (!user?.birthday) return false;
    const b = new Date(user.birthday);
    const now = new Date();
    return b.getMonth() === now.getMonth();
  }, [user]);

  const handleJoin = async () => {
    if (!joinForm.birthday) {
      alert('אנא הזיני תאריך יום הולדת');
      return;
    }
    setJoining(true);
    try {
      const { data } = await joinClub(joinForm);
      if (data?.success) {
        alert(`${data.message || 'הצטרפת בהצלחה!'}\nקיבלת 20 נקודות בונוס 🎉`);
        // Refresh
        const u = await User.me();
        setUser(u);
        if (u) {
          const ledger = await PointsLedger.filter({ user_email: u.email }, '-created_date', 10);
          setRecentLedger(Array.isArray(ledger) ? ledger : []);
        }
      } else {
        alert(data?.message || 'שגיאה בהצטרפות למועדון');
      }
    } catch (e) {
      alert('שגיאה בהצטרפות למועדון');
    } finally {
      setJoining(false);
    }
  };

  const toggleNewsletter = async (checked) => {
    if (!user) return;
    setUpdatingMarketing(true);
    try {
      const payload = {
        marketing_opt_in: checked,
        marketing_source: 'loyalty_page',
        marketing_opt_in_at: checked ? new Date().toISOString() : null,
        unsubscribed_at: checked ? null : new Date().toISOString(),
      };
      await base44.auth.updateMe(payload);
      setUser(prev => ({ ...prev, ...payload }));
    } catch (e) {
      alert('שגיאה בעדכון העדפות דיוור');
    } finally {
      setUpdatingMarketing(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-rose-400" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-4xl font-semibold text-stone-800 mb-3">מועדון הלקוחות שלנו 💜</h1>
        <p className="text-stone-600 mb-6">אנא התחברי כדי לראות את הסטטוס וההטבות שלך</p>
        <Button onClick={() => base44.auth.redirectToLogin(createPageUrl('LoyaltyClub'))} className="bg-stone-900 hover:bg-stone-800 h-11 px-8">
          התחברי
        </Button>
      </div>
    );
  }

  // Non-member view (read-only info + CTA to join)
  if (!user.club_member) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-extrabold text-stone-800">מועדון הלקוחות שלנו <span className="text-rose-400">💖</span></h1>
          <p className="text-lg text-stone-600">קונות, צוברות נקודות, ומקבלות יותר – פשוט כי אתן כאן.</p>
        </div>

        {/* Shop banner */}
        <div className="relative overflow-hidden rounded border border-stone-200">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b7a7981b1_IMG_9486.jpg" alt="תמונה מהחנות" className="w-full h-44 sm:h-56 object-cover" />
        </div>

        {/* Benefits snapshot */}
        <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-white">
          <CardContent className="p-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="font-medium">צבירת נקודות</p>
                  <p className="text-sm text-stone-600">כל נקודה = 1 ₪ בקנייה הבאה</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="font-medium">🎂 מתנת יום הולדת</p>
                  <p className="text-sm text-stone-600">לפי הסטטוס שלך ובתוקף לחודש יום ההולדת</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <p className="font-medium">20 נקודות בונוס</p>
                  <p className="text-sm text-stone-600">בהצטרפות + ניוזלטר (בתוקף 7 ימים)</p>
                </div>
              </div>
            </div>

            {/* Join form (no redemption here) */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div>
                <Label htmlFor="birthday">תאריך יום הולדת *</Label>
                <Input id="birthday" type="date" value={joinForm.birthday} onChange={(e) => setJoinForm({ ...joinForm, birthday: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="phone">מספר טלפון (אופציונלי)</Label>
                <Input id="phone" type="tel" placeholder="05X-XXXXXXX" value={joinForm.phone} onChange={(e) => setJoinForm({ ...joinForm, phone: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="marketing" checked={joinForm.marketing_opt_in} onCheckedChange={(c) => setJoinForm({ ...joinForm, marketing_opt_in: !!c })} />
              <Label htmlFor="marketing" className="text-sm text-stone-600 cursor-pointer">אני רוצה להצטרף לניוזלטר (ניתן להסרה בכל רגע)</Label>
            </div>

            <div className="pt-2">
              <Button onClick={handleJoin} disabled={!joinForm.birthday || joining} className="w-full bg-rose-500 hover:bg-rose-600 h-12 text-lg">
                {joining ? (<><Loader2 className="w-4 h-4 animate-spin ml-2" /> מצטרפת...</>) : (<>הצטרפי למועדון וקבלי 20 נקודות מתנה</>)}
              </Button>
            </div>
          </CardContent>
        </Card>

      {/* Shop CTAs */}
      <div className="text-center space-y-3">
        <p className="text-stone-700">מוכנה? בואי נתחיל לקנות ✨</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to={createPageUrl('Home')}>
            <Button className="bg-stone-900 hover:bg-stone-800 h-11 px-6 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> התחילי הזמנה חדשה
            </Button>
          </Link>
          <Link to={createPageUrl('LocalStock')}>
            <Button variant="outline" className="h-11 px-6 flex items-center gap-2">
              <Truck className="w-4 h-4" /> מלאי מקומי – אספקה מהירה
            </Button>
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="bg-white/80 border border-stone-200 p-4 text-center">
          <div className="text-sm font-medium text-stone-800 mb-1">1. בחרי אתר וקישור</div>
          <div className="text-xs text-stone-600">הדביקי קישור למוצר של Brandy</div>
        </div>
        <div className="bg-white/80 border border-stone-200 p-4 text-center">
          <div className="text-sm font-medium text-stone-800 mb-1">2. אנחנו מחשבות מחיר שקוף</div>
          <div className="text-xs text-stone-600">ללא הפתעות בסיום</div>
        </div>
        <div className="bg-white/80 border border-stone-200 p-4 text-center">
          <div className="text-sm font-medium text-stone-800 mb-1">3. תשלום ומשלוח</div>
          <div className="text-xs text-stone-600">עד הבית במהירות</div>
        </div>
      </div>
      </motion.div>
    );
  }

  // Member view (read-only info)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto p-6 space-y-8">
      {/* 1. Hero */}
      <LoyaltyHero user={user} points={Number(user.points_balance || 0)} />

      {/* Shop banner */}
      <div className="relative overflow-hidden rounded border border-stone-200">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b7a7981b1_IMG_9486.jpg" alt="תמונה מהחנות" className="w-full h-48 sm:h-64 object-cover" />
      </div>

      {/* Value props */}
      <ValueProps />
      {/* Old grid removed */}
      <div className="hidden">
        <div className="flex items-center gap-3 bg-white/80 border border-stone-200 p-3">
          <Truck className="w-5 h-5 text-rose-500" />
          <div>
            <p className="text-sm font-medium text-stone-800">אספקה מהירה מהמלאי</p>
            <p className="text-xs text-stone-500">מוצרים מקומיים נשלחים תוך 3–7 ימי עסקים</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/80 border border-stone-200 p-3">
          <ShieldCheck className="w-5 h-5 text-rose-500" />
          <div>
            <p className="text-sm font-medium text-stone-800">מחיר סופי – ללא הפתעות</p>
            <p className="text-xs text-stone-500">מיסים ועמלות כבר כלולים בתמחור</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/80 border border-stone-200 p-3">
          <MessageSquare className="w-5 h-5 text-rose-500" />
          <div>
            <p className="text-sm font-medium text-stone-800">שירות לקוחות אנושי</p>
            <p className="text-xs text-stone-500">עוזרות בכל שלב בדרך</p>
          </div>
        </div>
      </div>

      {/* 2. Status */}
      <Card className={`text-center py-8 shadow-xl border-2 ${userTier.name === 'Gold' ? 'border-amber-400' : 'border-rose-200'} bg-gradient-to-r ${userTier.grad}`}>
        <CardContent className="space-y-4">
          {userTier.icon && <userTier.icon className="w-12 h-12 text-stone-800 mx-auto mb-2" />}
          <h2 className="text-3xl font-bold text-stone-800">הסטטוס שלך: <span className="text-rose-600">{userTier.name}</span></h2>
          <p className="text-md text-stone-700">{userTier.desc}</p>
          {nextTier && (
            <div className="mt-3">
              <p className="text-sm text-stone-600 mb-2">לסטטוס {nextTier.name}: עוד {Math.max(0, nextTier.minPoints - Number(user.points_balance || 0))} נקודות</p>
              <div className="max-w-sm mx-auto">
                <Progress value={tierProgress} className="h-2 bg-stone-200" indicatorColor="bg-rose-500" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Points */}
      <PointsSummary points={Number(user.points_balance || 0)} expiringDateString={expiringDateStr} />
      {/* Old card removed */}
      <div className="hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-stone-800"><Star className="w-5 h-5 text-rose-500" /> הנקודות שלך</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <div className="text-5xl font-extrabold text-rose-600">{user.points_balance || 0}</div>
          <p className="text-md text-stone-700">כל נקודה שווה 1 ₪ בקנייה הבאה</p>
          {expiringEntry && (
            <p className="text-sm text-orange-600 flex items-center justify-center gap-1">
              <Calendar className="w-4 h-4" /> יש לך נקודות שעומדות לפוג בתאריך {format(parseISO(expiringEntry.expires_at), 'dd/MM/yyyy', { locale: he })}
            </p>
          )}
          {Number(user.points_balance || 0) > 0 && (
            <div className="pt-2">
              <Link to={createPageUrl('Home')}>
                <Button className="bg-stone-900 hover:bg-stone-800 h-10 px-4 flex items-center gap-2">
                  נצלי {Number(user.points_balance || 0)} ₪ עכשיו <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gift + Tiers split layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BirthdayGiftCard amount={birthdayBonusActive?.amount || null} expiresText={birthdayExpiresText} />
        <TiersGrid tiers={TIERS} userTier={userTier} />
      </div>

      {/* 6. Newsletter */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-lg border border-stone-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-stone-800"><Mail className="w-5 h-5 text-blue-500" /> רוצות לדעת ראשונות?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-md text-stone-700 max-w-xl mx-auto">חברות הניוזלטר מקבלות ראשונות מבצעים, הטבות והפתעות – לפני כולן</p>
          <div className="flex items-start justify-center gap-2">
            <Checkbox id="marketing-loyalty" checked={!!user.marketing_opt_in} onCheckedChange={(c) => toggleNewsletter(!!c)} disabled={updatingMarketing} />
            <Label htmlFor="marketing-loyalty" className="text-sm text-stone-600 cursor-pointer">אני רוצה להצטרף לרשימת התפוצה</Label>
          </div>
          <p className="text-xs text-stone-500">ניתן להסרה בכל רגע בלחיצה אחת</p>
        </CardContent>
      </Card>

      {/* 7. Emotional summary */}
      <div className="text-center space-y-3 pb-24">
        <p className="text-lg text-stone-600 max-w-xl mx-auto">כל קנייה שלך שווה יותר כאן. נקודות, מתנות, והטבות – כי מגיע לך.</p>
        <Link to={createPageUrl('Home')}>
          <Button className="bg-rose-500 hover:bg-rose-600 text-white text-lg px-8 py-3 rounded-full shadow-lg">לחזרה לחנות</Button>
        </Link>
      </div>
      <StickyCTA points={Number(user.points_balance || 0)} />
    </motion.div>
  );
}