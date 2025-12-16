import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { PointsLedger } from '@/entities/PointsLedger';
import { Code } from '@/entities/Code';
import { joinClub } from '@/functions/joinClub';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Gift, Star, Calendar, Award, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoyaltyClub() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentLedger, setRecentLedger] = useState([]);
  const [activeCodes, setActiveCodes] = useState([]);
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

      if (userData && userData.club_member) {
        // Load recent ledger
        const ledger = await PointsLedger.filter(
          { user_email: userData.email },
          '-created_date',
          5
        );
        setRecentLedger(ledger || []);

        // Load active codes
        const codes = await Code.filter({
          allowed_emails: { $in: [userData.email] },
          is_active: true
        });
        setActiveCodes(codes || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
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

  const getLedgerIcon = (type) => {
    switch (type) {
      case 'earn': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'bonus': return <Gift className="w-4 h-4 text-rose-500" />;
      case 'use': return <Star className="w-4 h-4 text-blue-600" />;
      default: return <Award className="w-4 h-4 text-stone-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-stone-600">אנא התחברי כדי לגשת למועדון הלקוחות</p>
      </div>
    );
  }

  if (!user.club_member) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto p-6"
      >
        <Card className="border-2 border-rose-200">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center">
                <Gift className="w-8 h-8 text-rose-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">הצטרפי למועדון הלקוחות שלנו! 🎉</CardTitle>
            <p className="text-stone-600 mt-2">צברי נקודות על כל הזמנה וקבלי הטבות מיוחדות</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-stone-50 p-4 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-rose-500 mt-0.5" />
                <div>
                  <p className="font-medium">צבירת נקודות בכל הזמנה</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-rose-500 mt-0.5" />
                <div>
                  <p className="font-medium">הטבת יום הולדת מיוחדת</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-rose-500 mt-0.5" />
                <div>
                  <p className="font-medium">הטבות שמתקדמות איתך עם הזמן</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="birthday">תאריך יום הולדת *</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={joinForm.birthday}
                  onChange={(e) => setJoinForm({ ...joinForm, birthday: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              onClick={handleJoinClub}
              disabled={!joinForm.birthday || joining}
              className="w-full bg-rose-500 hover:bg-rose-600 h-12"
            >
              {joining ? (
                <><Loader2 className="w-4 h-4 animate-spin ml-2" /> מצטרפת...</>
              ) : (
                <>הצטרפי עכשיו וקבלי 50 נקודות! 🎁</>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-6 space-y-6"
    >
      {/* Points Balance */}
      <Card className="border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-rose-500" />
            היתרה שלך
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-5xl font-bold text-rose-600">{user.points_balance || 0}</p>
            <p className="text-stone-600 mt-2">נקודות זמינות למימוש</p>
            <p className="text-sm text-stone-500 mt-1">שווי: ₪{user.points_balance || 0}</p>
          </div>
        </CardContent>
      </Card>

      {/* Active Benefits */}
      {activeCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-rose-500" />
              הטבות פעילות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeCodes.map((code) => (
              <div
                key={code.id}
                className="bg-stone-50 p-4 rounded-lg border border-stone-200"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-lg">{code.code}</p>
                    <p className="text-sm text-stone-600 mt-1">{code.notes || 'הטבה מיוחדה'}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-rose-600 font-bold">
                      {code.reward_type === 'percent' ? `${code.value}%` : `₪${code.value}`}
                    </p>
                    <p className="text-xs text-stone-500">
                      תוקף: {new Date(code.expires_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-500" />
            פעילות אחרונה
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentLedger.length === 0 ? (
            <p className="text-stone-500 text-center py-8">עדיין אין פעילות</p>
          ) : (
            <div className="space-y-3">
              {recentLedger.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getLedgerIcon(entry.type)}
                    <div>
                      <p className="font-medium text-sm">{entry.description}</p>
                      <p className="text-xs text-stone-500">
                        {new Date(entry.created_date).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${entry.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.amount > 0 ? '+' : ''}{entry.amount}
                    </p>
                    <p className="text-xs text-stone-500">יתרה: {entry.balance_after}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-stone-50 border-stone-200">
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">איך זה עובד?</h3>
          <ul className="space-y-2 text-sm text-stone-600">
            <li>• צברי נקודות על כל הזמנה שהושלמה</li>
            <li>• כל נקודה שווה 1 ₪ הנחה</li>
            <li>• קבלי הטבת יום הולדת מיוחדת כל שנה</li>
            <li>• ההטבות שלך משתפרות ככל שאת קונה יותר</li>
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}