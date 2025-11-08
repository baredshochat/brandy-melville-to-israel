
import React, { useEffect, useState } from "react";
import { User } from "@/entities/User";
import { PricingLabels } from "@/entities/PricingLabels";
import { OrderStatusSteps } from "@/entities/OrderStatusSteps";
import { createPageUrl } from "@/utils";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Settings, ListOrdered, Calendar, Clock, Eye, Check, Package } from "lucide-react";
import { motion } from "framer-motion";

export default function DisplaySettings() {
  const [userRole, setUserRole] = useState(null);

  // Pricing Labels state
  const [labels, setLabels] = useState(null);
  const [labelsRecordId, setLabelsRecordId] = useState(null);
  const [labelsLoading, setLabelsLoading] = useState(true);
  const [labelsSaving, setLabelsSaving] = useState(false);

  // Status Steps state
  const [statusSteps, setStatusSteps] = useState([]);
  const [stepsLoading, setStepsLoading] = useState(true);
  const [stepsSaving, setStepsSaving] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== "admin") {
          window.location.href = createPageUrl("Home");
          return;
        }
        setUserRole(user.role);
        await Promise.all([loadLabels(), loadStatusSteps()]);
      } catch {
        window.location.href = createPageUrl("Home");
      }
    };
    checkAccess();
  }, []);

  // Load Pricing Labels (ensure one record exists)
  const loadLabels = async () => {
    setLabelsLoading(true);
    const result = await PricingLabels.list();
    if (result && result.length > 0) {
      const rec = result[0];
      setLabels(rec);
      setLabelsRecordId(rec.id);
    } else {
      // Initialize defaults based on the new structure
      const defaults = {
        items_section_title: "הפריטים שלך",
        handling_fee_label: "דמי טיפול קבוע",
        handling_fee_tooltip: "מכסה עלויות טיפול ושחרור. מחירי הפריטים כבר כוללים יבוא ומשלוח עד הבית.",
        final_total_label: "סה״כ לתשלום",
        final_note_text: "מחיר סופי, כולל הכל. ברנדי מחו״ל עד אלייך.",
        // Preserve old fields with null if they exist in schema and need to be explicitly set
        product_cost_label: null,
        product_cost_tooltip: null,
        product_ils_label: null,
        product_ils_tooltip: null,
        intl_shipping_label: null,
        intl_shipping_tooltip: null,
        customs_and_fees_label: null,
        customs_and_fees_tooltip: null,
        domestic_shipping_label: null,
        domestic_shipping_tooltip: null,
        vat_label: null,
        vat_tooltip: null,
        final_price_label: null,
      };
      const created = await PricingLabels.create(defaults);
      const createdObj = created?.data || created;
      setLabels(createdObj);
      setLabelsRecordId(createdObj.id);
    }
    setLabelsLoading(false);
  };

  const saveLabels = async () => {
    if (!labelsRecordId) return;
    setLabelsSaving(true);
    await PricingLabels.update(labelsRecordId, labels);
    setLabelsSaving(false);
  };

  // Load Status Steps
  const loadStatusSteps = async () => {
    setStepsLoading(true);
    try {
      const steps = await OrderStatusSteps.list();
      // dedupe by status_key keep latest
      const unique = [];
      const seen = new Set();
      const sortedByDate = steps.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      for (const s of sortedByDate) {
        if (!seen.has(s.status_key)) {
          unique.push(s);
          seen.add(s.status_key);
        }
      }
      // sort by step_number ascending
      unique.sort((a, b) => a.step_number - b.step_number);
      setStatusSteps(unique);
    } finally {
      setStepsLoading(false);
    }
  };

  const saveSteps = async () => {
    setStepsSaving(true);
    for (const step of statusSteps) {
      await OrderStatusSteps.update(step.id, {
        label: step.label,
        step_number: step.step_number,
        estimated_days_remaining: step.estimated_days_remaining,
        time_range_text: step.time_range_text,
      });
    }
    setStepsSaving(false);
  };

  const setLabelField = (field, value) => {
    setLabels((prev) => ({ ...prev, [field]: value }));
  };

  const setStepField = (index, field, value) => {
    setStatusSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  if (userRole !== "admin") {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-stone-50 min-h-screen pb-12">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold text-stone-900 flex items-center gap-3">
            <Settings className="w-7 h-7 text-stone-700" />
            הגדרות תצוגה
          </h1>
          <p className="text-stone-600 mt-2">ניהול תוויות מחיר ושלבי סטטוס במקום אחד, עם תצוגה מקדימה.</p>
        </div>

        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="pricing">תוויות מחיר</TabsTrigger>
            <TabsTrigger value="status">שלבי סטטוס</TabsTrigger>
          </TabsList>

          {/* Pricing Labels Tab (now Order Summary Labels) */}
          <TabsContent value="pricing" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white border border-stone-200">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold text-stone-900">עריכת תוויות לסיכום ההזמנה</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {labelsLoading ? (
                    <div className="p-6 flex justify-center">
                      <div className="w-8 h-8 border-b-2 border-stone-400 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label>כותרת מקטע הפריטים</Label>
                          <Input value={labels?.items_section_title || ""} onChange={(e) => setLabelField("items_section_title", e.target.value)} />
                        </div>
                        <div>
                          <Label>תווית "דמי טיפול"</Label>
                          <Input value={labels?.handling_fee_label || ""} onChange={(e) => setLabelField("handling_fee_label", e.target.value)} />
                        </div>
                        <div>
                          <Label>טקסט עזרה לדמי טיפול (Tooltip)</Label>
                          <Input value={labels?.handling_fee_tooltip || ""} onChange={(e) => setLabelField("handling_fee_tooltip", e.target.value)} />
                        </div>
                        <div>
                          <Label>כותרת "סה״כ לתשלום"</Label>
                          <Input value={labels?.final_total_label || ""} onChange={(e) => setLabelField("final_total_label", e.target.value)} />
                        </div>
                        <div>
                          <Label>שורת הבהרה מתחת לסה״כ</Label>
                          <Input value={labels?.final_note_text || ""} onChange={(e) => setLabelField("final_note_text", e.target.value)} />
                        </div>
                      </div>

                      <Button onClick={saveLabels} disabled={labelsSaving} className="w-full h-11 bg-black hover:bg-stone-800">
                        {labelsSaving ? "שומר..." : "שמירת תוויות"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Preview for Order Summary */}
              <Card className="bg-white border border-stone-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-stone-600" />
                    תצוגה מקדימה – סיכום הזמנה כפי שנראה ללקוחה
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="flex items-center gap-2 text-stone-700 font-medium">
                        <Package className="w-4 h-4" />
                        {labels?.items_section_title || "הפריטים שלך"}
                      </h3>
                      <div className="flex justify-between items-start py-3 border-b border-rose-100">
                        <div>
                          <p className="font-medium text-stone-800">Brandy T-Shirt</p>
                          <p className="text-xs text-stone-500">×1 • White • One Size</p>
                        </div>
                        <p className="font-semibold text-stone-900 ltr">₪129.90</p>
                      </div>
                      <div className="flex justify-between items-start py-3 border-b border-rose-100">
                        <div>
                          <p className="font-medium text-stone-800">Brandy Sweatpants</p>
                          <p className="text-xs text-stone-500">×1 • Grey • One Size</p>
                        </div>
                        <p className="font-semibold text-stone-900 ltr">₪249.90</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-dashed border-rose-200"></div>

                    <div className="flex justify-between items-center py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-stone-700">{labels?.handling_fee_label || "דמי טיפול קבוע"}</span>
                        <Badge variant="outline" className="text-xs">{labels?.handling_fee_tooltip || "מכסה עלויות טיפול ושחרור. מחירי הפריטים כבר כוללים יבוא ומשלוח עד הבית."}</Badge>
                      </div>
                      <span className="font-medium text-stone-900 ltr">₪55.00</span>
                    </div>

                    <div className="mt-4 pt-4 border-t-2 border-rose-200">
                      <div className="flex flex-col items-center bg-white/80 p-3 text-center">
                        <span className="text-lg font-medium text-stone-900 mb-1">{labels?.final_total_label || "סה״כ לתשלום"}</span>
                        <span className="text-3xl font-bold text-stone-800 mb-2">₪434.80</span>
                        <p className="text-xs text-stone-500">{labels?.final_note_text || "מחיר סופי, כולל הכל. ברנדי מחו״ל עד אלייך."}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Status Steps Tab */}
          <TabsContent value="status" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white border border-stone-200">
                <CardHeader>
                  <CardTitle className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
                    <ListOrdered className="w-6 h-6 text-stone-600" />
                    עריכת שלבי הסטטוס
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {stepsLoading ? (
                    <div className="p-6 flex justify-center">
                      <div className="w-8 h-8 border-b-2 border-stone-400 rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {statusSteps.map((step, index) => (
                        <div key={step.status_key} className="p-4 bg-stone-50 border border-stone-200">
                          <div className="mb-2">
                            <h3 className="font-semibold text-stone-800">שלב {step.step_number}: {step.status_key}</h3>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div>
                              <Label>תווית מוצגת ללקוח</Label>
                              <Input value={step.label || ""} onChange={(e) => setStepField(index, "label", e.target.value)} />
                            </div>
                            <div>
                              <Label>ימים משוערים שנותרו</Label>
                              <Input type="number" value={step.estimated_days_remaining || 0} onChange={(e) => setStepField(index, "estimated_days_remaining", parseInt(e.target.value) || 0)} />
                            </div>
                            <div className="sm:col-span-2">
                              <Label>טקסט טווח זמן (למשל: "2-3 שבועות")</Label>
                              <Input value={step.time_range_text || ""} onChange={(e) => setStepField(index, "time_range_text", e.target.value)} placeholder='לדוגמה: "2-3 שבועות"' />
                            </div>
                          </div>
                        </div>
                      ))}

                      <Button onClick={saveSteps} disabled={stepsSaving} className="w-full h-11 bg-black hover:bg-stone-800">
                        {stepsSaving ? "שומר..." : "שמירת שינויים"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Preview for Status Steps */}
              <Card className="bg-white border border-stone-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-stone-600" />
                    תצוגה מקדימה – קו התקדמות סטטוס
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-0">
                    {statusSteps
                      .slice()
                      .sort((a, b) => a.step_number - b.step_number)
                      .map((s, idx, arr) => {
                        const currentStep = 4; // סטטוס נוכחי לדוגמה
                        const isActive = s.step_number <= currentStep;
                        const isCurrent = s.step_number === currentStep;
                        const isLast = idx === arr.length - 1;

                        return (
                          <div key={s.status_key} className="relative">
                            <div className="flex items-start gap-4 pb-6">
                              <div className="flex flex-col items-center">
                                <div className={`w-9 h-9 flex items-center justify-center border-2 ${isActive ? "bg-rose-400 border-rose-400 text-white" : "bg-white border-stone-300 text-stone-400"}`}>
                                  {isActive ? <Check className="w-5 h-5" /> : <span className="text-sm">{s.step_number}</span>}
                                </div>
                                {!isLast && <div className={`w-0.5 h-10 mt-2 ${isActive ? "bg-rose-300" : "bg-stone-200"}`} />}
                              </div>
                              <div className="flex-1 pt-1">
                                <h4 className={`text-base mb-1 ${isActive ? "text-stone-800" : "text-stone-500"}`}>{s.label || s.status_key}</h4>
                                {isCurrent && (
                                  <div className="space-y-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800">
                                      <Package className="w-3 h-3" />
                                      <span className="text-sm">סטטוס נוכחי</span>
                                    </div>
                                    {s.time_range_text && (
                                      <div className="flex items-center gap-2 text-sm text-stone-600">
                                        <Clock className="w-3 h-3" />
                                        <span>נותרו כ-{s.time_range_text}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
