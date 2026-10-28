import React from "react";
import BudgetCard from "./BudgetCard.jsx";
import { PERIODS } from "../lib/dates.js";

export default function BudgetView({ theme, vault, now, onUpdate }) {
  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ fontFamily: theme.sans, fontSize: 18, marginBottom: 16 }}>Budgets</div>
      {PERIODS.map((type) => (
        <BudgetCard key={type} theme={theme} type={type} vault={vault} now={now}
          onSave={(t, v) => onUpdate((d) => {
            d.budgets[t] = v;
            d.budgetHistory ||= [];
            d.budgetHistory.push({ effectiveAt: new Date().toISOString(), budgets: { ...d.budgets }, autoSavings: { ...d.autoSavings } });
          })}
          onToggleAuto={(t, v) => onUpdate((d) => {
            d.autoSavings[t] = v;
            d.budgetHistory ||= [];
            d.budgetHistory.push({ effectiveAt: new Date().toISOString(), budgets: { ...d.budgets }, autoSavings: { ...d.autoSavings } });
          })} />
      ))}
    </div>
  );
}
