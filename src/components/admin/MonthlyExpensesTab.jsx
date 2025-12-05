import React, { useState, useEffect, useMemo } from "react";
import { MonthlyExpense } from "@/entities/MonthlyExpense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Receipt,
  TrendingDown,
  Repeat,
  Zap
} from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { he } from "date-fns/locale";

const EXPENSE_CATEGORIES = [
  "שכירות",
  "חשבונות",
  "שיווק ופרסום",
  "שכר עבודה",
  "תוכנות ומנויים",
  "אריזה ואספקה",
  "מסים ואגרות",
  "עמלות סליקה",
  "ביטוח",
  "אחר"
];

const MONTHS_HEB = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

export default function MonthlyExpensesTab() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [showDialog, setShowDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formData, setFormData] = useState({
    type: "fixed",
    category: "",
    description: "",
    amount: "",
    recurrence: "single",
    selectedMonths: []
  });
  
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadExpenses();
  }, [selectedMonth]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      // Load all expenses and filter client-side to include recurring ones
      const allExpenses = await MonthlyExpense.list();
      const [selectedYear, selectedMonthNum] = selectedMonth.split("-");
      
      const relevantExpenses = (allExpenses || []).filter((e) => {
        // Single month expense
        if (e.recurrence === "single" || !e.recurrence) {
          return e.month === selectedMonth;
        }
        // Full year expense
        if (e.recurrence === "full_year") {
          return e.year === Number(selectedYear);
        }
        // Custom months
        if (e.recurrence === "custom" && Array.isArray(e.apply_to_months)) {
          return e.apply_to_months.includes(selectedMonth);
        }
        return false;
      });
      
      setExpenses(relevantExpenses);
    } catch (e) {
      console.error("Error loading expenses:", e);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    const newDate = direction === "prev" ? subMonths(date, 1) : addMonths(date, 1);
    setSelectedMonth(format(newDate, "yyyy-MM"));
  };

  const openAddDialog = () => {
    setEditingExpense(null);
    setFormData({ 
      type: "fixed", 
      category: "", 
      description: "", 
      amount: "",
      recurrence: "single",
      selectedMonths: []
    });
    setShowDialog(true);
  };

  const openEditDialog = (expense) => {
    setEditingExpense(expense);
    setFormData({
      type: expense.type,
      category: expense.category,
      description: expense.description || "",
      amount: expense.amount.toString(),
      recurrence: expense.recurrence || "single",
      selectedMonths: expense.apply_to_months || []
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.category || !formData.amount) {
      alert("יש למלא קטגוריה וסכום");
      return;
    }
    if (formData.recurrence === "custom" && formData.selectedMonths.length === 0) {
      alert("יש לבחור לפחות חודש אחד");
      return;
    }
    setSaving(true);
    try {
      const [selectedYear] = selectedMonth.split("-");
      
      const expenseData = {
        type: formData.type,
        category: formData.category,
        description: formData.description,
        amount: Number(formData.amount),
        recurrence: formData.recurrence
      };

      // Set month/year/apply_to_months based on recurrence
      if (formData.recurrence === "single") {
        expenseData.month = selectedMonth;
        expenseData.year = null;
        expenseData.apply_to_months = null;
      } else if (formData.recurrence === "full_year") {
        expenseData.month = null;
        expenseData.year = Number(selectedYear);
        expenseData.apply_to_months = null;
      } else if (formData.recurrence === "custom") {
        expenseData.month = null;
        expenseData.year = Number(selectedYear);
        expenseData.apply_to_months = formData.selectedMonths;
      }

      if (editingExpense) {
        await MonthlyExpense.update(editingExpense.id, expenseData);
      } else {
        await MonthlyExpense.create(expenseData);
      }
      await loadExpenses();
      setShowDialog(false);
    } catch (e) {
      console.error("Error saving expense:", e);
      alert("שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const toggleMonth = (monthStr) => {
    setFormData((prev) => {
      const exists = prev.selectedMonths.includes(monthStr);
      return {
        ...prev,
        selectedMonths: exists
          ? prev.selectedMonths.filter((m) => m !== monthStr)
          : [...prev.selectedMonths, monthStr]
      };
    });
  };

  const handleDelete = async (expenseId) => {
    if (!confirm("למחוק את ההוצאה?")) return;
    try {
      await MonthlyExpense.delete(expenseId);
      await loadExpenses();
    } catch (e) {
      console.error("Error deleting expense:", e);
    }
  };

  // Calculate totals
  const totals = useMemo(() => {
    const fixed = expenses
      .filter((e) => e.type === "fixed")
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const variable = expenses
      .filter((e) => e.type === "variable")
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return { fixed, variable, total: fixed + variable };
  }, [expenses]);

  // Group by type
  const fixedExpenses = expenses.filter((e) => e.type === "fixed");
  const variableExpenses = expenses.filter((e) => e.type === "variable");

  const [year, month] = selectedMonth.split("-").map(Number);
  const monthDate = new Date(year, month - 1, 1);
  const monthName = format(monthDate, "MMMM yyyy", { locale: he });

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <h2 className="text-xl font-semibold text-stone-800">{monthName}</h2>
        <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Repeat className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600">הוצאות קבועות</p>
                <p className="text-xl font-bold text-blue-800">₪{totals.fixed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-amber-600">הוצאות משתנות</p>
                <p className="text-xl font-bold text-amber-800">₪{totals.variable.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-red-600">סה״כ הוצאות</p>
                <p className="text-xl font-bold text-red-800">₪{totals.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <Button onClick={openAddDialog} className="gap-2">
          <Plus className="w-4 h-4" />
          הוסף הוצאה
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-stone-500">
            <Receipt className="w-12 h-12 mx-auto mb-4 text-stone-300" />
            <p>אין הוצאות לחודש זה</p>
            <p className="text-sm">לחצי על "הוסף הוצאה" להתחיל</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fixed Expenses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Repeat className="w-5 h-5 text-blue-600" />
                הוצאות קבועות ({fixedExpenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fixedExpenses.length === 0 ? (
                <p className="text-sm text-stone-500 p-4">אין הוצאות קבועות</p>
              ) : (
                <div className="divide-y">
                  {fixedExpenses.map((expense) => (
                    <div key={expense.id} className="p-4 hover:bg-stone-50 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{expense.category}</Badge>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-stone-500 mt-1">{expense.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-blue-700">₪{expense.amount.toLocaleString()}</span>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(expense)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Variable Expenses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                הוצאות משתנות ({variableExpenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {variableExpenses.length === 0 ? (
                <p className="text-sm text-stone-500 p-4">אין הוצאות משתנות</p>
              ) : (
                <div className="divide-y">
                  {variableExpenses.map((expense) => (
                    <div key={expense.id} className="p-4 hover:bg-stone-50 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{expense.category}</Badge>
                          {expense.recurrence === "full_year" && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs">כל השנה</Badge>
                          )}
                          {expense.recurrence === "custom" && (
                            <Badge className="bg-teal-100 text-teal-700 text-xs">
                              {expense.apply_to_months?.length} חודשים
                            </Badge>
                          )}
                        </div>
                        {expense.description && (
                          <p className="text-sm text-stone-500 mt-1">{expense.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-amber-700">₪{expense.amount.toLocaleString()}</span>
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(expense)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "עריכת הוצאה" : "הוספת הוצאה חדשה"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>סוג הוצאה</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-blue-600" />
                      קבועה
                    </div>
                  </SelectItem>
                  <SelectItem value="variable">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-600" />
                      משתנה
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>קטגוריה</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>סכום (₪)</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>

            <div>
              <Label>תדירות</Label>
              <Select value={formData.recurrence} onValueChange={(v) => setFormData((p) => ({ ...p, recurrence: v, selectedMonths: [] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">חודש נוכחי בלבד</SelectItem>
                  <SelectItem value="full_year">כל השנה ({currentYear})</SelectItem>
                  <SelectItem value="custom">בחירת חודשים</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.recurrence === "custom" && (
              <div>
                <Label className="mb-2 block">בחר חודשים</Label>
                <div className="grid grid-cols-4 gap-2">
                  {MONTHS_HEB.map((monthName, idx) => {
                    const monthStr = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
                    const isSelected = formData.selectedMonths.includes(monthStr);
                    return (
                      <Button
                        key={monthStr}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={`text-xs ${isSelected ? "bg-teal-600 hover:bg-teal-700" : ""}`}
                        onClick={() => toggleMonth(monthStr)}
                      >
                        {monthName}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-stone-500 mt-2">
                  נבחרו {formData.selectedMonths.length} חודשים
                </p>
              </div>
            )}

            <div>
              <Label>תיאור (אופציונלי)</Label>
              <Textarea
                placeholder="פירוט נוסף..."
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
                ביטול
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingExpense ? "עדכון" : "שמירה"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}