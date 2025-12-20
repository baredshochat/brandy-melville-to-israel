import React, { useState, useEffect } from 'react';
import { StockTransaction } from '@/entities/StockTransaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Edit, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const transactionTypeConfig = {
  inbound: { label: 'קבלה', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  outbound: { label: 'מכירה', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  adjustment: { label: 'התאמה', icon: Edit, color: 'text-blue-600', bg: 'bg-blue-50' },
  return: { label: 'החזרה', icon: RotateCcw, color: 'text-purple-600', bg: 'bg-purple-50' }
};

export default function StockHistoryDialog({ itemId, itemName, open, onOpenChange }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && itemId) {
      loadHistory();
    }
  }, [open, itemId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await StockTransaction.filter({ local_stock_item_id: itemId }, '-created_date', 50);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading stock history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>היסטוריית מלאי - {itemName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <p>אין היסטוריה עדיין</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(trans => {
                const config = transactionTypeConfig[trans.transaction_type] || transactionTypeConfig.adjustment;
                const Icon = config.icon;
                
                return (
                  <div key={trans.id} className={`p-4 rounded-lg border ${config.bg} border-stone-200`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{config.label}</Badge>
                            {trans.order_id && (
                              <span className="text-xs text-stone-500">הזמנה #{trans.order_id}</span>
                            )}
                          </div>
                          <div className="text-sm text-stone-700">
                            <span className="font-medium">{trans.quantity_before}</span>
                            <span className="mx-2">→</span>
                            <span className="font-medium">{trans.quantity_after}</span>
                            <span className={`mx-2 font-semibold ${trans.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({trans.quantity_change > 0 ? '+' : ''}{trans.quantity_change})
                            </span>
                          </div>
                          {trans.notes && (
                            <div className="text-xs text-stone-500 mt-1">{trans.notes}</div>
                          )}
                          <div className="text-xs text-stone-400 mt-1">
                            {format(new Date(trans.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                            {trans.performed_by && ` • ${trans.performed_by}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}