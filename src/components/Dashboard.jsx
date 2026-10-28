import React, { useMemo, useState } from "react";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import { computeBalances, spentInRange, budgetRemaining, fmt } from "../lib/finance.js";
import { periodRange, fmtDuration, PERIOD_LABEL, PERIODS } from "../lib/dates.js";
import Circle from "./Circle.jsx";
import { Panel } from "./ui.jsx";

const ORBIT_SLOTS = ["top", "upper-right", "lower-right", "lower-left", "upper-left"];

export default function Dashboard({ theme, vault, now, onSelectTab }) {
  const [activeId, setActiveId] = useState("total");
  const [detailId, setDetailId] = useState(null);
  const [budgetPeriod, setBudgetPeriod] = useState("monthly");
  const bal = useMemo(() => computeBalances(vault.transactions), [vault.transactions]);
  const budgets = useMemo(() => Object.fromEntries(PERIODS.map((type) => {
    const [start, end] = periodRange(type, now);
    const spent = spentInRange(vault.transactions, start, end);
    const amount = vault.budgets[type] || 0;
    return [type, {
      amount,
      spent,
      remaining: budgetRemaining(vault, type, now),
      percent: amount > 0 ? Math.min(100, Math.round((spent / amount) * 100)) : 0,
      timeLeft: fmtDuration(end - now),
    }];
  })), [vault.transactions, vault.budgets, vault.savings, now]);

  const [monthStart, monthEnd] = periodRange("monthly", now);
  const savingsThisMonth = vault.savings.history
    .filter((event) => new Date(event.date) >= monthStart && new Date(event.date) < monthEnd)
    .reduce((sum, event) => sum + event.amount, 0);
  const monthlyBudget = budgets.monthly;
  const metrics = [
    { id: "total", label: "TOTAL BALANCE", value: bal.total, description: "All available money", support: `${vault.transactions.length} recorded transactions` },
    { id: "savings", label: "SAVINGS", value: vault.savings.total, description: "Budget surplus allocated", support: `+${fmt(savingsThisMonth)} this period` },
    { id: "digital", label: "DIGITAL", value: bal.digital, description: "Wallets and digital funds", support: "Computed from transaction history" },
    { id: "physical", label: "PHYSICAL", value: bal.physical, description: "Cash currently held", support: "Computed from transaction history" },
    { id: "budget", label: "AVAILABLE BUDGET", value: monthlyBudget.remaining, description: "Monthly budget remaining", support: `${monthlyBudget.percent}% used`, progress: monthlyBudget.percent },
    { id: "spending", label: "SPENDING", value: monthlyBudget.spent, description: "Spent this month", support: `${fmt(monthlyBudget.amount)} monthly allocation`, progress: monthlyBudget.percent },
  ];
  const activeMetric = metrics.find((metric) => metric.id === activeId) || metrics[0];
  const activeIndex = metrics.findIndex((metric) => metric.id === activeMetric.id);
  const orbitMetrics = Array.from({ length: metrics.length - 1 }, (_, index) =>
    metrics[(activeIndex + index + 1) % metrics.length]);
  const transactionsFor = (account) => vault.transactions
    .filter((transaction) => account === "all" || transaction.account === account || transaction.type === "transfer")
    .slice(-5).reverse();
  const selectMetric = (id) => {
    if (id === activeId) {
      setDetailId((current) => current === id ? null : id);
      return;
    }
    setActiveId(id);
    setDetailId(id);
  };

  return (
    <main className={`dashboard ${theme.mode === "jarvis" ? "dashboard--jarvis" : ""} ${theme.reducedMotion ? "dashboard--reduced-motion" : ""}`}>
      <header className="hud-heading">
        <div>
          <div className="hud-kicker">PERSONAL FINANCE SYSTEM</div>
          <h1>Overview</h1>
        </div>
        <div className="hud-status"><span className="hud-status-dot" /> LOCAL VAULT <span className="hud-status-divider">/</span> ACTIVE</div>
      </header>

      <section className="hud-stage" aria-label="Financial metrics orbital display" style={{ "--hud-accent": theme.accent, "--hud-text": theme.text, "--hud-muted": theme.muted, "--hud-border": theme.border, "--hud-panel": theme.panel }}>
        <div className="hud-grid" aria-hidden="true" />
        <div className="hud-crosshair" aria-hidden="true"><span /><span /></div>
        <div className="hud-stage-label hud-stage-label--top">LIVE ACCOUNT PROFILE <span>{String(activeIndex + 1).padStart(2, "0")} / 06</span></div>
        <div className="hud-stage-label hud-stage-label--bottom">SELECT A NODE TO RECONFIGURE DISPLAY</div>
        {orbitMetrics.map((metric, index) => (
          <Circle key={metric.id} {...metric} theme={theme} slot={ORBIT_SLOTS[index]} active={false}
            onClick={selectMetric} />
        ))}
        <Circle {...activeMetric} theme={theme} slot="center" active onClick={selectMetric} />
      </section>

      {detailId && (
        <Panel theme={theme} style={{ padding: 18, marginTop: 18 }}>
          {detailId === "budget" ? (
            <div className="hud-detail">
              <div className="hud-detail-heading">
                <div><div className="hud-kicker">ALLOCATION MONITOR</div><strong>{PERIOD_LABEL[budgetPeriod]} budget</strong></div>
                <span className="hud-detail-time">{budgets[budgetPeriod].timeLeft}</span>
              </div>
              <div className="hud-period-tabs" role="group" aria-label="Budget period">
                {PERIODS.map((period) => (
                  <button key={period} type="button" aria-pressed={budgetPeriod === period} onClick={() => setBudgetPeriod(period)}>
                    {PERIOD_LABEL[period]}
                  </button>
                ))}
              </div>
              <div className="hud-budget-numbers"><span>{fmt(budgets[budgetPeriod].spent)} spent</span><span>{fmt(budgets[budgetPeriod].amount)} allocated</span></div>
              <div className="hud-budget-track"><span style={{ width: `${budgets[budgetPeriod].percent}%`, background: budgets[budgetPeriod].percent >= 100 ? "#fb7185" : theme.accent }} /></div>
              <div className="hud-budget-caption">{budgets[budgetPeriod].percent}% used · {fmt(budgets[budgetPeriod].remaining)} remaining</div>
              <button className="hud-text-action" type="button" onClick={() => onSelectTab("budget")}>Edit budget <ChevronRight size={15} /></button>
            </div>
          ) : detailId === "savings" ? (
            <div className="hud-detail">
              <div className="hud-kicker">SAVINGS LEDGER</div>
              <strong>Recent savings events</strong>
              {vault.savings.history.length === 0 && <div className="hud-empty">No savings recorded yet.</div>}
              {vault.savings.history.slice(0, 5).map((event) => (
                <div className="hud-activity-row" key={event.id}>
                  <span>{PERIOD_LABEL[event.period]} · {new Date(event.date).toLocaleDateString()}</span><span className="hud-positive">+{fmt(event.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="hud-detail">
              <div className="hud-detail-heading">
                <div><div className="hud-kicker">{detailId === "total" ? "ACCOUNT ACTIVITY" : `${detailId.toUpperCase()} ACTIVITY`}</div><strong>{detailId === "total" ? "Recent transactions" : `Recent ${detailId} activity`}</strong></div>
                <button className="hud-text-action" type="button" onClick={() => onSelectTab("transactions")}>All transactions <ArrowUpRight size={14} /></button>
              </div>
              {transactionsFor(detailId === "total" || detailId === "spending" ? "all" : detailId).length === 0 && <div className="hud-empty">No transactions yet.</div>}
              {transactionsFor(detailId === "total" || detailId === "spending" ? "all" : detailId).map((transaction) => (
                <div className="hud-activity-row" key={transaction.id}>
                  <span>{transaction.type === "spent" ? transaction.category : transaction.type} <span className="hud-activity-account">{transaction.account}</span></span>
                  <span className={transaction.type === "spent" ? "hud-negative" : "hud-positive"}>{transaction.type === "spent" ? "-" : "+"}{fmt(transaction.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </main>
  );
}
