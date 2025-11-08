
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

export default function OrdersFilters({ filters, onFiltersChange }) {
  const commonTriggerClass = "h-10 border-stone-300 focus:ring-black rounded-none";
  const commonSelectProps = {
    className: "bg-white rounded-none"
  };

  return (
    <div className="flex items-center gap-3">
      <Filter className="w-5 h-5 text-stone-500" />
      
      <Select 
        value={filters.site} 
        onValueChange={(value) => onFiltersChange({ ...filters, site: value })}
      >
        <SelectTrigger className={`${commonTriggerClass} w-32`}>
          <SelectValue placeholder="כל האתרים" />
        </SelectTrigger>
        <SelectContent {...commonSelectProps}>
          <SelectItem value="all">כל האתרים</SelectItem>
          <SelectItem value="us">🇺🇸 ארה״ב</SelectItem>
          <SelectItem value="eu">🇪🇺 אירופה</SelectItem>
          <SelectItem value="uk">🇬🇧 בריטניה</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.status} 
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className={`${commonTriggerClass} w-40`}>
          <SelectValue placeholder="כל הסטטוסים" />
        </SelectTrigger>
        <SelectContent {...commonSelectProps}>
          <SelectItem value="all">כל הסטטוסים</SelectItem>
          <SelectItem value="pending">ממתין</SelectItem>
          <SelectItem value="ordered">הוזמן</SelectItem>
          <SelectItem value="warehouse">במחסן</SelectItem>
          <SelectItem value="shipping_to_israel">בדרך לישראל</SelectItem>
          <SelectItem value="in_israel">בארץ</SelectItem>
          <SelectItem value="shipping_to_customer">בדרך ללקוחה</SelectItem>
          <SelectItem value="delivered">נמסר</SelectItem>
        </SelectContent>
      </Select>

      <Select 
        value={filters.dateRange} 
        onValueChange={(value) => onFiltersChange({ ...filters, dateRange: value })}
      >
        <SelectTrigger className={`${commonTriggerClass} w-36`}>
          <SelectValue placeholder="כל הזמנים" />
        </SelectTrigger>
        <SelectContent {...commonSelectProps}>
          <SelectItem value="all">כל הזמנים</SelectItem>
          <SelectItem value="7">שבוע אחרון</SelectItem>
          <SelectItem value="30">חודש אחרון</SelectItem>
          <SelectItem value="90">3 חודשים</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
