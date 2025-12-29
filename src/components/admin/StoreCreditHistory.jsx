import React, { useState, useEffect } from 'react';
import { StoreCreditTransaction } from '@/entities/StoreCreditTransaction';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function StoreCreditHistory({ userId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  const loadTransactions = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const data = await StoreCreditTransaction.filter({ user_id: userId });
      setTransactions((data || []).sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ));
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      add: 'הוספה',
      redeem: 'מימוש',
      expire: 'פקיעה',
      adjust: 'התאמה'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500">
        אין עדיין טרנזקציות קרדיט למשתמש זה
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {transactions.map((tx) => (
        <div key={tx.id} className="border rounded-lg p-3 bg-stone-50">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs text-stone-500">
                {format(new Date(tx.created_date), 'dd/MM/yyyy HH:mm')}
              </span>
              <span className="text-xs text-stone-400 mx-2">•</span>
              <span className="text-xs font-medium text-stone-700">
                {getTypeLabel(tx.transaction_type)}
              </span>
            </div>
            <span className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {tx.amount >= 0 ? '+' : ''}₪{tx.amount.toFixed(2)}
            </span>
          </div>
          {tx.description && (
            <p className="text-sm text-stone-600">{tx.description}</p>
          )}
          <div className="text-xs text-stone-400 mt-1">
            יתרה לאחר: ₪{tx.balance_after?.toFixed(2) || '0.00'}
          </div>
        </div>
      ))}
    </div>
  );
}