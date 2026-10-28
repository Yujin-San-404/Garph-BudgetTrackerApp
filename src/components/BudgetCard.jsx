import React, { useState } from "react";
import { Check } from "lucide-react";
import { Panel, inputStyle } from "./ui.jsx";
import { fmt, spentInRange, budgetRemaining } from "../lib/finance.js";
import { periodRange, fmtDuration, PERIOD_LABEL } from "../lib/dates.js";

export default function BudgetCard({ theme, type, vault, now, onSave, onToggleAuto }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal] = useState(vault.budgets[type]);
  const [start, end] = periodRange(type, now);
  const spent = spentInRange(vault.transactions, start, end);
  const amt = vault.budgets[type] || 0;
  const remaining = budgetRemaining(vault, type, now);
  const pct = amt > 0 ? Math.min(100, Math.round((spent / amt) * 100)) : 0;

  return (
    <Panel theme={theme} style={{ padding: 18, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: theme.sans, fontSize: 14, color: theme.muted, textTransform: "capitalize" }}>{PERIOD_LABEL[type]} budget</div>
        <div style={{ fontSize: 12, color: theme.muted, fontFamily: theme.sans }}>{fmtDuration(end - now)}</div>
      </div>
      {edit ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input value={val} onChange={(e) => setVal(e.target.value.replace(/[^0-9.]/g, ""))} style={{ ...inputStyle(theme), fontFamily: theme.mono }} />
          <button onClick={() => { onSave(type, parseFloat(val) || 0); setEdit(false); }} style={{ background: theme.accent, border: "none", borderRadius: 10, padding: "0 14px", cursor: "pointer" }}><Check size={16} color="#00131a" /></button>
        </div>
      ) : (
        <div onClick={() => setEdit(true)} style={{ fontFamily: theme.mono, fontSize: 26, marginTop: 6, cursor: "pointer" }}>{fmt(amt)}</div>
      )}
      <div style={{ height: 8, borderRadius: 6, background: "rgba(255,255,255,0.06)", marginTop: 12, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct >= 100 ? "#fb7185" : theme.accent }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.muted, marginTop: 6, fontFamily: theme.sans }}>
        <span>{fmt(spent)} spent</span><span>{fmt(Math.max(0, remaining))} remaining</span><span>{pct}%</span>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: theme.muted, fontFamily: theme.sans, cursor: "pointer" }}>
        <input type="checkbox" checked={vault.autoSavings[type]} onChange={(e) => onToggleAuto(type, e.target.checked)} />
        Send unused amount to savings at period end
      </label>
    </Panel>
  );
}
