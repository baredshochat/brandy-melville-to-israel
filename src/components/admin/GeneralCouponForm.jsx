import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  code: z.string().min(1, { message: 'קוד קופון הוא שדה חובה' }).toUpperCase(),
  discount_type: z.enum(['percentage', 'fixed'], { message: 'יש לבחור סוג הנחה' }),
  discount_value: z.preprocess(
    (val) => Number(val), 
    z.number().min(0, { message: 'ערך ההנחה חייב להיות מספר חיובי' })
  ),
  valid_from: z.date().optional(),
  valid_until: z.date().optional(),
  usage_limit: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? null : Number(val),
    z.number().int().min(0, { message: 'מגבלת שימוש חייבת להיות מספר שלם וחיובי' }).nullable()
  ),
  is_active: z.boolean().default(true),
  minimum_order_amount: z.preprocess(
    (val) => Number(val), 
    z.number().min(0, { message: 'סכום הזמנה מינימלי חייב להיות מספר חיובי' })
  ).default(0),
  description: z.string().optional(),
  applies_to_site: z.enum(['all', 'us', 'eu', 'uk', 'local'], { message: 'יש לבחור אתר יעד' }).default('all'),
});

export default function GeneralCouponForm({ coupon, onSave, onCancel }) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: coupon?.code || '',
      discount_type: coupon?.discount_type || 'percentage',
      discount_value: coupon?.discount_value || 0,
      valid_from: coupon?.valid_from ? new Date(coupon.valid_from) : undefined,
      valid_until: coupon?.valid_until ? new Date(coupon.valid_until) : undefined,
      usage_limit: coupon?.usage_limit || null,
      is_active: coupon?.is_active !== undefined ? coupon.is_active : true,
      minimum_order_amount: coupon?.minimum_order_amount || 0,
      description: coupon?.description || '',
      applies_to_site: coupon?.applies_to_site || 'all',
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;

  const discountType = watch('discount_type');

  useEffect(() => {
    if (coupon) {
      Object.keys(coupon).forEach(key => {
        if (key === 'valid_from' || key === 'valid_until') {
          setValue(key, coupon[key] ? new Date(coupon[key]) : undefined);
        } else if (form.getValues().hasOwnProperty(key)) {
          setValue(key, coupon[key]);
        }
      });
    }
  }, [coupon, setValue, form]);

  const onSubmit = async (data) => {
    const formattedData = {
      ...data,
      code: data.code.toUpperCase(),
      valid_from: data.valid_from ? data.valid_from.toISOString() : null,
      valid_until: data.valid_until ? data.valid_until.toISOString() : null,
      times_used: coupon?.times_used || 0,
    };

    await onSave(formattedData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">קוד קופון</Label>
          <Input 
            id="code" 
            {...register('code')} 
            className={cn("font-mono uppercase", { 'border-red-500': errors.code })}
            placeholder="SUMMER2024"
          />
          {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
        </div>
        <div>
          <Label htmlFor="discount_type">סוג הנחה</Label>
          <Select
            onValueChange={(value) => setValue('discount_type', value)}
            value={discountType}
          >
            <SelectTrigger className={cn({ 'border-red-500': errors.discount_type })}>
              <SelectValue placeholder="בחר סוג הנחה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">אחוז הנחה (%)</SelectItem>
              <SelectItem value="fixed">סכום קבוע (₪)</SelectItem>
            </SelectContent>
          </Select>
          {errors.discount_type && <p className="text-red-500 text-xs mt-1">{errors.discount_type.message}</p>}
        </div>

        <div>
          <Label htmlFor="discount_value">ערך הנחה</Label>
          <Input
            id="discount_value"
            type="number"
            {...register('discount_value')}
            className={cn({ 'border-red-500': errors.discount_value })}
            step="0.01"
            placeholder={discountType === 'percentage' ? '10' : '50'}
          />
          {errors.discount_value && <p className="text-red-500 text-xs mt-1">{errors.discount_value.message}</p>}
        </div>

        <div>
          <Label htmlFor="minimum_order_amount">סכום הזמנה מינימלי (₪)</Label>
          <Input
            id="minimum_order_amount"
            type="number"
            {...register('minimum_order_amount')}
            className={cn({ 'border-red-500': errors.minimum_order_amount })}
            step="0.01"
            min="0"
            placeholder="0"
          />
          {errors.minimum_order_amount && <p className="text-red-500 text-xs mt-1">{errors.minimum_order_amount.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="valid_from">תקף מתאריך</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !watch('valid_from') && "text-muted-foreground",
                  { 'border-red-500': errors.valid_from }
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {watch('valid_from') ? format(watch('valid_from'), 'dd/MM/yyyy') : <span>בחר תאריך</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={watch('valid_from')}
                onSelect={(date) => setValue('valid_from', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.valid_from && <p className="text-red-500 text-xs mt-1">{errors.valid_from.message}</p>}
        </div>
        <div>
          <Label htmlFor="valid_until">תקף עד תאריך</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !watch('valid_until') && "text-muted-foreground",
                  { 'border-red-500': errors.valid_until }
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {watch('valid_until') ? format(watch('valid_until'), 'dd/MM/yyyy') : <span>בחר תאריך</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={watch('valid_until')}
                onSelect={(date) => setValue('valid_until', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.valid_until && <p className="text-red-500 text-xs mt-1">{errors.valid_until.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="usage_limit">מגבלת שימוש כוללת</Label>
          <Input
            id="usage_limit"
            type="number"
            {...register('usage_limit')}
            className={cn({ 'border-red-500': errors.usage_limit })}
            min="0"
            placeholder="השאר ריק לללא הגבלה"
          />
          <p className="text-xs text-stone-500 mt-1">כמה פעמים ניתן להשתמש בקופון בסך הכל</p>
          {errors.usage_limit && <p className="text-red-500 text-xs mt-1">{errors.usage_limit.message}</p>}
        </div>

        <div>
          <Label htmlFor="applies_to_site">חל על אתר</Label>
          <Select
            onValueChange={(value) => setValue('applies_to_site', value)}
            value={watch('applies_to_site')}
          >
            <SelectTrigger className={cn({ 'border-red-500': errors.applies_to_site })}>
              <SelectValue placeholder="בחר אתר יעד" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל האתרים</SelectItem>
              <SelectItem value="us">ארה״ב</SelectItem>
              <SelectItem value="eu">אירופה</SelectItem>
              <SelectItem value="uk">בריטניה</SelectItem>
              <SelectItem value="local">מקומי</SelectItem>
            </SelectContent>
          </Select>
          {errors.applies_to_site && <p className="text-red-500 text-xs mt-1">{errors.applies_to_site.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="description">תיאור פנימי (לא יוצג ללקוחות)</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="למשל: קמפיין סוף עונה, מתנה למועדון VIP..."
          className={cn({ 'border-red-500': errors.description })}
          rows={3}
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
      </div>

      <div className="flex items-center space-x-2 space-x-reverse">
        <Switch
          id="is_active"
          checked={watch('is_active')}
          onCheckedChange={(checked) => setValue('is_active', checked)}
        />
        <Label htmlFor="is_active" className="cursor-pointer">קופון פעיל</Label>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
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
              <Tag className="w-4 h-4 ml-2" />
              שמור קופון
            </>
          )}
        </Button>
      </div>
    </form>
  );
}