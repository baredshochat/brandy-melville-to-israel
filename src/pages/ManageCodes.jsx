import React, { useState, useEffect } from "react";
import { Code } from "@/entities/Code";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Edit, Trash2, Copy, RefreshCw, Gift, CreditCard, Tag,
  Calendar, Users, Package, Percent, DollarSign, ShoppingBag
} from "lucide-react";
import { format } from "date-fns";

const generateRandomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function ManageCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    type: 'coupon',
    is_active: true,
    expires_at: '',
    usage_limit_total: '',
    usage_limit_per_user: '',
    allowed_emails: [],
    eligible_products: [],
    eligible_collections: [],
    reward_type: 'percent',
    value: '',
    buy_quantity: '',
    get_quantity: '',
    apply_on: 'cheapest',
    notes: ''
  });
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        loadCodes();
      } catch (error) {
        window.location.href = createPageUrl('Home');
      }
    };
    checkAccess();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const data = await Code.list('-created_date');
      setCodes(data);
    } catch (error) {
      console.error('Error loading codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (code = null) => {
    if (code) {
      setEditingCode(code);
      setFormData({
        code: code.code,
        type: code.type,
        is_active: code.is_active,
        expires_at: code.expires_at || '',
        usage_limit_total: code.usage_limit_total || '',
        usage_limit_per_user: code.usage_limit_per_user || '',
        allowed_emails: code.allowed_emails || [],
        eligible_products: code.eligible_products || [],
        eligible_collections: code.eligible_collections || [],
        reward_type: code.reward_type,
        value: code.value,
        buy_quantity: code.buy_quantity || '',
        get_quantity: code.get_quantity || '',
        apply_on: code.apply_on || 'cheapest',
        notes: code.notes || ''
      });
    } else {
      setEditingCode(null);
      setFormData({
        code: generateRandomCode(),
        type: 'coupon',
        is_active: true,
        expires_at: '',
        usage_limit_total: '',
        usage_limit_per_user: '',
        allowed_emails: [],
        eligible_products: [],
        eligible_collections: [],
        reward_type: 'percent',
        value: '',
        buy_quantity: '',
        get_quantity: '',
        apply_on: 'cheapest',
        notes: ''
      });
    }
    setEmailInput('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...formData,
        code: formData.code.toUpperCase(),
        usage_limit_total: formData.usage_limit_total ? Number(formData.usage_limit_total) : null,
        usage_limit_per_user: formData.usage_limit_per_user ? Number(formData.usage_limit_per_user) : null,
        value: Number(formData.value),
        buy_quantity: formData.buy_quantity ? Number(formData.buy_quantity) : null,
        get_quantity: formData.get_quantity ? Number(formData.get_quantity) : null
      };

      if (editingCode) {
        await Code.update(editingCode.id, dataToSave);
      } else {
        await Code.create(dataToSave);
      }

      loadCodes();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving code:', error);
      alert('שגיאה בשמירת הקוד');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('האם למחוק את הקוד?')) return;
    try {
      await Code.delete(id);
      loadCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
    }
  };

  const handleToggleActive = async (code) => {
    try {
      await Code.update(code.id, { is_active: !code.is_active });
      loadCodes();
    } catch (error) {
      console.error('Error toggling code:', error);
    }
  };

  const handleAddEmail = () => {
    if (emailInput && !formData.allowed_emails.includes(emailInput)) {
      setFormData({
        ...formData,
        allowed_emails: [...formData.allowed_emails, emailInput]
      });
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email) => {
    setFormData({
      ...formData,
      allowed_emails: formData.allowed_emails.filter(e => e !== email)
    });
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert('קוד הועתק!');
  };

  const typeIcons = {
    coupon: <Tag className="w-4 h-4" />,
    credit: <CreditCard className="w-4 h-4" />,
    giftcard: <Gift className="w-4 h-4" />
  };

  const typeColors = {
    coupon: 'bg-blue-100 text-blue-800',
    credit: 'bg-green-100 text-green-800',
    giftcard: 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">ניהול קודים</h1>
          <p className="text-stone-600">קופונים, קרדיט, כרטיסי מתנה</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          קוד חדש
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>כל הקודים ({codes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">טוען...</div>
          ) : codes.length === 0 ? (
            <div className="text-center py-8 text-stone-500">אין קודים במערכת</div>
          ) : (
            <div className="space-y-3">
              {codes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-stone-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">{code.code}</span>
                        <button
                          onClick={() => copyCode(code.code)}
                          className="text-stone-400 hover:text-stone-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <Badge className={typeColors[code.type]}>
                        {typeIcons[code.type]}
                        <span className="mr-1">
                          {code.type === 'coupon' ? 'קופון' : code.type === 'credit' ? 'קרדיט' : 'כרטיס מתנה'}
                        </span>
                      </Badge>
                      {!code.is_active && (
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          לא פעיל
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
                      <div className="flex items-center gap-1">
                        {code.reward_type === 'percent' ? (
                          <><Percent className="w-3 h-3" /> {code.value}% הנחה</>
                        ) : code.reward_type === 'fixed' ? (
                          <><DollarSign className="w-3 h-3" /> ₪{code.value} הנחה</>
                        ) : (
                          <><ShoppingBag className="w-3 h-3" /> קנה {code.buy_quantity} קבל {code.get_quantity}</>
                        )}
                      </div>
                      {code.usage_limit_total && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {code.used_count}/{code.usage_limit_total} שימושים
                        </div>
                      )}
                      {code.expires_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(code.expires_at), 'dd/MM/yyyy')}
                        </div>
                      )}
                      {code.allowed_emails?.length > 0 && (
                        <div className="flex items-center gap-1">
                          מוגבל ל-{code.allowed_emails.length} אימיילים
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={code.is_active}
                      onCheckedChange={() => handleToggleActive(code)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDialog(code)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(code.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCode ? 'עריכת קוד' : 'קוד חדש'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>קוד *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="CODE123"
                  className="font-mono"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setFormData({ ...formData, code: generateRandomCode() })}
                className="mt-6"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Type & Active */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סוג</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="coupon">קופון</SelectItem>
                    <SelectItem value="credit">קרדיט</SelectItem>
                    <SelectItem value="giftcard">כרטיס מתנה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>פעיל</Label>
              </div>
            </div>

            {/* Reward Type & Value */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>סוג הטבה *</Label>
                <Select value={formData.reward_type} onValueChange={(value) => setFormData({ ...formData, reward_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">אחוז הנחה</SelectItem>
                    <SelectItem value="fixed">סכום קבוע</SelectItem>
                    <SelectItem value="buy_x_get_y">קנה X קבל Y</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ערך *</Label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder={formData.reward_type === 'percent' ? '10' : '50'}
                />
              </div>
            </div>

            {/* Buy X Get Y */}
            {formData.reward_type === 'buy_x_get_y' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>כמות לקנייה</Label>
                  <Input
                    type="number"
                    value={formData.buy_quantity}
                    onChange={(e) => setFormData({ ...formData, buy_quantity: e.target.value })}
                    placeholder="2"
                  />
                </div>
                <div>
                  <Label>כמות מתנה</Label>
                  <Input
                    type="number"
                    value={formData.get_quantity}
                    onChange={(e) => setFormData({ ...formData, get_quantity: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>
            )}

            {/* Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>מגבלת שימוש כוללת</Label>
                <Input
                  type="number"
                  value={formData.usage_limit_total}
                  onChange={(e) => setFormData({ ...formData, usage_limit_total: e.target.value })}
                  placeholder="ללא הגבלה"
                />
              </div>
              <div>
                <Label>מגבלה למשתמש</Label>
                <Input
                  type="number"
                  value={formData.usage_limit_per_user}
                  onChange={(e) => setFormData({ ...formData, usage_limit_per_user: e.target.value })}
                  placeholder="ללא הגבלה"
                />
              </div>
            </div>

            {/* Expiry */}
            <div>
              <Label>תאריך תפוגה</Label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>

            {/* Allowed Emails */}
            <div>
              <Label>אימיילים מורשים (אופציונלי)</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="user@example.com"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                />
                <Button type="button" variant="outline" onClick={handleAddEmail}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.allowed_emails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.allowed_emails.map((email) => (
                    <Badge key={email} variant="outline" className="gap-1">
                      {email}
                      <button onClick={() => handleRemoveEmail(email)}>×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label>הערות</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="הערות פנימיות..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave}>
              {editingCode ? 'שמור שינויים' : 'צור קוד'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}