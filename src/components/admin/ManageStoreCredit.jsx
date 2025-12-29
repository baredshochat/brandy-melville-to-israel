import React, { useState, useEffect } from 'react';
import { StoreCreditTransaction } from '@/entities/StoreCreditTransaction';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2, Search, DollarSign, History } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StoreCreditForm from './StoreCreditForm';
import StoreCreditHistory from './StoreCreditHistory';
import { toast } from 'sonner';

export default function ManageStoreCredit() {
  const [users, setUsers] = useState([]);
  const [userBalances, setUserBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allUsers, allTransactions] = await Promise.all([
        User.list(),
        StoreCreditTransaction.list()
      ]);

      setUsers(allUsers || []);

      // Calculate balances per user
      const balances = {};
      (allTransactions || []).forEach(tx => {
        if (!balances[tx.user_id]) {
          balances[tx.user_id] = 0;
        }
        balances[tx.user_id] += tx.amount;
      });

      setUserBalances(balances);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredit = async (data) => {
    try {
      const currentBalance = userBalances[data.user_id] || 0;
      const newBalance = currentBalance + data.amount;

      await StoreCreditTransaction.create({
        ...data,
        balance_after: newBalance,
        performed_by: 'admin'
      });

      toast.success('קרדיט עודכן בהצלחה');
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error saving credit:', error);
      toast.error('שגיאה בעדכון הקרדיט');
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between mb-4 gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-3 w-4 h-4 text-stone-400" />
          <Input
            placeholder="חיפוש משתמש..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-rose-500 hover:bg-rose-600">
          <Plus className="w-4 h-4 ml-2" />
          הוסף קרדיט
        </Button>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-stone-500">לא נמצאו משתמשים</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead className="text-left">יתרת קרדיט</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const balance = userBalances[user.id] || 0;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell className="text-stone-600">{user.email}</TableCell>
                    <TableCell className="text-left">
                      <span className={`font-semibold ${balance > 0 ? 'text-green-600' : 'text-stone-400'}`}>
                        ₪{balance.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowForm(true);
                          }}
                        >
                          <DollarSign className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowHistory(true);
                          }}
                        >
                          <History className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>הוספה/הפחתת קרדיט</DialogTitle>
          </DialogHeader>
          <StoreCreditForm
            user={selectedUser}
            onSave={handleSaveCredit}
            onCancel={() => { setShowForm(false); setSelectedUser(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>היסטוריית קרדיט - {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <StoreCreditHistory userId={selectedUser?.id} />
        </DialogContent>
      </Dialog>
    </div>
  );
}