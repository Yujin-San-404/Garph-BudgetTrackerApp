import React from "react";
import { computeBalances, fmt } from "../lib/finance.js";
import { startOfMonth, addMonths, PERIODS, PERIOD_LABEL } from "../lib/dates.js";

export default function PrintSummary({ vault, now }) {
  const bal = computeBalances(vault.transactions);
  const monthStart = startOfMonth(now), monthEnd = addMonths(monthStart, 1);
  const monthTx = vault.transactions.filter((t) => new Date(t.date) >= monthStart && new Date(t.date) < monthEnd);
  const income = monthTx.filter((t) => t.type === "earned").reduce((s, t) => s + t.amount, 0);
  const spent = monthTx.filter((t) => t.type === "spent").reduce((s, t) => s + t.amount, 0);
  const byCat = {};
  monthTx.filter((t) => t.type === "spent").forEach((t) => { byCat[t.category] = (byCat[t.category] || 0) + t.amount; });

  return (
    <div className="print-only" style={{ padding: 24, color: "#000", background: "#fff", fontFamily: "sans-serif" }}>
      <h1>Garph — Financial Summary</h1>
      <p>{now.toLocaleString(undefined, { month: "long", year: "numeric" })} · {vault.username}</p>
      <h3>Overview</h3>
      <p>Total balance: {fmt(bal.total)} (Digital {fmt(bal.digital)}, Physical {fmt(bal.physical)})</p>
      <p>Income this month: {fmt(income)} · Spent this month: {fmt(spent)} · Savings total: {fmt(vault.savings.total)}</p>
      <h3>Spending by category</h3>
      <ul>{Object.entries(byCat).map(([k, v]) => <li key={k}>{k}: {fmt(v)}</li>)}</ul>
      <h3>Budgets</h3>
      <ul>{PERIODS.map((p) => <li key={p}>{PERIOD_LABEL[p]}: {fmt(vault.budgets[p])}</li>)}</ul>
      <h3>Transactions this month ({monthTx.length})</h3>
      <table border="1" cellPadding="4" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Account</th><th>Amount</th></tr></thead>
        <tbody>{monthTx.slice().reverse().map((t) => (
          <tr key={t.id}><td>{new Date(t.date).toLocaleDateString()}</td><td>{t.type}</td><td>{t.category || "-"}</td><td>{t.account || t.direction || "-"}</td><td>{fmt(t.amount)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
