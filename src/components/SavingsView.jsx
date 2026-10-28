import React from "react";
import { Panel } from "./ui.jsx";
import { fmt } from "../lib/finance.js";
import { PERIOD_LABEL } from "../lib/dates.js";

export default function SavingsView({ theme, vault }) {
  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ fontFamily: theme.sans, fontSize: 18, marginBottom: 16 }}>Savings</div>
      <Panel theme={theme} style={{ padding: 24, textAlign: "center", marginBottom: 16, boxShadow: theme.glow }}>
        <div style={{ fontSize: 12, color: theme.muted, fontFamily: theme.sans }}>SAVINGS ALLOCATED</div>
        <div style={{ fontFamily: theme.mono, fontSize: 34, marginTop: 8 }}>{fmt(vault.savings.total)}</div>
      </Panel>
      <Panel theme={theme} style={{ padding: 4 }}>
        {vault.savings.history.length === 0 && <div style={{ padding: 20, textAlign: "center", color: theme.muted, fontFamily: theme.sans, fontSize: 13 }}>No savings events yet — they appear when a budget period ends under-spent.</div>}
        {vault.savings.history.map((h) => (
          <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderBottom: `1px solid ${theme.border}`, fontFamily: theme.sans, fontSize: 13 }}>
            <span>{PERIOD_LABEL[h.period]} · {new Date(h.date).toLocaleDateString()}</span>
            <span style={{ fontFamily: theme.mono, color: "#34d399" }}>+{fmt(h.amount)}</span>
          </div>
        ))}
      </Panel>
    </div>
  );
}
