import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign } from 'lucide-react';

export default function StoreCreditForm({ user, onSave, onCancel }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(!user);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      user_id: user?.id || '',
      user_email: user?.email || '',
      amount: '',
      transaction_type: 'add',
      description: ''
    }
  });

  useEffect(() => {
    if (!user) {
      loadUsers();
    } else {
      setValue('user_id', user.id);
      setValue('user_email', user.email);
    }
  }, [user, setValue]);

  const loadUsers = async () => {
    try {
      const data = await User.list();
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const onSubmit = async (data) => {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount === 0) {
      alert('יש להזין סכום תקין');
      return;
    }

    const finalAmount = data.transaction_type === 'redeem' ? -Math.abs(amount) : Math.abs(amount);

    await onSave({
      user_id: data.user_id,
      user_email: data.user_email,
      amount: finalAmount,
      transaction_type: data.transaction_type,
      description: data.description || ''
    });
  };

  const handleUserChange = (userId) => {
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setValue('user_id', selectedUser.id);
      setValue('user_email', selectedUser.email);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      {!user && (
        <div>
          <Label>בחר משתמש</Label>
          {loadingUsers ? (
            <div className="py-4 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-rose-400 mx-auto" />
            </div>
          ) : (
            <Select onValueChange={handleUserChange} value={watch('user_id')}>
              <SelectTrigger>
                <SelectValue placeholder="בחר משתמש..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {user && (
        <div className="p-3 bg-stone-50 rounded-lg">
          <p className="font-medium">{user.full_name}</p>
          <p className="text-sm text-stone-600">{user.email}</p>
        </div>
      )}

      <div>
        <Label>סוג פעולה</Label>
        <Select
          onValueChange={(value) => setValue('transaction_type', value)}
          value={watch('transaction_type')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">הוספת קרדיט</SelectItem>
            <SelectItem value="redeem">הפחתת קרדיט</SelectItem>
            <SelectItem value="adjust">התאמה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>סכום (₪)</Label>
        <Input
          type="number"
          step="0.01"
          placeholder="0.00"
          {...register('amount', { required: true })}
        />
        {errors.amount && <p className="text-red-500 text-xs mt-1">יש להזין סכום</p>}
      </div>

      <div>
        <Label>תיאור</Label>
        <Textarea
          placeholder="סיבה לעדכון הקרדיט..."
          {...register('description')}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" className="bg-rose-500 hover:bg-rose-600" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 ml-2" />
              עדכן קרדיט
            </>
          )}
        </Button>
      </div>
    </form>
  );
}