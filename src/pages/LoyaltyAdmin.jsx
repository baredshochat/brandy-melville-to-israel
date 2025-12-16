import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { PointsLedger } from '@/entities/PointsLedger';
import { LoyaltySettings } from '@/entities/LoyaltySettings';
import { adminPointsManager } from '@/functions/adminPointsManager';
import { processBirthdays } from '@/functions/processBirthdays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Minus, Ban, Gift, Settings, Users } from 'lucide-react';

export default function LoyaltyAdmin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState([]);
  const [settings, setSettings] = useState({});
  const [actionForm, setActionForm] = useState({
    user_email: '',
    amount: '',
    reason: ''
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setUser(userData);

      if (userData?.role === 'admin') {
        // Load full ledger
        const ledgerData = await PointsLedger.list('-created_date', 100);
        setLedger(ledgerData || []);

        // Load settings
        const settingsData = await LoyaltySettings.list();
        const settingsObj = {};
        settingsData.forEach(s => {
          settingsObj[s.setting_key] = s.value;
        });
        setSettings(settingsObj);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!actionForm.user_email) {
      alert('אנא הזיני אימייל משתמש');
      return;
    }

    if ((action === 'add' || action === 'deduct') && !actionForm.amount) {
      alert('אנא הזיני כמות נקודות');
      return;
    }

    setProcessing(true);
    try {
      const { data } = await adminPointsManager({
        action,
        user_email: actionForm.user_email,
        amount: parseInt(actionForm.amount) || 0,
        reason: actionForm.reason
      });

      if (data.success) {
        alert(data.message);
        setActionForm({ user_email: '', amount: '', reason: '' });
        await loadData();
      } else {
        alert(data.error || 'שגיאה בביצוע הפעולה');
      }
    } catch (error) {
      console.error('Error in action:', error);
      alert('שגיאה בביצוע הפעולה');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessBirthdays = async () => {
    if (!confirm('האם לעבד ימי הולדת עכשיו?')) return;

    setProcessing(true);
    try {
      const { data } = await processBirthdays();
      if (data.success) {
        alert(`נשלחו ${data.processed} הטבות יום הולדת`);
      }
    } catch (error) {
      console.error('Error processing birthdays:', error);
      alert('שגיאה בעיבוד ימי הולדת');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateSetting = async (key, value) => {
    try {
      const existing = await LoyaltySettings.filter({ setting_key: key });
      if (existing && existing.length > 0) {
        await LoyaltySettings.update(existing[0].id, { value: value.toString() });
      } else {
        await LoyaltySettings.create({ setting_key: key, value: value.toString() });
      }
      alert('הגדרה עודכנה בהצלחה');
      await loadData();
    } catch (error) {
      console.error('Error updating setting:', error);
      alert('שגיאה בעדכון הגדרה');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <p className="text-stone-600">אין הרשאת גישה</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">ניהול מועדון לקוחות</h1>

      <Tabs defaultValue="actions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="actions">פעולות</TabsTrigger>
          <TabsTrigger value="ledger">היסטוריה</TabsTrigger>
          <TabsTrigger value="settings">הגדרות</TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ניהול נקודות</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>אימייל משתמש</Label>
                <Input
                  type="email"
                  value={actionForm.user_email}
                  onChange={(e) => setActionForm({ ...actionForm, user_email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label>כמות נקודות</Label>
                <Input
                  type="number"
                  value={actionForm.amount}
                  onChange={(e) => setActionForm({ ...actionForm, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>סיבה</Label>
                <Input
                  value={actionForm.reason}
                  onChange={(e) => setActionForm({ ...actionForm, reason: e.target.value })}
                  placeholder="תיאור הסיבה..."
                />
              </div>

              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => handleAction('add')}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף נקודות
                </Button>
                <Button
                  onClick={() => handleAction('deduct')}
                  disabled={processing}
                  variant="destructive"
                >
                  <Minus className="w-4 h-4 ml-2" />
                  הורד נקודות
                </Button>
                <Button
                  onClick={() => handleAction('block')}
                  disabled={processing}
                  variant="outline"
                >
                  <Ban className="w-4 h-4 ml-2" />
                  חסום משתמש
                </Button>
                <Button
                  onClick={() => handleAction('unblock')}
                  disabled={processing}
                  variant="outline"
                >
                  הסר חסימה
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>פעולות מערכת</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleProcessBirthdays}
                disabled={processing}
                className="bg-rose-500 hover:bg-rose-600"
              >
                <Gift className="w-4 h-4 ml-2" />
                עבד ימי הולדת עכשיו
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>היסטוריית תנועות ({ledger.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {ledger.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entry.user_email}</p>
                      <p className="text-xs text-stone-600">{entry.description}</p>
                      <p className="text-xs text-stone-500">
                        {new Date(entry.created_date).toLocaleString('he-IL')}
                      </p>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות מערכת</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-b pb-4">
                <h3 className="font-medium mb-3">מודל נקודות</h3>
                <div className="bg-stone-50 p-4 rounded-lg space-y-2 text-sm">
                  <p><strong>100 נקודות</strong> = הטבה של <strong>50₪</strong></p>
                  <p className="text-stone-600">• אין מימוש חלקי</p>
                  <p className="text-stone-600">• תוקף הטבה: 30 ימים</p>
                  <p className="text-stone-600">• צבירה לפי דרגה: Member 5% • Silver 7% • Gold 10%</p>
                </div>
              </div>

              <div className="border-b pb-4">
                <h3 className="font-medium mb-3">דרגות מועדון</h3>
                <div className="space-y-3">
                  <div className="bg-stone-50 p-3 rounded-lg">
                    <p className="font-medium">💖 Member</p>
                    <p className="text-xs text-stone-600">צבירה: 5% • יום הולדת: 50 נקודות</p>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-lg">
                    <p className="font-medium">✨ Silver (5 הזמנות ב-6 חודשים)</p>
                    <p className="text-xs text-stone-600">צבירה: 7% • יום הולדת: 75 נקודות • משלוח חינם חד-פעמי</p>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-lg">
                    <p className="font-medium">⭐ Gold (10 הזמנות ב-6 חודשים)</p>
                    <p className="text-xs text-stone-600">צבירה: 10% • יום הולדת: 100 נקודות • משלוח חינם חודשי</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>בונוס הצטרפות</Label>
                  <p className="text-sm text-stone-500">נקודות בונוס בהצטרפות למועדון</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    defaultValue={settings.signup_bonus || '30'}
                    className="w-24"
                    id="signup-bonus"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const val = document.getElementById('signup-bonus').value;
                      handleUpdateSetting('signup_bonus', val);
                    }}
                  >
                    עדכן
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}