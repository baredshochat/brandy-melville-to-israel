
import React, { useState, useEffect } from "react";
import { OrderStatusSteps } from "@/entities/OrderStatusSteps";
import { User } from "@/entities/User";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Clock, ListOrdered, Type, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function StatusSettings() {
  const [statusSteps, setStatusSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await User.me();
        if (user.role !== 'admin') {
          window.location.href = createPageUrl('Home');
          return;
        }
        setUserRole(user.role);
        fetchStatusSteps();
      } catch (error) {
        window.location.href = createPageUrl('Home');
      }
    };
    checkAccess();
  }, []);

  const fetchStatusSteps = async () => {
    setLoading(true);
    try {
      const steps = await OrderStatusSteps.list();
      
      // Remove duplicates by keeping only the latest record for each status_key
      const uniqueSteps = [];
      const seenStatusKeys = new Set();
      
      // Sort by created_date descending to get the latest records first
      const sortedSteps = steps.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      
      for (const step of sortedSteps) {
        if (!seenStatusKeys.has(step.status_key)) {
          uniqueSteps.push(step);
          seenStatusKeys.add(step.status_key);
        }
      }
      
      // Sort by step_number to ensure correct display order
      setStatusSteps(uniqueSteps.sort((a, b) => a.step_number - b.step_number));
    } catch (error) {
      console.error("Error fetching status steps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const step of statusSteps) {
        await OrderStatusSteps.update(step.id, {
          label: step.label,
          step_number: step.step_number,
          estimated_days_remaining: step.estimated_days_remaining,
          time_range_text: step.time_range_text
        });
      }
      alert("שלבי הסטטוס עודכנו בהצלחה!");
    } catch (error) {
      alert("שגיאה בעדכון שלבי הסטטוס.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (index, field, value) => {
    setStatusSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, [field]: value } : step
    ));
  };

  if (userRole !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-900 mx-auto mb-4"></div>
          <p className="text-stone-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-stone-400"/></div>;
  }

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-stone-50 min-h-screen pb-12"
    >
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
            <h1 className="text-4xl font-semibold text-stone-900">הגדרות שלבי סטטוס הזמנה</h1>
            <p className="text-stone-600 mt-2">עריכת השלבים וזמני המשלוח המשוערים המוצגים ללקוחות</p>
        </div>

        <Card className="bg-white border border-stone-200 rounded-none">
            <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-normal text-stone-900 flex items-center gap-2">
                <ListOrdered className="w-6 h-6 text-stone-600" />
                שלבי מעקב ההזמנה
            </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
            {statusSteps.map((step, index) => (
                <div key={step.status_key} className="p-6 bg-stone-50 border border-stone-200 rounded-none">
                <div className="mb-4">
                    <h3 className="font-semibold text-lg text-stone-800 mb-1">
                    שלב {step.step_number}: {step.status_key}
                    </h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                    <Label className="font-medium text-stone-700 flex items-center gap-2 mb-2">
                        <Type className="w-4 h-4 text-stone-500" />
                        תווית המוצגת ללקוח
                    </Label>
                    <Input 
                        value={step.label}
                        onChange={(e) => handleChange(index, 'label', e.target.value)}
                        className="h-12 border-stone-300 text-stone-700 rounded-none"
                    />
                    </div>
                    
                    <div>
                    <Label className="font-medium text-stone-700 flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-stone-500" />
                        ימים משוערים שנותרו
                    </Label>
                    <Input 
                        type="number"
                        value={step.estimated_days_remaining}
                        onChange={(e) => handleChange(index, 'estimated_days_remaining', parseInt(e.target.value) || 0)}
                        className="h-12 border-stone-300 text-stone-700 rounded-none"
                    />
                    </div>
                    
                    <div className="md:col-span-2">
                    <Label className="font-medium text-stone-700 flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-stone-500" />
                        טקסט תיאור זמן (לדוגמה: "2-3 שבועות")
                    </Label>
                    <Input 
                        value={step.time_range_text}
                        onChange={(e) => handleChange(index, 'time_range_text', e.target.value)}
                        placeholder="לדוגמה: 2-3 שבועות"
                        className="h-12 border-stone-300 text-stone-700 rounded-none"
                    />
                    </div>
                </div>
                </div>
            ))}
            
            <Button onClick={handleSave} disabled={saving} className="w-full h-12 bg-black hover:bg-stone-800 text-white font-medium rounded-none">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> שומר...</> : <><Save className="w-4 h-4 mr-2"/> שמירת שינויים</>}
            </Button>
            </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
