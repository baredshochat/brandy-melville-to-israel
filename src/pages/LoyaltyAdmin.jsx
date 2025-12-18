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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Minus, Ban, Gift, Settings, Users, ArrowUpDown } from 'lucide-react';
import MembersTable from '@/components/loyalty/admin/MembersTable';
import UserHistoryDialog from '@/components/loyalty/admin/UserHistoryDialog';
import NewsletterList from '@/components/loyalty/admin/NewsletterList';
import { adjustUserPoints } from '@/functions/adjustUserPoints';


export default function LoyaltyAdmin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ledger, setLedger] = useState([]);
  const [users, setUsers] = useState([]); // New state for all users
  const [loadingUsers, setLoadingUsers] = useState(true); // New state for loading users
  const [historyOpen, setHistoryOpen] = useState(false); // New state for history dialog
  const [historyUser, setHistoryUser] = useState(null); // New state for user in history dialog
  const [historyLedger, setHistoryLedger] = useState([]); // New state for ledger in history dialog
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
    setLoadingUsers(true); // Set loading for users as well
    try {
      const userData = await User.me();
      setUser(userData);

      if (userData?.role === 'admin') {
        // Load full ledger
        const ledgerData = await PointsLedger.list('-created_date', 100);
        setLedger(ledgerData || []);

        // Load all users (for members and newsletter tabs)
        const allUsers = await User.list();
        setUsers(allUsers || []);
        setLoadingUsers(false);

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

    if (processing) return; // Prevent multiple clicks

    setProcessing(true);
    try {
      const { data } = await processBirthdays();
      if (data.success) {
        alert(`נשלחו ${data.processed} הטבות יום הולדת`);
        await loadData(); // Reload data after processing birthdays
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

  // Update points directly from MembersTable using backend function
  const handleAdjust = async (user, delta, reason) => {
    try {
      const { data } = await adjustUserPoints({ user_email: user.email, delta: Number(delta), reason });
      if (data?.success) {
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, points_balance: data.new_balance } : u));
      } else {
        alert(data?.error || 'שגיאה בעדכון נקודות');
      }
    } catch (e) {
      alert('שגיאה בעדכון נקודות');
    }
  };

  // Function to open user history dialog
  const openHistory = async (user) => {
    setHistoryUser(user);
    try {
      // Fetch ledger for the specific user by email
      const userLedger = await PointsLedger.filter({ user_email: user.email }, '-created_date', 100);
      setHistoryLedger(Array.isArray(userLedger) ? userLedger : []);
    } catch (error) {
      console.error('Error fetching user ledger:', error);
      setHistoryLedger([]);
    } finally {
      setHistoryOpen(true);
    }
  };

  // Remove user from loyalty club (club_member=false)
  const handleRemoveFromClub = async (u) => {
    if (!u) return;
    if (!confirm(`להסיר את ${u.full_name || u.email} מהמועדון?`)) return;
    try {
      await User.update(u.id, { club_member: false });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, club_member: false } : x));
      alert('המשתמש הוסר מהמועדון');
    } catch (e) {
      console.error('Remove from club failed', e);
      alert('שגיאה בהסרה מהמועדון');
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
          <TabsTrigger value="actions"><Settings className="w-4 h-4 ml-2" />פעולות</TabsTrigger>
          <TabsTrigger value="ledger"><ArrowUpDown className="w-4 h-4 ml-2" />היסטוריה</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 ml-2" />הגדרות</TabsTrigger>
          <TabsTrigger value="members"><Users className="w-4 h-4 ml-2" />חברות</TabsTrigger>
          <TabsTrigger value="newsletter"><Gift className="w-4 h-4 ml-2" />רשימת דיוור</TabsTrigger>
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>אחוז צבירה</Label>
                  <p className="text-sm text-stone-500">אחוז הנקודות שנצברות מכל הזמנה</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={settings.earn_percentage || '0.1'}
                    className="w-24"
                    id="earn-pct"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const val = document.getElementById('earn-pct').value;
                      handleUpdateSetting('earn_percentage', val);
                    }}
                  >
                    עדכן
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>מקסימום מימוש</Label>
                  <p className="text-sm text-stone-500">אחוז מקסימלי לשימוש בנקודות בהזמנה</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={settings.max_redeem_percentage || '0.3'}
                    className="w-24"
                    id="redeem-pct"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      const val = document.getElementById('redeem-pct').value;
                      handleUpdateSetting('max_redeem_percentage', val);
                    }}
                  >
                    עדכן
                  </Button>
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

        <TabsContent value="members">
          {loadingUsers ? (
            <div className="p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
              <p className="text-stone-600 mt-2">טוען משתמשים...</p>
            </div>
          ) : (
            <MembersTable users={users} onAdjust={handleAdjust} onOpenHistory={openHistory} onRemoveFromClub={handleRemoveFromClub} />
          )}
        </TabsContent>

        <TabsContent value="newsletter">
          <NewsletterList users={users} />
        </TabsContent>

        <UserHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} user={historyUser} ledger={historyLedger} />

      </Tabs>
    </div>
  );
}