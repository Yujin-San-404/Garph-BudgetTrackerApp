import test from "node:test";
import assert from "node:assert/strict";
import { dateKey, parseLocalDate, periodKey } from "../src/lib/dates.js";
import {
  auditFinancialData,
  budgetRemaining,
  computeBalances,
  defaultVault,
  processPeriods,
  recordSuccessfulOpen,
  resolveRecurringNotification,
  validateTransaction,
} from "../src/lib/finance.js";

function catchUpVault() {
  const vault = defaultVault("test");
  vault.budgets = { daily: 0, weekly: 2000, monthly: 8000 };
  vault.autoSavings = { daily: false, weekly: true, monthly: true };
  vault.budgetHistory = [{
    effectiveAt: new Date(2026, 7, 1).toISOString(),
    budgets: { ...vault.budgets },
    autoSavings: { ...vault.autoSavings },
  }];
  vault.transactions = [
    { id: "income", type: "earned", amount: 10000, account: "digital" },
    { id: "week-one-expense", type: "spent", amount: 1500, account: "digital", date: new Date(2026, 8, 2, 12).toISOString() },
  ];
  vault.periodTracking = {
    daily: "2026-08-31",
    weekly: "2026-08-31",
    monthly: "2026-8",
  };
  return vault;
}

test("catches up weekly savings once and subtracts it from the monthly allocation", () => {
  const now = new Date(2026, 8, 29, 12);
  const initial = catchUpVault();
  const originalBalance = computeBalances(initial.transactions).total;
  const processed = processPeriods(initial, now);
  const weekly = processed.savings.history.filter((entry) => entry.period === "weekly");

  assert.equal(weekly.length, 4);
  assert.equal(weekly.find((entry) => entry.periodId === "weekly-2026-08-31").amount, 500);
  assert.equal(weekly.reduce((sum, entry) => sum + entry.amount, 0), 6500);
  assert.equal(processed.savings.total, 6500);
  assert.equal(computeBalances(processed.transactions).total, originalBalance);
  assert.deepEqual(processed.auditIssues, []);

  const repeated = processPeriods(processed, new Date(2026, 8, 29, 13));
  assert.equal(repeated.savings.history.length, processed.savings.history.length);
  assert.equal(repeated.savings.total, processed.savings.total);

  const monthClosed = processPeriods(repeated, new Date(2026, 9, 1, 12));
  assert.equal(monthClosed.savings.history.some((entry) => entry.period === "monthly" && entry.allocationMonthId === "monthly-2026-09"), false);
  assert.ok(monthClosed.finalizedPeriods.includes("monthly-2026-09"));
  assert.equal(monthClosed.savings.total, 6500);
  assert.equal(computeBalances(monthClosed.transactions).total, originalBalance);
});

test("saved allocations are reserved from spending and capped by actual cash", () => {
  const vault = defaultVault("cash-cap");
  vault.transactions = [{ id: "income", type: "earned", amount: 5000, account: "digital" }];
  vault.budgets = { daily: 0, weekly: 0, monthly: 8000 };
  vault.autoSavings = { daily: false, weekly: false, monthly: true };
  vault.periodTracking = { daily: "2026-08-31", weekly: "2026-08-31", monthly: "2026-7" };
  const result = processPeriods(vault, new Date(2026, 8, 1, 12));

  assert.equal(result.savings.total, 5000);
  assert.equal(computeBalances(result.transactions).total, 5000);
  assert.ok(validateTransaction(result, { type: "spent", account: "digital", amount: 1 }));
  assert.equal(validateTransaction(result, { type: "transfer", direction: "d2p", amount: 5000 }), null);
});

test("catch-up respects historical auto-savings enablement changes", () => {
  const vault = defaultVault("savings-setting-history");
  vault.transactions = [{ id: "income", type: "earned", amount: 5000, account: "digital" }];
  vault.budgets = { daily: 0, weekly: 1000, monthly: 0 };
  vault.autoSavings = { daily: false, weekly: true, monthly: false };
  vault.periodTracking = { daily: "2026-07-27", weekly: "2026-07-27", monthly: "2026-6" };
  vault.budgetHistory = [
    { effectiveAt: new Date(2026, 6, 1).toISOString(), budgets: vault.budgets, autoSavings: { daily: false, weekly: true, monthly: false } },
    { effectiveAt: new Date(2026, 7, 12).toISOString(), budgets: vault.budgets, autoSavings: { daily: false, weekly: false, monthly: false } },
  ];

  const result = processPeriods(vault, new Date(2026, 7, 17, 12));
  const weeklyIds = result.savings.history.filter((entry) => entry.period === "weekly").map((entry) => entry.periodId);
  assert.deepEqual(weeklyIds.sort(), ["weekly-2026-07-27", "weekly-2026-08-03"]);
});

test("audit flags duplicate period IDs and prevents more finalization", () => {
  const vault = defaultVault("audit");
  vault.transactions = [{ id: "income", type: "earned", amount: 1000, account: "digital" }];
  vault.savings = {
    total: 200,
    history: ["one", "two"].map((id) => ({
      id,
      periodId: "weekly-2026-08-31",
      sourcePeriodIds: ["weekly-2026-08-31"],
      allocationMonthId: "monthly-2026-09",
      amount: 100,
      period: "weekly",
      budgetAmount: 1000,
      spentAmount: 0,
      date: "2026-09-07T00:00:00.000Z",
    })),
  };
  vault.finalizedPeriods = ["weekly-2026-08-31"];
  vault.periodTracking = { daily: "2026-08-31", weekly: "2026-08-31", monthly: "2026-8" };
  const result = processPeriods(vault, new Date(2026, 8, 29, 12));

  assert.ok(auditFinancialData(vault).some((issue) => issue.startsWith("duplicate-savings-period:")));
  assert.ok(result.auditIssues.some((issue) => issue.startsWith("duplicate-savings-period:")));
  assert.equal(result.savings.history.length, 2);
});

test("inactivity notification reflects catch-up and does not change money", () => {
  const vault = catchUpVault();
  vault.lastOpenedDate = "2026-09-01";
  vault.settings.inactivityDays = 7;
  const now = new Date(2026, 8, 29, 12);
  const caughtUp = processPeriods(vault, now);
  const originalBalance = computeBalances(caughtUp.transactions).total;
  const opened = recordSuccessfulOpen(caughtUp, now);
  const summaryNotice = opened.notifications.find((notification) => notification.type === "inactivity-summary");

  assert.ok(summaryNotice);
  assert.equal(summaryNotice.summary.daysAway, 28);
  assert.equal(summaryNotice.summary.weeklyPeriods, 4);
  assert.equal(summaryNotice.summary.expensesCount, 1);
  assert.equal(summaryNotice.summary.expensesTotal, 1500);
  assert.equal(summaryNotice.summary.savingsRecorded, 6500);
  assert.equal(summaryNotice.summary.monthlyRemaining, 0);
  assert.equal(computeBalances(opened.transactions).total, originalBalance);
  assert.equal(recordSuccessfulOpen(opened, new Date(2026, 8, 29, 13)).notifications.filter((notification) => notification.type === "inactivity-summary").length, 1);
  const read = resolveRecurringNotification(opened, summaryNotice.id, "read", now);
  assert.equal(read.notifications.find((notification) => notification.id === summaryNotice.id).status, "read");
  assert.equal(computeBalances(read.transactions).total, originalBalance);

  const disabled = catchUpVault();
  disabled.lastOpenedDate = "2026-09-01";
  disabled.settings.inactivitySummaryEnabled = false;
  assert.equal(recordSuccessfulOpen(disabled, now).notifications.length, 0);
});

test("date-only scheduling uses local calendar days across UTC offsets", () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ["America/Los_Angeles", "UTC", "Asia/Manila"]) {
      process.env.TZ = timezone;
      const selected = parseLocalDate("2026-09-29");
      assert.equal(dateKey(selected), "2026-09-29");
      assert.equal(selected.getDate(), 29);
      assert.equal(periodKey("weekly", selected), "2026-09-28");
      const vault = defaultVault("boundary");
      vault.recurringIncome = [{
        id: "weekly-date",
        amount: 1000,
        frequency: "weekly",
        startDate: "2026-09-29",
        account: "digital",
        enabled: true,
      }];
      const beforeMidnight = processPeriods(vault, new Date(2026, 8, 28, 23, 59, 59, 999));
      assert.equal(beforeMidnight.notifications.length, 0);
      const onDate = processPeriods(beforeMidnight, new Date(2026, 8, 29, 0, 0));
      assert.equal(onDate.notifications.length, 1);
      assert.equal(dateKey(new Date(onDate.notifications[0].scheduledDate)), "2026-09-29");
      const afterMidnight = processPeriods(onDate, new Date(2026, 8, 29, 0, 1));
      assert.equal(afterMidnight.notifications.length, 1);
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test("weekly and monthly period keys change on local boundaries", () => {
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    assert.notEqual(periodKey("weekly", new Date(2026, 7, 30, 23, 59)), periodKey("weekly", new Date(2026, 7, 31, 0, 0)));
    assert.notEqual(periodKey("monthly", new Date(2026, 8, 30, 23, 59)), periodKey("monthly", new Date(2026, 9, 1, 0, 0)));
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test("daily savings spanning a month boundary are deducted from their source week", () => {
  const vault = defaultVault("cross-month");
  vault.budgets = { daily: 100, weekly: 2000, monthly: 8000 };
  vault.autoSavings = { daily: true, weekly: true, monthly: true };
  vault.transactions = [
    { id: "income", type: "earned", amount: 5000, account: "digital" },
    { id: "expense", type: "spent", amount: 150, account: "digital", date: new Date(2026, 8, 2, 12).toISOString() },
  ];
  vault.periodTracking = { daily: "2026-08-31", weekly: "2026-08-31", monthly: "2026-8" };
  const result = processPeriods(vault, new Date(2026, 8, 8, 12));
  const week = result.savings.history.find((entry) => entry.periodId === "weekly-2026-08-31");
  const dailyInWeek = result.savings.history
    .filter((entry) => entry.period === "daily" && entry.weekPeriodId === "weekly-2026-08-31")
    .reduce((sum, entry) => sum + entry.amount, 0);

  assert.ok(week);
  assert.equal(dailyInWeek, 600);
  assert.equal(week.amount, 1250);
  assert.ok(dailyInWeek + week.amount <= 2000 - 150);
  assert.deepEqual(result.auditIssues, []);
});

test("upgrades legacy UTC-shifted period keys without finalizing the wrong week", () => {
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = "Asia/Manila";
    const vault = defaultVault("legacy-date-key");
    vault.periodTrackingVersion = undefined;
    vault.periodTracking = { daily: "2026-09-06", weekly: "2026-09-06", monthly: "2026-8" };
    const result = processPeriods(vault, new Date(2026, 8, 8, 12));
    assert.equal(result.periodTracking.daily, "2026-09-08");
    assert.equal(result.periodTracking.weekly, "2026-09-07");
    assert.ok(result.finalizedPeriods.includes("daily-2026-09-07"));
    assert.equal(result.finalizedPeriods.includes("weekly-2026-08-31"), false);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test("inactivity threshold counts local calendar dates across midnight", () => {
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = "America/Los_Angeles";
    const vault = defaultVault("midnight");
    vault.lastOpenedDate = "2026-09-28";
    vault.settings.inactivityDays = 1;
    const beforeMidnight = recordSuccessfulOpen(vault, new Date(2026, 8, 28, 23, 59));
    assert.equal(beforeMidnight.notifications.length, 0);
    const afterMidnight = recordSuccessfulOpen(beforeMidnight, new Date(2026, 8, 29, 0, 1));
    assert.equal(afterMidnight.notifications.filter((notice) => notice.type === "inactivity-summary").length, 1);
    assert.equal(afterMidnight.notifications[0].summary.daysAway, 1);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test("monthly day-31 schedule clamps to February end and remains unique", () => {
  const vault = defaultVault("monthly-date");
  vault.recurringIncome = [{
    id: "month-end",
    amount: 8000,
    frequency: "monthly",
    dayOfMonth: 31,
    startDate: "2026-01-31",
    account: "digital",
    enabled: true,
    lastNotified: new Date(2026, 0, 31).toISOString(),
  }];
  const before = processPeriods(vault, new Date(2026, 1, 27, 23, 59));
  assert.equal(before.notifications.length, 0);
  const onDay = processPeriods(before, new Date(2026, 1, 28, 0, 0));
  assert.equal(onDay.notifications.length, 1);
  assert.equal(dateKey(new Date(onDay.notifications[0].scheduledDate)), "2026-02-28");
  assert.equal(onDay.notifications[0].id, "month-end-monthly-2026-02");
  assert.equal(processPeriods(onDay, new Date(2026, 1, 28, 23, 59)).notifications.length, 1);
});