import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, Gift, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function GiftCardForm({ card, onSave, onCancel }) {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      code: card?.code || '',
      initial_value: card?.initial_value || '',
      current_balance: card?.current_balance || '',
      valid_from: card?.valid_from ? new Date(card.valid_from) : undefined,
      valid_until: card?.valid_until ? new Date(card.valid_until) : undefined,
      recipient_email: card?.recipient_email || '',
      recipient_name: card?.recipient_name || '',
      status: card?.status || 'active',
      notes: card?.notes || ''
    }
  });

  useEffect(() => {
    if (card) {
      Object.keys(card).forEach(key => {
        if (key === 'valid_from' || key === 'valid_until') {
          setValue(key, card[key] ? new Date(card[key]) : undefined);
        } else if (key !== 'id' && key !== 'created_date' && key !== 'updated_date') {
          setValue(key, card[key]);
        }
      });
    }
  }, [card, setValue]);

  const generateCode = () => {
    const randomCode = 'GIFT' + Math.random().toString(36).substring(2, 10).toUpperCase();
    setValue('code', randomCode);
  };

  const onSubmit = async (data) => {
    const formattedData = {
      ...data,
      code: data.code.toUpperCase(),
      initial_value: parseFloat(data.initial_value),
      current_balance: card ? parseFloat(data.current_balance) : parseFloat(data.initial_value),
      valid_from: data.valid_from ? data.valid_from.toISOString() : null,
      valid_until: data.valid_until ? data.valid_until.toISOString() : null,
      times_redeemed: card?.times_redeemed || 0,
      order_ids_used_in: card?.order_ids_used_in || []
    };

    await onSave(formattedData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="code">קוד גיפטקארד</Label>
          <div className="flex gap-2">
            <Input
              id="code"
              {...register('code', { required: 'קוד הוא שדה חובה' })}
              className={cn("font-mono uppercase flex-1", { 'border-red-500': errors.code })}
              placeholder="GIFTABC123"
            />
            <Button type="button" variant="outline" onClick={generateCode}>
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
          {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
        </div>

        <div>
          <Label htmlFor="initial_value">ערך התחלתי (₪)</Label>
          <Input
            id="initial_value"
            type="number"
            step="0.01"
            {...register('initial_value', { required: 'ערך התחלתי הוא שדה חובה' })}
            className={cn({ 'border-red-500': errors.initial_value })}
            placeholder="100.00"
            disabled={!!card}
          />
          {errors.initial_value && <p className="text-red-500 text-xs mt-1">{errors.initial_value.message}</p>}
        </div>

        {card && (
          <div>
            <Label htmlFor="current_balance">יתרה נוכחית (₪)</Label>
            <Input
              id="current_balance"
              type="number"
              step="0.01"
              {...register('current_balance')}
              className={cn({ 'border-red-500': errors.current_balance })}
            />
          </div>
        )}

        <div>
          <Label htmlFor="recipient_name">שם הנמען (אופציונלי)</Label>
          <Input
            id="recipient_name"
            {...register('recipient_name')}
            placeholder="שם מלא"
          />
        </div>

        <div>
          <Label htmlFor="recipient_email">אימייל הנמען (אופציונלי)</Label>
          <Input
            id="recipient_email"
            type="email"
            {...register('recipient_email')}
            placeholder="example@email.com"
            dir="ltr"
          />
        </div>

        <div>
          <Label htmlFor="valid_from">תקף מתאריך</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !watch('valid_from') && "text-muted-foreground"
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
        </div>

        <div>
          <Label htmlFor="valid_until">תקף עד תאריך</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !watch('valid_until') && "text-muted-foreground"
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
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="status">סטטוס</Label>
          <Select
            onValueChange={(value) => setValue('status', value)}
            value={watch('status')}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="redeemed">נוצל</SelectItem>
              <SelectItem value="expired">פג תוקף</SelectItem>
              <SelectItem value="cancelled">בוטל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="notes">הערות פנימיות</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="הערות למנהל..."
            rows={3}
          />
        </div>
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
              <Gift className="w-4 h-4 ml-2" />
              שמור גיפטקארד
            </>
          )}
        </Button>
      </div>
    </form>
  );
}