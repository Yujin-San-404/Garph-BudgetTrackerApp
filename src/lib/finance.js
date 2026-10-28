import { PERIODS, periodKey, periodRange, addDays, advanceDate, dateKey, parseLocalDate, periodStartFromKey, nextPeriodStart, periodId, startOfDay, startOfWeek, startOfMonth, calendarDaysBetween } from "./dates.js";

export const CATEGORIES = ["Food", "School Expense", "Emergency Expense", "Personal", "Transportation", "Others"];

export function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

export function fmt(n) {
  const value = Number(n) || 0;
  return `${value < 0 ? "-" : ""}₱${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function computeBalances(transactions) {
  let digital = 0, physical = 0;
  for (const t of transactions) {
    const amount = Number(t.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (t.type === "earned") { if (t.account === "digital") digital += amount; else if (t.account === "physical") physical += amount; }
    else if (t.type === "spent") { if (t.account === "digital") digital -= amount; else if (t.account === "physical") physical -= amount; }
    else if (t.type === "transfer") {
      if (t.direction === "d2p") { digital -= amount; physical += amount; }
      else if (t.direction === "p2d") { physical -= amount; digital += amount; }
    }
  }
  return { digital, physical, total: digital + physical };
}

export function validateTransaction(vault, transaction) {
  const amount = Number(transaction.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount greater than zero.";

  let source;
  if (transaction.type === "spent") {
    if (transaction.account !== "digital" && transaction.account !== "physical") {
      return "Choose a valid account.";
    }
    source = transaction.account;
  } else if (transaction.type === "transfer") {
    if (transaction.direction === "d2p") source = "digital";
    else if (transaction.direction === "p2d") source = "physical";
    else return "Choose a valid transfer direction.";
  } else if (transaction.type === "earned") {
    if (transaction.account !== "digital" && transaction.account !== "physical") {
      return "Choose a valid account.";
    }
    return null;
  } else {
    return "Choose a valid transaction type.";
  }

  const available = computeBalances(vault.transactions)[source];
  if (amount > available) {
    const accountName = source === "digital" ? "Digital" : "Physical";
    return `Insufficient ${accountName} Funds\nAvailable: ${fmt(available)}\nAttempted: ${fmt(amount)}`;
  }
  if (transaction.type === "spent") {
    const unallocated = computeBalances(vault.transactions).total - (Number(vault.savings?.total) || 0);
    if (amount > unallocated) {
      return `Insufficient available funds after savings allocation\nAvailable to spend: ${fmt(Math.max(0, unallocated))}\nAttempted: ${fmt(amount)}`;
    }
  }
  return null;

}

export function resolveRecurringNotification(vault, id, action, now = new Date()) {
  const notification = vault.notifications?.find((item) => item.id === id);
  if (!notification) return vault;

  if (notification.type === "inactivity-summary") {
    if (!(["pending", "read"].includes(notification.status)) || !["read", "dismiss"].includes(action)) return vault;
    if (action === "read" && notification.status === "read") return vault;
    const updated = JSON.parse(JSON.stringify(vault));
    const resolved = updated.notifications.find((item) => item.id === id);
    resolved.status = action === "read" ? "read" : "dismissed";
    resolved.resolvedAt = now.toISOString();
    return updated;
  }
  if (notification.status !== "pending") return vault;
  if (!["accept", "dismiss"].includes(action)) return vault;

  const amount = Number(notification.amount);
  const account = notification.account || "digital";
  if (action === "accept" && (!Number.isFinite(amount) || amount <= 0 || !["digital", "physical"].includes(account))) return vault;

  const updated = JSON.parse(JSON.stringify(vault));
  const resolved = updated.notifications.find((item) => item.id === id);
  resolved.status = action === "accept" ? "accepted" : "dismissed";
  resolved.resolvedAt = now.toISOString();
  if (action === "accept" && !updated.transactions.some((transaction) => transaction.id === `recurring-${id}`)) {
    updated.transactions.push({
      id: `recurring-${id}`,
      date: resolved.resolvedAt,
      amount,
      type: "earned",
      account,
      note: `Recurring income: ${resolved.label || "budget"}`,
      recurringNotificationId: id,
    });
  }
  return updated;
}

export function spentInRange(transactions, start, end) {
  return transactions
    .filter((t) => t.type === "spent" && new Date(t.date) >= start && new Date(t.date) < end)
    .reduce((sum, transaction) => {
      const amount = Number(transaction.amount);
      return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
    }, 0);
}

export function budgetRemaining(vault, type, now) {
  const [start, end] = periodRange(type, now);
  const spent = spentInRange(vault.transactions || [], start, end);
  const budget = Math.max(0, Number(vault.budgets?.[type]) || 0);
  let allocated = 0;
  if (type === "weekly") {
    const weekId = periodId("weekly", start);
    allocated = (vault.savings?.history || [])
      .filter((entry) => entry.period === "daily" && entry.weekPeriodId === weekId)
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  } else if (type === "monthly") {
    const monthId = periodId("monthly", start);
    allocated = (vault.savings?.history || [])
      .filter((entry) => entry.allocationMonthId === monthId && entry.period !== "monthly")
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  }
  return Math.max(0, budget - spent - allocated);
}

export function defaultVault(username) {
  const budgets = { daily: 150, weekly: 1000, monthly: 4000 };
  const autoSavings = { daily: false, weekly: true, monthly: true };
  return {
    username,
    transactions: [],
    budgets,
    autoSavings,
    recurringIncome: [],
    notifications: [],
    savings: { total: 0, history: [] },
    periodTracking: {},
    periodTrackingVersion: 1,
    finalizedPeriods: [],
    budgetHistory: [{ effectiveAt: new Date().toISOString(), budgets: { ...budgets }, autoSavings: { ...autoSavings } }],
    lastOpenedDate: null,
    settings: {
      theme: "jarvis",
      accent: "#38bdf8",
      fontFamily: "inter",
      fontSize: "normal",
      reducedMotion: false,
      autoLockMinutes: 5,
      biometric: false,
      automaticEarnings: true,
      inactivitySummaryEnabled: true,
      inactivityDays: 7,
    },
  };
}

/**
 * Queue recurring income confirmations + recognize completed-period savings.
 * Pure function: returns a new vault, does not mutate the input.
 */
export function processPeriods(vault, now) {
  const v = JSON.parse(JSON.stringify(vault));
  v.notifications ||= [];
  v.settings ||= {};
  v.recurringIncome ||= [];
  v.transactions ||= [];
  v.savings ||= { total: 0, history: [] };
  v.savings.history ||= [];
  v.periodTracking ||= {};
  v.autoSavings ||= {};
  v.finalizedPeriods ||= [];
  v.budgetHistory ||= [];
  v.transactions = v.transactions.filter((transaction) => !transaction.auto);
  ensureBudgetHistory(v, now);
  normalizeSavingsHistory(v);
  normalizePeriodTracking(v);
  normalizeRecurringDates(v);

  // Track every elapsed schedule, but only create confirmations while enabled.
  for (const rule of v.recurringIncome) {
    if (!rule || !Number.isFinite(Number(rule.amount)) || Number(rule.amount) <= 0 || !rule.startDate) continue;
    let next = rule.lastNotified || rule.lastApplied
      ? nextRecurringDate(new Date(rule.lastNotified || rule.lastApplied), rule)
      : parseLocalDate(rule.startDate);
    let guard = 0;
    while (next <= now && guard < 1000) {
      const eventId = recurringEventId(rule, next);
      if (rule.enabled && v.settings.automaticEarnings !== false &&
          !v.notifications.some((notification) => notification.id === eventId)) {
        v.notifications.unshift({
          id: eventId,
          ruleId: rule.id,
          amount: rule.amount,
          frequency: rule.frequency,
          account: rule.account || "digital",
          label: rule.label || "Recurring budget",
          type: "recurring-budget",
          scheduledDate: next.toISOString(),
          createdAt: now.toISOString(),
          status: "pending",
        });
      }
      rule.lastNotified = next.toISOString();
      next = nextRecurringDate(next, rule);
      guard++;
    }
  }

  // Finalize shorter periods first; containing periods subtract their savings.
  let auditIssues = auditFinancialData(v);
  let blocked = auditIssues.length > 0;
  for (const type of PERIODS) {
    const currentKey = periodKey(type, now);
    const lastKey = v.periodTracking[type];
    const currentStart = periodRange(type, now)[0];
    if (!lastKey || blocked) {
      if (!lastKey) v.periodTracking[type] = currentKey;
      continue;
    }

    let start = periodStartFromKey(type, lastKey);
    let guard = 0;
    while (start < currentStart && guard < 100000) {
      const sourcePeriodId = periodId(type, start);
      if (!v.finalizedPeriods.includes(sourcePeriodId)) {
        const [periodStart, periodEnd] = periodRange(type, start);
        const spent = spentInRange(v.transactions, periodStart, periodEnd);
        const budgetAmount = budgetForPeriod(v, type, periodEnd);
        const allocationMonthId = monthIdForPeriod(type, start);
        const periodSavings = v.savings.history.filter((entry) => entry.allocationMonthId === allocationMonthId);
        const weekPeriodId = periodId("weekly", startOfWeek(start));
        const dailySavingsInWeek = v.savings.history
          .filter((entry) => entry.period === "daily" && entry.weekPeriodId === weekPeriodId)
          .reduce((sum, entry) => sum + entry.amount, 0);
        const smallerSavings = type === "monthly"
          ? periodSavings.filter((entry) => entry.period !== "monthly").reduce((sum, entry) => sum + entry.amount, 0)
          : type === "weekly" ? dailySavingsInWeek : 0;
        let remaining = Math.max(0, budgetAmount - spent - smallerSavings);

        if (type === "daily") {
          const [weekStart, weekEnd] = periodRange("weekly", startOfWeek(start));
          const weeklyBudget = budgetForPeriod(v, "weekly", weekEnd);
          if (weeklyBudget > 0) {
            remaining = Math.min(remaining, Math.max(0, weeklyBudget - spentInRange(v.transactions, weekStart, weekEnd) - dailySavingsInWeek));
          }
        }
        if (type !== "monthly") {
          const [monthStart, monthEnd] = monthRangeFromId(allocationMonthId);
          const monthlyBudget = budgetForPeriod(v, "monthly", monthEnd);
          if (monthlyBudget > 0) {
            const monthlySpent = spentInRange(v.transactions, monthStart, monthEnd);
            const savedThisMonth = periodSavings.reduce((sum, entry) => sum + entry.amount, 0);
            remaining = Math.min(remaining, Math.max(0, monthlyBudget - monthlySpent - savedThisMonth));
          }
        }
        const unallocatedCash = Math.max(0, computeBalances(v.transactions).total - (Number(v.savings.total) || 0));
        remaining = Math.min(remaining, unallocatedCash);

        let addedSavings = null;
        if (autoSavingsForPeriod(v, type, periodEnd) && remaining > 0) {
          addedSavings = {
            id: `savings-${sourcePeriodId}`,
            periodId: sourcePeriodId,
            sourcePeriodIds: [sourcePeriodId],
            allocationMonthId,
            weekPeriodId: type === "daily" || type === "weekly" ? weekPeriodId : undefined,
            date: periodEnd.toISOString(),
            finalizedAt: now.toISOString(),
            amount: remaining,
            period: type,
            budgetAmount,
            spentAmount: spent,
          };
          v.savings.history.unshift(addedSavings);
          v.savings.total += remaining;
        }
        v.finalizedPeriods.push(sourcePeriodId);
        auditIssues = auditFinancialData(v);
        if (auditIssues.length > 0) {
          if (addedSavings) {
            v.savings.history = v.savings.history.filter((entry) => entry !== addedSavings);
            v.savings.total -= addedSavings.amount;
          }
          v.finalizedPeriods = v.finalizedPeriods.filter((id) => id !== sourcePeriodId);
          blocked = true;
          break;
        }
      }
      start = nextPeriodStart(type, start);
      guard++;
    }
    if (!blocked) v.periodTracking[type] = currentKey;
  }
  v.auditIssues = auditIssues;
  return v;
}

export function recordSuccessfulOpen(vault, now) {
  const v = JSON.parse(JSON.stringify(vault));
  v.notifications ||= [];
  v.settings ||= {};
  const today = dateKey(now);
  const previousDate = v.lastOpenedDate;
  const threshold = Math.max(1, Math.floor(Number(v.settings.inactivityDays) || 7));
  if (previousDate && v.settings.inactivitySummaryEnabled !== false) {
    const daysAway = calendarDaysBetween(previousDate, today);
    if (daysAway >= threshold) {
      const notificationId = `inactivity-${previousDate}-${today}`;
      if (!v.notifications.some((item) => item.id === notificationId)) {
        const awayStart = parseLocalDate(previousDate);
        const nowInstant = new Date(now);
        let weeklyPeriods = 0;
        let boundary = nextPeriodStart("weekly", startOfWeek(awayStart));
        while (boundary <= startOfDay(nowInstant)) {
          weeklyPeriods++;
          boundary = nextPeriodStart("weekly", boundary);
        }
        let monthlyPeriods = 0;
        boundary = nextPeriodStart("monthly", startOfMonth(awayStart));
        while (boundary <= startOfDay(nowInstant)) {
          monthlyPeriods++;
          boundary = nextPeriodStart("monthly", boundary);
        }

        const [monthStart, monthEnd] = periodRange("monthly", nowInstant);
        const monthlySpent = spentInRange(v.transactions || [], monthStart, monthEnd);
        const expenses = (v.transactions || []).filter((transaction) =>
          transaction.type === "spent" && new Date(transaction.date) >= awayStart && new Date(transaction.date) <= nowInstant
        );
        const savingsRecorded = (v.savings?.history || [])
          .filter((entry) => new Date(entry.finalizedAt || entry.date) >= awayStart && new Date(entry.finalizedAt || entry.date) <= nowInstant)
          .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

        v.notifications.unshift({
          id: notificationId,
          type: "inactivity-summary",
          status: "pending",
          createdAt: nowInstant.toISOString(),
          summary: {
            daysAway,
            weeklyPeriods,
            monthlyPeriods,
            savingsRecorded,
            expensesCount: expenses.length,
            expensesTotal: expenses.reduce((sum, transaction) => sum + (Number(transaction.amount) || 0), 0),
            monthlyBudget: Math.max(0, Number(v.budgets?.monthly) || 0),
            monthlySpent,
            monthlyRemaining: budgetRemaining(v, "monthly", nowInstant),
          },
        });
      }
    }
  }
  v.lastOpenedDate = today;
  return v;
}

export function auditFinancialData(vault) {
  const issues = [];
  const history = vault.savings?.history || [];
  const ids = new Set();
  const periodIds = new Set();
  const finalized = new Set();
  for (const entry of history) {
    if (ids.has(entry.id)) issues.push(`duplicate-savings-id:${entry.id}`);
    ids.add(entry.id);
    if (!entry.periodId || periodIds.has(entry.periodId)) issues.push(`duplicate-savings-period:${entry.periodId || "missing"}`);
    if (entry.periodId) periodIds.add(entry.periodId);
    if (!Array.isArray(entry.sourcePeriodIds) || entry.sourcePeriodIds.length !== 1 || entry.sourcePeriodIds[0] !== entry.periodId) {
      issues.push(`invalid-savings-period-link:${entry.id}`);
    }
    const amount = Number(entry.amount);
    const budget = Number(entry.budgetAmount);
    const spent = Number(entry.spentAmount);
    if (!Number.isFinite(new Date(entry.date).getTime()) || !Number.isFinite(amount) || amount < 0 || !Number.isFinite(budget) || !Number.isFinite(spent) || spent < 0 || amount > Math.max(0, budget - spent) + 0.000001) {
      issues.push(`invalid-savings-amount:${entry.id}`);
    }
  }
  for (const id of vault.finalizedPeriods || []) {
    if (finalized.has(id)) issues.push(`duplicate-finalized-period:${id}`);
    finalized.add(id);
  }
  for (const entry of history) {
    if (!finalized.has(entry.periodId)) issues.push(`savings-period-not-finalized:${entry.periodId}`);
  }
  const monthGroups = new Map();
  for (const entry of history) {
    if (!entry.allocationMonthId) continue;
    monthGroups.set(entry.allocationMonthId, (monthGroups.get(entry.allocationMonthId) || 0) + entry.amount);
  }
  for (const [monthId, total] of monthGroups) {
    const monthlyEntry = history.find((entry) => entry.periodId === monthId);
    if (monthlyEntry && total > Math.max(0, monthlyEntry.budgetAmount - monthlyEntry.spentAmount) + 0.000001) {
      issues.push(`savings-exceeds-month:${monthId}`);
    }
  }
  for (const entry of history.filter((item) => item.period === "weekly")) {
    const dailyAndWeekly = history
      .filter((item) => item.period === "daily" && item.weekPeriodId === entry.periodId)
      .reduce((sum, item) => sum + item.amount, entry.amount);
    if (dailyAndWeekly > Math.max(0, entry.budgetAmount - entry.spentAmount) + 0.000001) {
      issues.push(`savings-exceeds-week:${entry.periodId}`);
    }
  }
  const total = history.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  if (Math.abs(total - (Number(vault.savings?.total) || 0)) > 0.000001) issues.push("savings-total-mismatch");
  if (total > computeBalances(vault.transactions || []).total + 0.000001) issues.push("savings-exceeds-actual-balance");
  return [...new Set(issues)];
}

function normalizeSavingsHistory(vault) {
  vault.savings.history.forEach((entry, index) => {
    if (entry.periodId) return;
    const eventDate = parseLocalDate(entry.date);
    const period = PERIODS.includes(entry.period) ? entry.period : "monthly";
    if (!Number.isFinite(eventDate.getTime())) {
      entry.periodId = `invalid-${entry.id || index}`;
      entry.sourcePeriodIds = [entry.periodId];
      return;
    }
    const sourceEnd = new Date(eventDate);
    sourceEnd.setMilliseconds(sourceEnd.getMilliseconds() - 1);
    const sourceStart = periodRange(period, sourceEnd)[0];
    const sourceId = periodId(period, sourceStart);
    entry.id ||= `savings-${sourceId}`;
    entry.periodId = sourceId;
    entry.sourcePeriodIds = [sourceId];
    entry.allocationMonthId = monthIdForPeriod(period, sourceStart);
    entry.weekPeriodId = period === "daily" || period === "weekly" ? periodId("weekly", period === "daily" ? startOfWeek(sourceStart) : sourceStart) : undefined;
    entry.budgetAmount = Number(entry.amount) || 0;
    entry.spentAmount = 0;
    if (!vault.finalizedPeriods.includes(sourceId)) vault.finalizedPeriods.push(sourceId);
  });
}

function normalizePeriodTracking(vault) {
  if (vault.periodTrackingVersion >= 1) return;
  for (const type of ["daily", "weekly"]) {
    const key = vault.periodTracking[type];
    if (!key) continue;
    let start = parseLocalDate(key);
    if (start.getTimezoneOffset() < 0) start = addDays(start, 1);
    if (type === "weekly") start = startOfWeek(start);
    vault.periodTracking[type] = dateKey(start);
  }
  vault.periodTrackingVersion = 1;
}

function normalizeRecurringDates(vault) {
  for (const rule of vault.recurringIncome) {
    if (!rule || rule.localDateVersion >= 1) continue;
    for (const field of ["startDate", "lastApplied", "lastNotified"]) {
      if (!rule[field]) continue;
      const value = rule[field];
      const utcMidnightDateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}T00:00:00(?:\.000)?Z$/.test(value);
      const localDate = utcMidnightDateOnly ? parseLocalDate(value.slice(0, 10)) : parseLocalDate(value);
      rule[field] = localDate.toISOString();
    }
    rule.localDateVersion = 1;
  }
}

function monthIdForPeriod(type, start) {
  const [, end] = periodRange(type, start);
  const lastDay = new Date(end);
  lastDay.setMilliseconds(lastDay.getMilliseconds() - 1);
  return periodId("monthly", periodRange("monthly", lastDay)[0]);
}

function monthRangeFromId(id) {
  const [, year, month] = id.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  return [start, new Date(year, month, 1)];
}

function budgetForPeriod(vault, type, periodEnd) {
  const applicable = (vault.budgetHistory || [])
    .filter((snapshot) => new Date(snapshot.effectiveAt) < periodEnd && Number.isFinite(Number(snapshot.budgets?.[type])))
    .sort((left, right) => new Date(right.effectiveAt) - new Date(left.effectiveAt))[0];
  return Math.max(0, Number(applicable?.budgets?.[type] ?? vault.budgets?.[type]) || 0);
}

function autoSavingsForPeriod(vault, type, periodEnd) {
  const applicable = (vault.budgetHistory || [])
    .filter((snapshot) => new Date(snapshot.effectiveAt) < periodEnd && snapshot.autoSavings)
    .sort((left, right) => new Date(right.effectiveAt) - new Date(left.effectiveAt))[0];
  return applicable ? Boolean(applicable.autoSavings[type]) : Boolean(vault.autoSavings?.[type]);
}

function ensureBudgetHistory(vault, now) {
  if (vault.budgetHistory.length > 0) return;
  const trackedStarts = PERIODS
    .map((type) => vault.periodTracking[type] && periodStartFromKey(type, vault.periodTracking[type]))
    .filter(Boolean)
    .sort((left, right) => left - right);
  const effectiveAt = (trackedStarts[0] || startOfDay(now)).toISOString();
  vault.budgetHistory.push({
    effectiveAt,
    budgets: { ...(vault.budgets || {}) },
    autoSavings: { ...(vault.autoSavings || {}) },
  });
}

function nextRecurringDate(date, rule) {
  if (rule.frequency !== "monthly") {
    return advanceDate(date, rule.frequency, rule.customDays);
  }
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const configuredDay = rule.dayOfMonth || parseLocalDate(rule.startDate).getDate() || date.getDate();
  const day = Math.min(configuredDay, new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate());
  nextMonth.setDate(day);
  nextMonth.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  return nextMonth;
}

function recurringEventId(rule, date) {
  if (rule.frequency === "monthly") {
    return `${rule.id}-monthly-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${rule.id}-${rule.frequency}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export { periodRange };
