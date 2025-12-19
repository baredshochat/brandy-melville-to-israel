import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, Info } from 'lucide-react';

export default function CouponTemplateForm({ template, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    event_type: 'admin_manual',
    discount_type: 'percentage',
    discount_value: 10,
    valid_days: 30,
    valid_until: '',
    usage_limit_per_user: 1,
    usage_limit_total: null,
    code_prefix: 'COUPON-',
    code_suffix_template: '{first_name}',
    email_subject: 'קופון הנחה מיוחד עבורך! 🎁',
    email_body_template: '',
    is_active: true,
    send_to_opted_in_only: true,
    ...template
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">שם התבנית *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="לדוגמה: קופון הצטרפות 10%"
            required
          />
        </div>

        <div>
          <Label htmlFor="event_type">סוג אירוע</Label>
          <Select value={formData.event_type} onValueChange={(val) => handleChange('event_type', val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin_manual">שליחה ידנית</SelectItem>
              <SelectItem value="signup">הצטרפות למועדון</SelectItem>
              <SelectItem value="birthday">יום הולדת</SelectItem>
              <SelectItem value="campaign">קמפיין</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discount_type">סוג הנחה *</Label>
            <Select value={formData.discount_type} onValueChange={(val) => handleChange('discount_type', val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">אחוז (%)</SelectItem>
                <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="discount_value">ערך ההנחה *</Label>
            <Input
              id="discount_value"
              type="number"
              value={formData.discount_value}
              onChange={(e) => handleChange('discount_value', parseFloat(e.target.value))}
              placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="valid_days">תוקף (ימים)</Label>
            <Input
              id="valid_days"
              type="number"
              value={formData.valid_days || ''}
              onChange={(e) => handleChange('valid_days', parseInt(e.target.value) || null)}
              placeholder="30"
            />
          </div>
          <div>
            <Label htmlFor="valid_until">או: תאריך תפוגה ספציפי</Label>
            <Input
              id="valid_until"
              type="date"
              value={formData.valid_until || ''}
              onChange={(e) => handleChange('valid_until', e.target.value)}
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <Label className="flex items-center gap-2 mb-2">
            פורמט קוד הקופון
            <Info className="w-4 h-4 text-stone-400" />
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code_prefix">קידומת *</Label>
              <Input
                id="code_prefix"
                value={formData.code_prefix}
                onChange={(e) => handleChange('code_prefix', e.target.value)}
                placeholder="COUPON-"
                required
              />
            </div>
            <div>
              <Label htmlFor="code_suffix_template">תבנית סיומת</Label>
              <Input
                id="code_suffix_template"
                value={formData.code_suffix_template}
                onChange={(e) => handleChange('code_suffix_template', e.target.value)}
                placeholder="{first_name}"
              />
              <p className="text-xs text-stone-500 mt-1">
                ניתן להשתמש: {'{first_name}'}, {'{user_id}'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="usage_limit_per_user">מגבלת שימוש למשתמש</Label>
            <Input
              id="usage_limit_per_user"
              type="number"
              value={formData.usage_limit_per_user || 1}
              onChange={(e) => handleChange('usage_limit_per_user', parseInt(e.target.value) || 1)}
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="usage_limit_total">מגבלת שימוש כוללת (אופציונלי)</Label>
            <Input
              id="usage_limit_total"
              type="number"
              value={formData.usage_limit_total || ''}
              onChange={(e) => handleChange('usage_limit_total', parseInt(e.target.value) || null)}
              placeholder="ללא מגבלה"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <Label htmlFor="email_subject">נושא המייל *</Label>
          <Input
            id="email_subject"
            value={formData.email_subject}
            onChange={(e) => handleChange('email_subject', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="email_body_template">תוכן המייל (HTML)</Label>
          <Textarea
            id="email_body_template"
            value={formData.email_body_template}
            onChange={(e) => handleChange('email_body_template', e.target.value)}
            rows={8}
            placeholder="השתמש בתגיות: {user_name}, {coupon_code}, {valid_until_date}"
          />
          <p className="text-xs text-stone-500 mt-1">
            אם ריק, יישלח תבנית ברירת מחדל
          </p>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
            <Label htmlFor="is_active">תבנית פעילה</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="send_to_opted_in_only"
              checked={formData.send_to_opted_in_only}
              onCheckedChange={(checked) => handleChange('send_to_opted_in_only', checked)}
            />
            <Label htmlFor="send_to_opted_in_only">רק למנויים לניוזלטר</Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
        <Button type="submit" className="bg-rose-500 hover:bg-rose-600">
          <ArrowRight className="w-4 h-4 ml-2" />
          {template ? 'עדכן תבנית' : 'צור תבנית'}
        </Button>
      </div>
    </form>
  );
}