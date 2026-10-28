import React, { useMemo, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Panel } from "./ui.jsx";
import { fmt } from "../lib/finance.js";
import { startOfMonth, addMonths } from "../lib/dates.js";

export default function AnalyticsView({ theme, vault, now }) {
  const [mode, setMode] = useState("line");
  const monthStart = startOfMonth(now);
  const monthEnd = addMonths(monthStart, 1);

  const daily = useMemo(() => {
    const days = Math.round((monthEnd - monthStart) / 86400000);
    const arr = Array.from({ length: days }, (_, i) => ({ day: i + 1, amount: 0 }));
    vault.transactions.forEach((t) => {
      if (t.type !== "spent") return;
      const d = new Date(t.date);
      if (d >= monthStart && d < monthEnd) arr[d.getDate() - 1].amount += t.amount;
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault.transactions, now]);

  const byCategory = useMemo(() => {
    const map = {};
    vault.transactions.forEach((t) => {
      if (t.type !== "spent") return;
      const d = new Date(t.date);
      if (d >= monthStart && d < monthEnd) map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault.transactions, now]);

  const colors = [theme.accent, "#34d399", "#fbbf24", "#a78bfa", "#fb7185", "#64748b"];

  const chip = (id, label) => (
    <div onClick={() => setMode(id)} style={{
      padding: "8px 14px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontFamily: theme.sans,
      border: `1px solid ${mode === id ? theme.accent : theme.border}`, background: mode === id ? `${theme.accent}22` : "transparent", color: theme.text,
    }}>{label}</div>
  );

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ fontFamily: theme.sans, fontSize: 18, marginBottom: 16 }}>Analytics — {now.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{chip("line", "Line")}{chip("bar", "Bar")}{chip("donut", "Category")}</div>
      <Panel theme={theme} style={{ padding: 16, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === "line" ? (
            <LineChart data={daily}>
              <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={theme.muted} fontSize={11} />
              <YAxis stroke={theme.muted} fontSize={11} />
              <Tooltip contentStyle={{ background: theme.bg, border: `1px solid ${theme.border}` }} formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="amount" stroke={theme.accent} strokeWidth={2} dot={false} />
            </LineChart>
          ) : mode === "bar" ? (
            <BarChart data={daily}>
              <CartesianGrid stroke={theme.border} strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke={theme.muted} fontSize={11} />
              <YAxis stroke={theme.muted} fontSize={11} />
              <Tooltip contentStyle={{ background: theme.bg, border: `1px solid ${theme.border}` }} formatter={(v) => fmt(v)} />
              <Bar dataKey="amount" fill={theme.accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={100} label={(e) => e.name}>
                {byCategory.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: theme.bg, border: `1px solid ${theme.border}` }} formatter={(v) => fmt(v)} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
