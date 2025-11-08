import React, { useState, useEffect, useMemo, useRef } from "react";
import { CalculationSettings } from "@/entities/CalculationSettings";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, DollarSign, Truck, Loader2, Save, Target, TrendingUp, Package, Info, Copy, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

// ---------------------- Helper functions ----------------------
const fmt = (n) => (isFinite(n) ? n : 0).toLocaleString("he-IL", { maximumFractionDigits: 2 });
const clampNum = (v, def = 0) => (Number.isFinite(+v) ? +v : def);

const ceilToHalfKg = (n) => {
  if (!isFinite(n) || n <= 0) return 0;
  return Math.ceil(n * 2) / 2;
};

const applyRounding = (value, policy) => {
  switch (policy) {
    case "nearest10": return Math.round(value / 10) * 10;
    case "nearest5": return Math.round(value / 5) * 5;
    case "ceil10": return Math.ceil(value / 10) * 10;
    case "none": return value;
    default: return Math.round(value);
  }
};

// ---------------------- Default Settings & Example ----------------------
const DEFAULT_SETTINGS = {
  fx_EUR: 4.0,
  fx_GBP: 4.5,
  fx_fee_pct: 0.027,
  brandy_commission_pct: 0,
  fixed_fees_ils: 50,
  buffer_pct: 0.05,
  processor_pct_used: 0.025,
  processor_fixed_used: 1.2,
  processor_on_gross: false,
  customs_threshold_usd: 75,
  customs_pct: 0.12,
  vat_pct: 0.18,
  duties_base_includes_shipping: true,
  import_vat_recoverable: false,
  outer_pack_kg: 0.3,
  intl_rate_per_kg: 70,
  domestic_ship_ils: 30,
  free_shipping_threshold_ils: 399,
  profit_mode: "target_margin",
  target_margin_pct: 0.1,
  commission_pct_of_baseILS: 0.1,
  min_profit_floor_ils: 40,
  rounding_policy: "nearest10",
};

const DEFAULT_EXAMPLE = {
  currency: "EUR",
  productPrice: 50,
  weight_kg: 0.4,
  dimensions_cm: { L: 0, W: 0, H: 0 },
  payment_method: "card",
};

function getFxRate(currency, settings) {
  switch (currency) {
    case "EUR": return clampNum(settings.fx_EUR, 4.0);
    case "GBP": return clampNum(settings.fx_GBP, 4.5);
    default: return clampNum(settings.fx_EUR, 4.0);
  }
}

// ---------------------- Calculation Core ----------------------
function calcBreakdown(settings, input) {
  const s = settings;
  const i = input;

  const fxRate = getFxRate(i.currency, s);
  const baseILS = clampNum(i.productPrice) * fxRate;

  const fxCost = baseILS * clampNum(s.fx_fee_pct);
  const brandFee = baseILS * clampNum(s.brandy_commission_pct);

  const real_with_outer = Math.max(0, clampNum(i.weight_kg) + clampNum(s.outer_pack_kg));
  const L = clampNum(i.dimensions_cm?.L || 0);
  const W = clampNum(i.dimensions_cm?.W || 0);
  const H = clampNum(i.dimensions_cm?.H || 0);
  const volumetric_kg = L && W && H ? (L * W * H) / 5000 : 0;
  const chargeable_kg = ceilToHalfKg(Math.max(real_with_outer, volumetric_kg));
  const intlShip = clampNum(s.intl_rate_per_kg) * chargeable_kg;

  const declared_usd = clampNum(i.productPrice) * (fxRate / 3.7);
  const duties_base = baseILS + (s.duties_base_includes_shipping ? intlShip : 0);
  const customsILS = declared_usd > clampNum(s.customs_threshold_usd) ? duties_base * clampNum(s.customs_pct) : 0;

  const importVAT_ILS = s.import_vat_recoverable ? 0 : (baseILS + clampNum(s.fixed_fees_ils)) * clampNum(s.vat_pct);
  const bufferILS = (baseILS + intlShip) * clampNum(s.buffer_pct);

  const cost_ex_vat = baseILS + fxCost + brandFee + intlShip + clampNum(s.fixed_fees_ils) + customsILS + importVAT_ILS + bufferILS;

  let target_profit = 0;
  let commission = 0;
  if (s.profit_mode === "target_margin") target_profit = cost_ex_vat * clampNum(s.target_margin_pct);
  if (s.profit_mode === "commission") commission = baseILS * clampNum(s.commission_pct_of_baseILS);

  const required_before_fees = Math.max(
    cost_ex_vat + target_profit + commission,
    cost_ex_vat + clampNum(s.min_profit_floor_ils)
  );

  const a = clampNum(s.processor_pct_used);
  const b = clampNum(s.processor_fixed_used);
  let priceExVAT;
  if (!s.processor_on_gross) {
    priceExVAT = (required_before_fees + b) / Math.max(1 - a, 1e-9);
  } else {
    priceExVAT = ((required_before_fees * (1 + clampNum(s.vat_pct))) + b) / Math.max((1 + clampNum(s.vat_pct)) * (1 - a), 1e-9);
  }

  const priceGross = priceExVAT * (1 + clampNum(s.vat_pct));
  const domestic_charge_to_customer = priceGross >= clampNum(s.free_shipping_threshold_ils) ? 0 : clampNum(s.domestic_ship_ils);

  const finalPrice_preRound = priceGross + domestic_charge_to_customer;
  const finalPriceILS = applyRounding(finalPrice_preRound, s.rounding_policy);

  const processor_fees = !s.processor_on_gross ? priceExVAT * a + b : priceGross * a + b;
  const net_profit_ils = priceExVAT - processor_fees - cost_ex_vat;
  const profit_pct_of_final = finalPriceILS > 0 ? net_profit_ils / finalPriceILS : 0;

  return {
    baseILS, fxCost, brandFee, real_with_outer, volumetric_kg, chargeable_kg,
    intlShip, declared_usd, customsILS, importVAT_ILS,
    fixed_fees_ils: clampNum(s.fixed_fees_ils), bufferILS, cost_ex_vat,
    priceExVAT, priceGross, domestic_charge_to_customer,
    finalPrice_preRound, finalPriceILS, processor_fees, net_profit_ils, profit_pct_of_final,
  };
}

// NEW: Tooltip helper component
const FieldTooltip = ({ tip }) => (
  <TooltipProvider>
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <Info className="w-4 h-4 text-stone-400 hover:text-stone-600 cursor-help inline-block mr-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs bg-stone-800 text-white p-3">
        <p className="text-sm">{tip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function CalculationSettingsPage() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [exampleInput, setExampleInput] = useState({ ...DEFAULT_EXAMPLE });
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const liveBreakdown = useMemo(() => {
    try {
      return calcBreakdown(settings, exampleInput);
    } catch (e) {
      console.error("Live preview calculation failed:", e);
      return null;
    }
  }, [settings, exampleInput]);

  useEffect(() => {
    const loadAndCheckAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUserRole(user.role);

        const results = await CalculationSettings.list();
        if (results.length > 0) {
          setSettings({ ...DEFAULT_SETTINGS, ...results[0] });
        }
      } catch (error) {
        window.location.href = createPageUrl('Home');
      } finally {
        setLoading(false);
      }
    };
    loadAndCheckAccess();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const results = await CalculationSettings.list();
      if (results.length > 0) {
        await CalculationSettings.update(results[0].id, settings);
      } else {
        await CalculationSettings.create(settings);
      }
      alert("הגדרות החישוב נשמרו בהצלחה!");
    } catch (error) {
      alert("שגיאה בשמירת הגדרות החישוב.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'admin') return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-stone-50 min-h-screen pb-12">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-semibold text-stone-900">הגדרות מחיר</h1>
            <p className="text-stone-600 mt-2">שנה את ההגדרות וראה איך זה משפיע על המחיר בזמן אמת</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSettings({ ...DEFAULT_SETTINGS })} className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> איפוס
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-black hover:bg-stone-800 text-white flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              שמור במערכת
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings - 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* שערי חליפין */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-stone-600" />
                  שערי חליפין
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      שער אירו (EUR→₪)
                      <FieldTooltip tip="כמה שקלים שווה יורו אחד. עדכני את השער לפי שער החליפין הנוכחי + עמלת המרה של הבנק שלך." />
                    </Label>
                    <Input type="number" step="0.01" value={settings.fx_EUR} onChange={(e) => setSettings({ ...settings, fx_EUR: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      שער פאונד (GBP→₪)
                      <FieldTooltip tip="כמה שקלים שווה פאונד אחד. עדכני את השער לפי שער החליפין הנוכחי + עמלת המרה של הבנק שלך." />
                    </Label>
                    <Input type="number" step="0.01" value={settings.fx_GBP} onChange={(e) => setSettings({ ...settings, fx_GBP: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      עמלת המרה (%)
                      <FieldTooltip tip="אחוז נוסף שאת גובה כעמלה על המרת המטבע (למשל 2.7% = 0.027). זה מכסה עלויות המרה והפרשי שערים." />
                    </Label>
                    <Input type="number" step="0.001" value={settings.fx_fee_pct} onChange={(e) => setSettings({ ...settings, fx_fee_pct: clampNum(e.target.value) })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* משלוחים */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-stone-600" />
                  משלוחים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      עלות שילוח בינ״ל (₪/ק״ג)
                      <FieldTooltip tip="כמה את משלמת על כל קילוגרם במשלוח מחו״ל לישראל. מוצרים כבדים יותר יעלו יותר." />
                    </Label>
                    <Input type="number" value={settings.intl_rate_per_kg} onChange={(e) => setSettings({ ...settings, intl_rate_per_kg: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      תוספת אריזה (ק״ג)
                      <FieldTooltip tip="משקל האריזה החיצונית שמתווסף למשקל המוצר. בדרך כלל 0.3 ק״ג." />
                    </Label>
                    <Input type="number" step="0.1" value={settings.outer_pack_kg} onChange={(e) => setSettings({ ...settings, outer_pack_kg: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      עלות משלוח בארץ (₪)
                      <FieldTooltip tip="כמה עולה המשלוח ללקוחה בישראל (מנקודת האיסוף עד הבית שלה)." />
                    </Label>
                    <Input type="number" value={settings.domestic_ship_ils} onChange={(e) => setSettings({ ...settings, domestic_ship_ils: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      סף משלוח חינם (₪)
                      <FieldTooltip tip="מעל סכום זה הלקוחה תקבל משלוח פנים-ארצי חינם. למשל: מעל 399 ש״ח משלוח חינם." />
                    </Label>
                    <Input type="number" value={settings.free_shipping_threshold_ils} onChange={(e) => setSettings({ ...settings, free_shipping_threshold_ils: clampNum(e.target.value) })} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* מסים ומכס */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-stone-600" />
                  מסים ומכס
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      סף למכס ($)
                      <FieldTooltip tip="הזמנות מעל סכום זה בדולרים ישלמו מכס. בישראל הסף הוא 75$." />
                    </Label>
                    <Input type="number" value={settings.customs_threshold_usd} onChange={(e) => setSettings({ ...settings, customs_threshold_usd: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      שיעור מכס (%)
                      <FieldTooltip tip="אחוז המכס שמשלמים על הזמנות מעל הסף. בישראל זה 12% על ביגוד." />
                    </Label>
                    <Input type="number" step="0.01" value={settings.customs_pct} onChange={(e) => setSettings({ ...settings, customs_pct: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      מע״מ (%)
                      <FieldTooltip tip="מע״מ ישראלי - כרגע 18%. זה מוסף על המחיר הסופי ללקוחה." />
                    </Label>
                    <Input type="number" step="0.01" value={settings.vat_pct} onChange={(e) => setSettings({ ...settings, vat_pct: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      עמלות טיפול קבועות (₪)
                      <FieldTooltip tip="עמלה קבועה לטיפול בהזמנה: שחרור מהמכס, עיבוד מסמכים וכו׳." />
                    </Label>
                    <Input type="number" value={settings.fixed_fees_ils} onChange={(e) => setSettings({ ...settings, fixed_fees_ils: clampNum(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch checked={settings.duties_base_includes_shipping} onCheckedChange={(checked) => setSettings({ ...settings, duties_base_includes_shipping: checked })} />
                    <Label className="flex items-center gap-1">
                      בסיס המכס כולל שילוח
                      <FieldTooltip tip="האם לחשב את המכס גם על עלות המשלוח הבינלאומי (וגם על המוצר), או רק על המוצר." />
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* רווחיות ועמלות */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-stone-600" />
                  רווחיות ועמלות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      יעד רווח (%)
                      <FieldTooltip tip="כמה אחוז רווח את רוצה להרוויח מהעלות. למשל: 10% = 0.10 אומר שעל כל 100 ש״ח עלות את תרצי להרוויח 10 ש״ח." />
                    </Label>
                    <Input type="number" step="0.01" value={settings.target_margin_pct} onChange={(e) => setSettings({ ...settings, target_margin_pct: clampNum(e.target.value), profit_mode: "target_margin" })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      רווח מינימלי (₪)
                      <FieldTooltip tip="הרווח המינימלי בשקלים שאת רוצה להרוויח על כל הזמנה, גם אם החישוב לפי אחוז יוצא נמוך יותר." />
                    </Label>
                    <Input type="number" value={settings.min_profit_floor_ils} onChange={(e) => setSettings({ ...settings, min_profit_floor_ils: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      עמלת סליקה (%)
                      <FieldTooltip tip="האחוז שחברת כרטיסי האשראי גובה מכל עסקה. בדרך כלל 2.5-3%." />
                    </Label>
                    <Input type="number" step="0.001" value={settings.processor_pct_used} onChange={(e) => setSettings({ ...settings, processor_pct_used: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      עמלת סליקה קבועה (₪)
                      <FieldTooltip tip="סכום קבוע שחברת כרטיסי האשראי גובה בנוסף לאחוז. בדרך כלל 1-2 ש״ח." />
                    </Label>
                    <Input type="number" step="0.1" value={settings.processor_fixed_used} onChange={(e) => setSettings({ ...settings, processor_fixed_used: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      באפר ביטחון (%)
                      <FieldTooltip tip="אחוז נוסף שמתווסף לעלות כדי לכסות הפתעות (שינויי שערים, עלויות לא צפויות). למשל: 5% = 0.05" />
                    </Label>
                    <Input type="number" step="0.01" value={settings.buffer_pct} onChange={(e) => setSettings({ ...settings, buffer_pct: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="flex items-center gap-1">
                      מדיניות עיגול
                      <FieldTooltip tip="איך לעגל את המחיר הסופי ללקוחה. למשל: ל-10 הקרוב (153 → 150), ל-5 הקרוב (153 → 155)." />
                    </Label>
                    <Select value={settings.rounding_policy} onValueChange={(value) => setSettings({ ...settings, rounding_policy: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nearest10">ה-10 הקרוב</SelectItem>
                        <SelectItem value="nearest5">ה-5 הקרוב</SelectItem>
                        <SelectItem value="ceil10">עיגול למעלה ל-10</SelectItem>
                        <SelectItem value="none">ללא עיגול</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* גיבוי והחזרה */}
            <Card>
              <CardHeader>
                <CardTitle>גיבוי והחזרה</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(JSON.stringify(settings, null, 2))} className="flex items-center gap-2">
                  <Copy className="w-4 h-4" /> העתק הגדרות
                </Button>
                <Button variant="outline" onClick={() => {
                  const raw = prompt("הדבק את ההגדרות שגיבית:");
                  if (!raw) return;
                  try { setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) }); alert("ההגדרות הוחזרו!"); } catch { alert("שגיאה - נתונים לא תקינים"); }
                }}>
                  שחזר הגדרות
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview - 1 column, sticky */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-rose-600" />
                  דוגמת חישוב חי
                </CardTitle>
                <p className="text-sm text-stone-600 mt-1">שנה את ההגדרות וראה איך זה משפיע</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-3 p-4 bg-stone-50 rounded-lg">
                  <h4 className="font-semibold text-sm text-stone-700">מוצר לדוגמה:</h4>
                  <div>
                    <Label className="text-xs">מטבע</Label>
                    <Select value={exampleInput.currency} onValueChange={(val) => setExampleInput({ ...exampleInput, currency: val })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">אירו (EUR)</SelectItem>
                        <SelectItem value="GBP">פאונד (GBP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">מחיר ({exampleInput.currency})</Label>
                    <Input type="number" className="h-9" value={exampleInput.productPrice} onChange={(e) => setExampleInput({ ...exampleInput, productPrice: clampNum(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-xs">משקל (ק״ג)</Label>
                    <Input type="number" step="0.1" className="h-9" value={exampleInput.weight_kg} onChange={(e) => setExampleInput({ ...exampleInput, weight_kg: clampNum(e.target.value) })} />
                  </div>
                </div>

                {liveBreakdown && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-stone-700 mb-3">פירוט המחיר:</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-600">מחיר בש״ח:</span>
                        <span className="font-medium">₪{fmt(liveBreakdown.baseILS)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">עמלות המרה:</span>
                        <span className="font-medium">₪{fmt(liveBreakdown.fxCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">שילוח בינ״ל:</span>
                        <span className="font-medium">₪{fmt(liveBreakdown.intlShip)}</span>
                      </div>
                      {liveBreakdown.customsILS > 0 && (
                        <div className="flex justify-between">
                          <span className="text-stone-600">מכס:</span>
                          <span className="font-medium text-orange-600">₪{fmt(liveBreakdown.customsILS)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-stone-600">עמלות טיפול:</span>
                        <span className="font-medium">₪{fmt(liveBreakdown.fixed_fees_ils)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">באפר:</span>
                        <span className="font-medium">₪{fmt(liveBreakdown.bufferILS)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-stone-600">עלות כוללת:</span>
                        <span className="font-semibold">₪{fmt(liveBreakdown.cost_ex_vat)}</span>
                      </div>
                      <div className="flex justify-between text-green-700">
                        <span>רווח נטו:</span>
                        <span className="font-semibold">₪{fmt(liveBreakdown.net_profit_ils)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">עמלות סליקה:</span>
                        <span className="font-medium">₪{fmt(liveBreakdown.processor_fees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">מע״מ (18%):</span>
                        <span className="font-medium">₪{fmt(liveBreakdown.priceGross - liveBreakdown.priceExVAT)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-600">משלוח פנים-ארצי:</span>
                        <span className="font-medium">
                          {liveBreakdown.domestic_charge_to_customer > 0 ? `₪${fmt(liveBreakdown.domestic_charge_to_customer)}` : 'חינם 🎉'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-3 border-t-2 border-rose-200">
                        <span className="font-bold text-stone-800">מחיר סופי ללקוחה:</span>
                        <span className="font-bold text-lg text-rose-600">₪{fmt(liveBreakdown.finalPriceILS)}</span>
                      </div>
                      <div className="text-xs text-stone-500 text-center pt-2">
                        שולי רווח: {(liveBreakdown.profit_pct_of_final * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}