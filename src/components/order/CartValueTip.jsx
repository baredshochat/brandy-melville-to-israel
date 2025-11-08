
import React from "react";
import { Lightbulb, PiggyBank, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CartValueTip({ count = 0, onAddAnother }) {
  if (!count || count > 2) return null;
  return (
    <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 flex items-start gap-3 sm:gap-4 mt-2 sm:mt-3">
      <div className="mt-0.5 sm:mt-1">
        <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
      </div>
      <div className="flex-1 text-amber-900">
        <div className="flex items-center gap-2 mb-1">
          <strong>טיפ קטן כדי לחסוך</strong>
          <PiggyBank className="w-4 h-4 text-amber-700" />
        </div>
        <p className="text-xs sm:text-sm">בסל קטן, עלויות הייבוא מתחלקות על מעט פריטים, ולכן המחיר לכל פריט עשוי להיות גבוה. הוספת פריטים נוספים תוריד את המחירים ותהפוך את ההזמנה למשתלמת יותר!

        </p>
        <div className="mt-2">
          <Button
            variant="outline"
            onClick={onAddAnother}
            className="h-9 sm:h-10 border-amber-300 text-amber-900 hover:bg-amber-100">

            <Plus className="w-4 h-4 ml-2" />
            הוספת פריט נוסף
          </Button>
        </div>
      </div>
    </div>);

}