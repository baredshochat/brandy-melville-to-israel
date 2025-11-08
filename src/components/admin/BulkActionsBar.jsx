import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Mail, FileText, Truck, Package, Trash2 } from 'lucide-react';

export default function BulkActionsBar({ selectedCount, onAction, onClear }) {
  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedCount} נבחרו</Badge>
              <Button variant="ghost" size="sm" onClick={onClear}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Select onValueChange={(value) => onAction('changeStatus', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="שנה סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">ממתין</SelectItem>
                  <SelectItem value="ordered">הוזמן</SelectItem>
                  <SelectItem value="warehouse">במחסן</SelectItem>
                  <SelectItem value="shipping_to_israel">בדרך לישראל</SelectItem>
                  <SelectItem value="in_israel">בארץ</SelectItem>
                  <SelectItem value="shipping_to_customer">בדרך ללקוחה</SelectItem>
                  <SelectItem value="delivered">נמסר</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => onAction('sendUpdate')}>
                <Mail className="w-4 h-4 mr-2" />
                שלח עדכון
              </Button>

              <Button variant="outline" size="sm" onClick={() => onAction('exportLabels')}>
                <FileText className="w-4 h-4 mr-2" />
                יצא תוויות
              </Button>

              <Button variant="outline" size="sm" onClick={() => onAction('consolidate')}>
                <Package className="w-4 h-4 mr-2" />
                איחוד הזמנות
              </Button>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onAction('delete')}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                מחק הזמנות
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}