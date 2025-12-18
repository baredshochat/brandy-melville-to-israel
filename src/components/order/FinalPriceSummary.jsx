import React, {useState, useMemo} from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";

export default function FinalPriceSummary({
  finalPriceILS,
  breakdown,
  userPoints = 0,
  onRedeemPoints,
  redeemedAmount = 0,
  maxRedeemAmount = Infinity,
  ui = {
    freeShippingThresholdILS: 399,      // אפשר לשנות לפי הצורך
    forwarderLabel: "",                 // למשל: "DHL Express · 2–5 ימי עסקים"
    showTaxesAmountInline: false        // אם true מציגים סכום מסים בשורה
  }
}) {
  const [pointsInput, setPointsInput] = useState("");

  const handleRedeemClick = () => {
    const val = parseInt(pointsInput) || 0;
    if (val <= 0) return;
    
    if (val > userPoints) {
      alert(`יש לך רק ${userPoints} נקודות`);
      return;
    }
    
    if (val > maxRedeemAmount) {
      alert(`ניתן לממש מקסימום ${maxRedeemAmount} נקודות בהזמנה זו`);
      return;
    }

    onRedeemPoints(val);
    setPointsInput("");
  };

  const handleRemoveRedeem = () => {
    onRedeemPoints(0);
  };

  // שמירות וסכומים
  const shipCharge = Math.max(0, Math.round(breakdown?.domestic_charge_to_customer ?? 0));
  const shipAbsorb = Math.max(0, Math.round(breakdown?.domestic_absorbed_cost ?? 0));
  const freeShip   = !!breakdown?.freeShippingApplied;

  const taxesTotal = Math.max(0, Math.round(
    (breakdown?.customsILS ?? 0) + (breakdown?.importVAT_ILS ?? 0) + (breakdown?.fixed_fees_ils ?? 0)
  ));

  // התקדמות לסף חינם (מחשבים מול סכום לפני שורת המשלוח)
  const threshold = Number(ui?.freeShippingThresholdILS ?? 0);
  const baseForThreshold = Math.max(0, Math.round(finalPriceILS - shipCharge));
  const remaining = Math.max(0, threshold ? (threshold - baseForThreshold) : 0);
  const progress = threshold ? clamp01(baseForThreshold / threshold) : 0;

  return (
    <section dir="rtl" lang="he" aria-label="סיכום תשלום" style={card()}>
      <h2 style={title()}>מחיר סופי – כולל הכל</h2>
      <p style={subtle()}>אין תוספות בקופה</p>

      <div style={priceRow()}>
        <span style={priceTag()} aria-label={`מחיר סופי ${formatILS(finalPriceILS)}`}>
          {formatILS(finalPriceILS)}
        </span>
      </div>

      {/* שורת משלוח בארץ */}
      <div style={line()}>
        <span>
          משלוח עד הבית: <strong>{formatILS(shipCharge)}</strong>
        </span>
      </div>

      {/* שורת מסים ואגרות */}
      <div style={line()}>
        {ui?.showTaxesAmountInline ? (
          <span title="כולל מע״מ יבוא/אגרות/מכס לפי צורך. אין תשלום לשליח בהגעה.">
            מסים ואגרות יבוא (כלול): <strong>{formatILS(taxesTotal)}</strong> <span aria-hidden>ℹ️</span>
          </span>
        ) : (
          <span title="כולל מע״מ יבוא/אגרות/מכס לפי צורך. אין תשלום לשליח בהגעה.">
            מסים ואגרות יבוא – <strong>כלול במחיר</strong> <span aria-hidden>ℹ️</span>
          </span>
        )}
      </div>

      {/* הצגת נקודות שמומשו */}
      {redeemedAmount > 0 && (
        <div style={{marginTop: 12, background: "#fff1f2", padding: 10, borderRadius: 8, border: "1px dashed #fda4af"}}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <span style={{color: "#be123c", fontWeight: 600, fontSize: 14}}>
              ✨ מימוש {redeemedAmount} נקודות מועדון
            </span>
            <span style={{color: "#be123c", fontWeight: 700, fontSize: 14}}>
              -{formatILS(redeemedAmount)}
            </span>
          </div>
        </div>
        )}
        </section>
  );
}

/* ---------- פריט שורה בפירוט ---------- */
function Row({label, value=0, hint, strong=false}) {
  return (
    <div style={row()}>
      <div>
        <span style={labelStyle(strong)}>{label}</span>
        {hint && <span style={hintStyle()}> · {hint}</span>}
      </div>
      <div style={valueStyle(strong)}>{formatILS(value)}</div>
    </div>
  );
}

/* ---------- עזר ---------- */
function formatILS(n) {
  const v = Number(n || 0);
  return `₪${v.toLocaleString("he-IL", {maximumFractionDigits: 0})}`;
}
function clamp01(x){ return Math.max(0, Math.min(1, x)); }

/* ---------- "CSS" אינליין מינימלי ---------- */
const card = () => ({
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
  maxWidth: 520,
  margin: "12px auto",
  textAlign: "right",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
});
const title = () => ({fontSize: 18, margin: "0 0 4px", fontWeight: 700});
const subtle = () => ({fontSize: 12, color: "#6b7280", margin: 0});
const priceRow = () => ({display: "flex", alignItems: "baseline", gap: 8, marginTop: 8});
const priceTag = () => ({fontSize: 32, fontWeight: 800, letterSpacing: "0.3px"});
const line = () => ({marginTop: 8, fontSize: 14});
const pill = (kind) => ({
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 999,
  background: kind==="success" ? "#e8fff1" : "#f3f4f6",
  color: kind==="success" ? "#065f46" : "#111827",
  border: "1px solid " + (kind==="success" ? "#bbf7d0" : "#e5e7eb"),
  fontWeight: 600,
  fontSize: 13
});
const progressWrap = () => ({
  width: "100%", height: 8, background: "#f1f5f9",
  borderRadius: 999, overflow: "hidden"
});
const progressBar = (p) => ({
  width: `${Math.round(p*100)}%`,
  height: "100%",
  background: "linear-gradient(90deg,#22c55e,#86efac)"
});
const progressText = () => ({fontSize: 12, color: "#64748b", marginTop: 6});
const toggleBtn = () => ({
  marginTop: 12, background: "#f8fafc", border: "1px solid #e2e8f0",
  borderRadius: 10, padding: "8px 10px", cursor: "pointer", fontWeight: 600
});
const detailsBox = () => ({
  marginTop: 10, background: "#fafafa", border: "1px dashed #e5e7eb",
  borderRadius: 12, padding: 12
});
const row = () => ({display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0"});
const labelStyle = (strong=false) => ({fontSize: strong?15:14, fontWeight: strong?700:600});
const valueStyle = (strong=false) => ({fontSize: strong?16:14, fontWeight: strong?800:700});
const hintStyle = () => ({fontSize: 12, color: "#6b7280", marginInlineStart: 6});
const hr = () => ({border: 0, borderTop: "1px solid #e5e7eb", margin: "8px 0"});