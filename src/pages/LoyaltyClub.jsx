import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { PointsLedger } from '@/entities/PointsLedger';
import { Code } from '@/entities/Code';
import { joinClub } from '@/functions/joinClub';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Gift, Star, Award, ShoppingBag, TrendingUp, CheckCircle, Sparkles, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

export default function LoyaltyClub() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joinForm, setJoinForm] = useState({ birthday: '', marketing_opt_in: true });
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.error('Error loading data:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async () => {
    setJoining(true);
    try {
      const { data } = await joinClub(joinForm);
      if (data.success) {
        alert(data.message + `\nקיבלת ${data.bonus_points} נקודות בונוס! 🎉`);
        await loadData();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  // Determine CTA button based on user status
  const renderCTA = (size = 'default') => {
    if (!user) {
      return (
        <Button 
                        onClick={() => base44.auth.redirectToLogin(createPageUrl('LoyaltyClub'))}
                        className="bg-rose-500 hover:bg-rose-600 text-white"
                        size={size}
                      >
                        הצטרפי עכשיו – 50 נקודות מתנה (₪25)
                      </Button>
      );
    }
    
    if (!user.club_member) {
      return (
        <Button 
          onClick={handleJoinClub}
          disabled={!joinForm.birthday || !joinForm.marketing_opt_in || joining}
          className="bg-rose-500 hover:bg-rose-600 text-white"
          size={size}
        >
          {joining ? (
            <><Loader2 className="w-4 h-4 animate-spin ml-2" /> מצטרפת...</>
          ) : (
            <>הצטרפי וקבלי 50 נקודות (₪25)</>
          )}
        </Button>
      );
    }
    
    return (
      <Link to={createPageUrl('Profile')}>
        <Button className="bg-stone-900 hover:bg-stone-800 text-white" size={size}>
          לעמוד האישי שלי
        </Button>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-rose-50/30 to-stone-100">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative bg-white overflow-hidden"
      >
        <div className="absolute inset-0">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/b7a7981b1_IMG_9486.jpg"
            alt="Brandy Melville aesthetic"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-rose-50/20 to-transparent" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-10 md:py-20 text-center">
          <Heart className="w-10 h-10 md:w-16 md:h-16 text-rose-400 fill-rose-400/20 mx-auto mb-4 md:mb-6" />
          <h1 className="text-3xl md:text-5xl font-light text-stone-800 mb-2 md:mb-4">
            מועדון הלקוחות שלנו
          </h1>
          <p className="text-base md:text-xl text-stone-600 font-light mb-6 md:mb-8 max-w-2xl mx-auto">
            צוברות נקודות, פותחות הטבות, ונהנות יותר מכל הזמנה
          </p>
          
          {/* Join Form for non-members */}
          {user && !user.club_member && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto mb-6 space-y-4"
            >
              <div>
                <Label htmlFor="birthday-hero" className="text-right block mb-2">תאריך יום הולדת *</Label>
                <Input
                  id="birthday-hero"
                  type="date"
                  value={joinForm.birthday}
                  onChange={(e) => setJoinForm({ ...joinForm, birthday: e.target.value })}
                  className="text-center"
                />
              </div>
              <div className="flex items-start gap-2 justify-center">
                <Checkbox
                  id="marketing-hero"
                  checked={joinForm.marketing_opt_in}
                  onCheckedChange={(checked) => setJoinForm({ ...joinForm, marketing_opt_in: checked })}
                />
                <Label htmlFor="marketing-hero" className="text-xs text-stone-600 cursor-pointer">
                  אני מאשרת קבלת עדכונים, הטבות והנחות במייל *
                </Label>
              </div>
            </motion.div>
          )}
          
          {renderCTA('lg')}
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8 md:space-y-16">
        {/* How It Works - 3 Simple Steps */}
        <section className="hidden md:block">
          <h2 className="text-3xl font-semibold text-center text-stone-800 mb-8">
            איך המועדון עובד?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center bg-white/80 backdrop-blur-sm border border-stone-200 shadow-lg">
              <CardContent className="pt-8 pb-6">
                <ShoppingBag className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">כמה שיותר קניות – יותר נקודות</h3>
                <p className="text-sm text-stone-600">
                  כל הזמנה מזכה אותך בנקודות שמתקדמות אותך להטבות
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/80 backdrop-blur-sm border border-stone-200 shadow-lg">
              <CardContent className="pt-8 pb-6">
                <Star className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">נקודות = הטבות</h3>
                <p className="text-sm text-stone-600">
                  כל 100 נקודות פותחות הטבה של 50 ₪ להזמנה
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-white/80 backdrop-blur-sm border border-stone-200 shadow-lg">
              <CardContent className="pt-8 pb-6">
                <Award className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">סטטוס גבוה = יותר יתרונות</h3>
                <p className="text-sm text-stone-600">
                  Silver ו-Gold פותחים משלוחים חינם והטבות בלעדיות
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tier Cards */}
        <section>
          <h2 className="text-3xl font-semibold text-center text-stone-800 mb-8">
            שלבי המועדון
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Member */}
            <Card className={`bg-white/90 backdrop-blur-sm shadow-lg transition-all ${
              user?.tier === 'member' ? 'border-4 border-rose-400 scale-105' : 'border border-stone-200'
            }`}>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-8 h-8 text-rose-400" />
                </div>
                <CardTitle className="text-2xl">💖 Member</CardTitle>
                {user?.tier === 'member' && (
                  <span className="text-xs text-rose-600 font-medium">הדרגה שלך</span>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-stone-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>הצטרפות למועדון</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>צבירת 5% נקודות מכל הזמנה</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>בונוס יום הולדת: 50 נקודות</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Silver */}
            <Card className={`bg-white/90 backdrop-blur-sm shadow-lg transition-all ${
              user?.tier === 'silver' ? 'border-4 border-rose-400 scale-105' : 'border border-stone-200'
            }`}>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-rose-200 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-8 h-8 text-rose-500" />
                </div>
                <CardTitle className="text-2xl">✨ Silver</CardTitle>
                {user?.tier === 'silver' && (
                  <span className="text-xs text-rose-600 font-medium">הדרגה שלך</span>
                )}
                <p className="text-xs text-stone-500 mt-1">5 הזמנות</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-stone-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>צבירת 7% נקודות מכל הזמנה</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>בונוס יום הולדת: 75 נקודות</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>משלוח חינם אחד (חד-פעמי)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                    <span>הפתעות והטבות נוספות</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Gold */}
            <Card className={`bg-white/90 backdrop-blur-sm shadow-lg transition-all ${
              user?.tier === 'gold' ? 'border-4 border-rose-400 scale-105' : 'border border-stone-200'
            }`}>
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-rose-300 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-8 h-8 text-rose-600" />
                </div>
                <CardTitle className="text-2xl">⭐ Gold</CardTitle>
                {user?.tier === 'gold' && (
                  <span className="text-xs text-rose-600 font-medium">הדרגה שלך</span>
                )}
                <p className="text-xs text-stone-500 mt-1">10 הזמנות</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-stone-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    <span>צבירת 10% נקודות מכל הזמנה</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    <span>בונוס יום הולדת: 100 נקודות</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    <span>משלוח חינם כל חודש</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    <span>הפתעות והטבות נוספות</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Points & Benefits Explanation */}
        <section className="hidden md:block">
                        <Card className="bg-white/80 backdrop-blur-sm border border-stone-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Sparkles className="w-6 h-6 text-rose-500" />
                איך נקודות הופכות להטבה?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-stone-700">
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>נקודות נצברות אוטומטית בכל קנייה</span>
                </li>
                <li className="flex items-start gap-3">
                  <Gift className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                  <span>כל 100 נקודות פותחות הטבה של 50 ₪</span>
                </li>
              </ul>
              
              <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-sm font-medium text-rose-800 text-center">
                  💫 לא משתמשים בנקודות? הן לא נעלמות – רק ההטבה מוגבלת בזמן
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Birthday Benefits */}
        <section className="hidden md:block">
                        <Card className="bg-gradient-to-br from-rose-100 via-pink-50 to-white border-2 border-rose-200 shadow-xl">
            <CardHeader className="text-center">
              <div className="text-5xl mb-3">🎂</div>
              <CardTitle className="text-2xl">ביום ההולדת – אנחנו חוגגים איתך</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <p className="font-semibold text-lg mb-1">💖 Member</p>
                  <p className="text-2xl font-bold text-rose-600">50 נקודות</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <p className="font-semibold text-lg mb-1">✨ Silver</p>
                  <p className="text-2xl font-bold text-rose-600">75 נקודות</p>
                </div>
                <div className="p-4 bg-white rounded-lg shadow-sm">
                  <p className="font-semibold text-lg mb-1">⭐ Gold</p>
                  <p className="text-2xl font-bold text-rose-600">100 נקודות</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Final CTA */}
        <section className="text-center py-8 md:py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            {!user ? (
              <>
                <h2 className="text-2xl md:text-3xl font-semibold text-stone-800 mb-3 md:mb-4">
                  כדי להתחיל לצבור – צריך רק להירשם
                </h2>
                <p className="text-stone-600 mb-6">
                  הצטרפי למועדון עכשיו והתחילי לצבור נקודות על כל הזמנה
                </p>
              </>
            ) : !user.club_member ? (
              <>
                <h2 className="text-2xl md:text-3xl font-semibold text-stone-800 mb-3 md:mb-4">
                  את כבר צעד אחד בפנים
                </h2>
                <p className="text-stone-600 mb-6">
                  עכשיו רק צריך להצטרף למועדון ולהתחיל לצבור נקודות
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl font-semibold text-stone-800 mb-3 md:mb-4">
                  כל ההתקדמות שלך מחכה בעמוד האישי
                </h2>
                <p className="text-stone-600 mb-6">
                  עקבי אחרי הנקודות שלך, ההטבות והדרגה במועדון
                </p>
              </>
            )}
            {renderCTA('lg')}
          </motion.div>
        </section>

        {/* Terms and Conditions */}
        <section className="border-t border-stone-200 pt-8">
          <div className="text-center text-xs text-stone-500 space-y-1 max-w-3xl mx-auto">
            <p>• נקודות אינן שוות כסף ואינן ניתנות להמרה ישירה</p>
            <p>• תנאי המועדון עשויים להשתנות</p>
          </div>
        </section>
      </div>
    </div>
  );
}