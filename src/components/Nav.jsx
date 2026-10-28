import React from "react";
import { Gauge, ArrowLeftRight, Target, PiggyBank, BarChart3, Settings as SettingsIcon } from "lucide-react";

export const NAV = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "budget", label: "Budget", icon: Target },
  { id: "savings", label: "Savings", icon: PiggyBank },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function BottomNav({ theme, tab, setTab }) {
  return (
    <div className="no-print" style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-around", background: theme.bg, borderTop: `1px solid ${theme.border}`, padding: "8px 4px", zIndex: 30 }}>
      {NAV.map((n) => (
        <button key={n.id} onClick={() => setTab(n.id)} style={{ background: "none", border: "none", cursor: "pointer", color: tab === n.id ? theme.accent : theme.muted, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 10, fontFamily: theme.sans, padding: 4 }}>
          <n.icon size={20} /> {n.label}
        </button>
      ))}
    </div>
  );
}
