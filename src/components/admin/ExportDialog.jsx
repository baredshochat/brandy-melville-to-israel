import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Mail, Loader2 } from 'lucide-react';

const categoryNames = {
  all: 'כל הקטגוריות',
  tops: 'חולצות וטופים',
  bottoms: 'מכנסיים וחצאיות',
  dresses: 'שמלות',
  sweaters: 'סוודרים וסווטשירטים',
  accessories: 'אביזרים',
  other: 'אחר'
};

export default function ExportDialog({ open, onOpenChange }) {
  const [filters, setFilters] = useState({
    isAvailable: 'all',
    isHidden: 'all',
    inStock: 'all',
    category: 'all',
    searchQuery: ''
  });
  const [sendToEmail, setSendToEmail] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async (withEmail = false) => {
    setExporting(true);
    try {
      const { base44 } = await import('@/api/base44Client');
      
      const payload = {
        filters,
        sendEmail: withEmail,
        recipientEmail: withEmail ? recipientEmail : null
      };

      const response = await base44.functions.invoke('exportLocalStock', payload);
      
      if (withEmail) {
        alert('הדוח נשלח בהצלחה למייל! 📧');
      } else {
        // Download the CSV
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('שגיאה בייצוא הדוח');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>ייצוא דוח מלאי</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>זמין למכירה</Label>
            <Select value={filters.isAvailable} onValueChange={(val) => setFilters({...filters, isAvailable: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="true">זמין בלבד</SelectItem>
                <SelectItem value="false">לא זמין בלבד</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>סטטוס תצוגה</Label>
            <Select value={filters.isHidden} onValueChange={(val) => setFilters({...filters, isHidden: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="false">גלוי ללקוחות</SelectItem>
                <SelectItem value="true">מוסתר מלקוחות</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>מלאי</Label>
            <Select value={filters.inStock} onValueChange={(val) => setFilters({...filters, inStock: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="true">יש במלאי</SelectItem>
                <SelectItem value="false">אזל המלאי</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>קטגוריה</Label>
            <Select value={filters.category} onValueChange={(val) => setFilters({...filters, category: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryNames).map(([key, name]) => (
                  <SelectItem key={key} value={key}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>חיפוש טקסט (אופציונלי)</Label>
            <Input
              placeholder="שם מוצר, תיאור, או מק״ט..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
            />
          </div>

          <div className="border-t pt-4 mt-4 space-y-3">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="sendEmail"
                checked={sendToEmail}
                onCheckedChange={setSendToEmail}
              />
              <Label htmlFor="sendEmail" className="cursor-pointer">
                שלח גם למייל (לדוגמה, לרואת חשבון)
              </Label>
            </div>

            {sendToEmail && (
              <div className="space-y-2">
                <Label>כתובת מייל</Label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            ביטול
          </Button>
          
          {sendToEmail && recipientEmail ? (
            <Button onClick={() => handleExport(true)} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Mail className="w-4 h-4 ml-2" />}
              ייצא ושלח למייל
            </Button>
          ) : (
            <Button onClick={() => handleExport(false)} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Download className="w-4 h-4 ml-2" />}
              ייצא והורד
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}