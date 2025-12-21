import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowRight, Info, Upload, X, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';

export default function CouponTemplateForm({ template, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    event_type: 'admin_manual',
    discount_type: 'percentage',
    discount_value: 10,
    buy_quantity: null,
    get_quantity: null,
    valid_days: 30,
    valid_until: '',
    usage_limit_per_user: 1,
    usage_limit_total: null,
    code_prefix: 'COUPON-',
    code_suffix_template: '{first_name}{random}',
    email_subject: 'קופון הנחה מיוחד עבורך! 🎁',
    email_body_template: '',
    email_image_url: '',
    is_active: true,
    send_to_opted_in_only: true,
    ...template
  });

  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('אנא העלה קובץ תמונה בלבד');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('email_image_url', file_url);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    handleChange('email_image_url', '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate buy_x_get_y fields
    if (formData.discount_type === 'buy_x_get_y') {
      if (!formData.buy_quantity || !formData.get_quantity) {
        alert('יש למלא כמות לקנייה וכמות במתנה');
        return;
      }
    }
    
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
                <SelectItem value="buy_x_get_y">קנה X קבל Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.discount_type !== 'buy_x_get_y' ? (
            <div>
              <Label htmlFor="discount_value">ערך ההנחה *</Label>
              <Input
                id="discount_value"
                type="number"
                value={formData.discount_value}
                onChange={(e) => handleChange('discount_value', parseFloat(e.target.value))}
                placeholder={formData.discount_type === 'percentage' ? '10' : '50'}
                required={formData.discount_type !== 'buy_x_get_y'}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="buy_quantity">כמות לקנייה *</Label>
                <Input
                  id="buy_quantity"
                  type="number"
                  value={formData.buy_quantity || ''}
                  onChange={(e) => handleChange('buy_quantity', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="2"
                  min="1"
                />
              </div>
              <div>
                <Label htmlFor="get_quantity">כמות במתנה *</Label>
                <Input
                  id="get_quantity"
                  type="number"
                  value={formData.get_quantity || ''}
                  onChange={(e) => handleChange('get_quantity', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="1"
                  min="1"
                />
              </div>
            </div>
          )}
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

        <div className="space-y-3">
          <Label>תוכן המייל</Label>
          
          {/* Image Upload Section */}
          <div className="border-2 border-dashed border-stone-200 rounded-lg p-4">
            <Label className="text-sm font-medium mb-2 block">העלאת פלייר (אופציונלי)</Label>
            
            {!formData.email_image_url ? (
              <div className="flex flex-col items-center gap-3">
                <label htmlFor="flyer-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2 p-6 bg-stone-50 hover:bg-stone-100 rounded-lg transition-colors">
                    <Upload className="w-8 h-8 text-stone-400" />
                    <span className="text-sm text-stone-600">לחץ להעלאת פלייר</span>
                    <span className="text-xs text-stone-400">התמונה תופיע במייל מתחת לטקסט</span>
                  </div>
                  <Input
                    id="flyer-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
                {uploading && (
                  <p className="text-sm text-stone-500">מעלה קובץ...</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={formData.email_image_url}
                    alt="Email flyer preview"
                    className="w-full h-auto rounded-lg border border-stone-200"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(true)}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 ml-2" />
                    תצוגה מקדימה של המייל
                  </Button>
                  <label htmlFor="flyer-upload" className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={uploading}
                    >
                      <Upload className="w-4 h-4 ml-2" />
                      החלף תמונה
                    </Button>
                    <Input
                      id="flyer-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Text Template Section - Always show */}
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
              {formData.email_image_url 
                ? 'הטקסט יופיע מעל התמונה במייל. אם ריק, רק התמונה תישלח.'
                : 'אם ריק, יישלח תבנית ברירת מחדל'
              }
            </p>
          </div>
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

      {/* Email Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>תצוגה מקדימה של המייל</DialogTitle>
          </DialogHeader>
          <div className="border border-stone-200 rounded-lg p-4 bg-white" dir="rtl">
            <div className="mb-4 pb-4 border-b">
              <p className="text-sm text-stone-500">נושא:</p>
              <p className="font-medium">{formData.email_subject || 'קופון הנחה מיוחד עבורך! 🎁'}</p>
            </div>
            <div>
              {formData.email_body_template && (
                <div className="mb-4 p-4 bg-stone-50 rounded text-right" dir="rtl">
                  <div dangerouslySetInnerHTML={{ __html: formData.email_body_template.replace('{user_name}', 'שם הלקוחה').replace('{coupon_code}', 'DEMO-CODE').replace('{valid_until_date}', '31/12/2024') }} />
                </div>
              )}
              <div className="text-center">
                {formData.email_image_url ? (
                  <img
                    src={formData.email_image_url}
                    alt="Email content"
                    className="w-full h-auto"
                  />
                ) : (
                  <p className="text-stone-400">לא הועלתה תמונה</p>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}