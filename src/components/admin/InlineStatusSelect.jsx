import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InlineStatusSelect({ value, onChange, disabled = false, className = "", options }) {
  const defaultOptions = [
    { value: "pending", label: "ממתין" },
    { value: "ordered", label: "הוזמן" },
    { value: "warehouse", label: "במחסן" },
    { value: "shipping_to_israel", label: "בדרך לישראל" },
    { value: "in_israel", label: "בארץ" },
    { value: "shipping_to_customer", label: "בדרך ללקוחה" },
    { value: "delivered", label: "נמסר" }
  ];
  const opts = options && options.length ? options : defaultOptions;

  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-8 w-[170px]">
          <SelectValue placeholder="בחרי סטטוס" />
        </SelectTrigger>
        <SelectContent>
          {opts.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}