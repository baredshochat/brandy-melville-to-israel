import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function BulkUpdateDialog({
  isOpen,
  onClose,
  onUpdate,
  updateType,
  selectedCount,
  isUpdating
}) {
  const [value, setValue] = useState('');
  const [operation, setOperation] = useState('set');

  const handleUpdate = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      alert('יש להזין ערך מספרי תקין.');
      return;
    }
    onUpdate(operation, numValue);
    setValue('');
  };

  const title = updateType === 'price' ? 'עדכון מחיר' : 'עדכון כמות';
  const label = updateType === 'price' ? 'ערך' : 'ערך';
  const placeholder = updateType === 'price' ? 'הזן מחיר' : 'הזן כמות';
  const options = updateType === 'price' ? [
    { value: 'set', label: 'קבע ערך חדש' },
    { value: 'increase_by', label: 'העלה ב-X שקלים' },
    { value: 'decrease_by', label: 'הורד ב-X שקלים' },
    { value: 'multiply_by', label: 'הכפל פי X' },
  ] : [
    { value: 'set', label: 'קבע ערך חדש' },
    { value: 'increase_by', label: 'הוסף X יחידות' },
    { value: 'decrease_by', label: 'הפחת X יחידות' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title} ל-{selectedCount} פריטים</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="operation">פעולה</Label>
            <Select value={operation} onValueChange={setOperation}>
              <SelectTrigger>
                <SelectValue placeholder="בחר פעולה" />
              </SelectTrigger>
              <SelectContent>
                {options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">{label}</Label>
            <Input
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>
            ביטול
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating || !value}>
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            עדכן
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}