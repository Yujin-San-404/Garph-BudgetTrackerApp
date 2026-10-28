import React, { useState } from "react";
import { Bell, Check, X } from "lucide-react";
import { fmt } from "../lib/finance.js";

export default function NotificationCenter({ theme, notifications, onAccept, onDismiss, onRead }) {
  const [open, setOpen] = useState(false);
  const pending = notifications.filter((notification) => notification.status === "pending");
  const visibleNotifications = notifications.filter((notification) =>
    notification.status === "pending" || (notification.type === "inactivity-summary" && notification.status === "read")
  );

  return (
    <div className="no-print" style={{ position: "fixed", top: 14, right: 16, zIndex: 40 }}>
      <button type="button" aria-label={`Notifications${pending.length ? `, ${pending.length} pending` : ""}`} aria-expanded={open}
        onClick={() => setOpen((value) => !value)} style={{ position: "relative", width: 40, height: 40, display: "grid", placeItems: "center", border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.text, background: theme.panel, cursor: "pointer" }}>
        <Bell size={18} />
        {pending.length > 0 && <span style={{ position: "absolute", top: -5, right: -5, minWidth: 17, height: 17, padding: "0 4px", display: "grid", placeItems: "center", borderRadius: 10, color: "#00131a", background: theme.accent, fontSize: 10, fontWeight: 700 }}>{pending.length}</span>}
      </button>
      {open && <section aria-label="Notifications" style={{ position: "absolute", top: 48, right: 0, width: "min(360px, calc(100vw - 24px))", maxHeight: "min(70vh, 520px)", overflowY: "auto", padding: 14, border: `1px solid ${theme.border}`, borderRadius: 8, background: theme.panel, color: theme.text, boxShadow: theme.glow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontFamily: theme.sans, fontSize: 14 }}>
          <strong>Notifications</strong>
          <button type="button" aria-label="Close notifications" onClick={() => setOpen(false)} style={{ border: 0, color: theme.muted, background: "transparent", cursor: "pointer" }}><X size={17} /></button>
        </div>
        {visibleNotifications.length === 0 ? <div style={{ padding: "12px 0", color: theme.muted, fontFamily: theme.sans, fontSize: 12 }}>No notifications.</div> : visibleNotifications.map((notification) => (
          <article key={notification.id} style={{ padding: "12px 0", borderTop: `1px solid ${theme.border}`, fontFamily: theme.sans }}>
            {notification.type === "inactivity-summary" ? (
              <>
                <strong style={{ fontSize: 13 }}>Welcome back!</strong>
                <div style={{ marginTop: 5, fontSize: 13, lineHeight: 1.5 }}>You haven&apos;t opened Garph for {notification.summary.daysAway} days.</div>
                <ul style={{ margin: "8px 0", paddingLeft: 20, color: theme.muted, fontSize: 12, lineHeight: 1.7 }}>
                  <li>{notification.summary.weeklyPeriods} weekly and {notification.summary.monthlyPeriods} monthly budget periods passed</li>
                  <li>{fmt(notification.summary.savingsRecorded)} was recorded as savings</li>
                  <li>{notification.summary.expensesCount} expenses recorded ({fmt(notification.summary.expensesTotal)})</li>
                  <li>Current monthly budget remaining: {fmt(notification.summary.monthlyRemaining)}</li>
                </ul>
                <div style={{ color: theme.muted, fontSize: 12 }}>Review your finances to make sure everything is up to date.</div>
              </>
            ) : (
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Your {fmt(notification.amount)} {notification.frequency} budget is ready. Add it to your actual balance?</div>
            )}
            <div style={{ marginTop: 5, color: theme.muted, fontSize: 11 }}>{new Date(notification.createdAt).toLocaleString()}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {notification.type === "inactivity-summary" && notification.status === "pending" ? (
                <button type="button" onClick={() => onRead(notification.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 10px", border: 0, borderRadius: 5, color: "#00131a", background: theme.accent, cursor: "pointer", fontSize: 12 }}><Check size={14} /> Mark read</button>
              ) : (
                notification.type !== "inactivity-summary" && <button type="button" onClick={() => onAccept(notification.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 10px", border: 0, borderRadius: 5, color: "#00131a", background: theme.accent, cursor: "pointer", fontSize: 12 }}><Check size={14} /> Add</button>
              )}
              {notification.status !== "read" && <button type="button" onClick={() => onDismiss(notification.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 10px", border: `1px solid ${theme.border}`, borderRadius: 5, color: theme.text, background: "transparent", cursor: "pointer", fontSize: 12 }}><X size={14} /> {notification.type === "inactivity-summary" ? "Dismiss" : "Ignore"}</button>}
            </div>
          </article>
        ))}
      </section>}
    </div>
  );
}