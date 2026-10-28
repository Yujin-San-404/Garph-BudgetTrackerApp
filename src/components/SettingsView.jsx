import React, { useRef, useState } from "react";
import { Lock, Fingerprint, Trash2, Download, Upload, Printer, Plus, AlertTriangle } from "lucide-react";
import { Panel, IconBtn, Field, inputStyle } from "./ui.jsx";
import { uid, fmt } from "../lib/finance.js";
import { dateKey, parseLocalDate } from "../lib/dates.js";
import { ACCENTS, FONT_OPTIONS, FONT_SIZE_OPTIONS } from "../theme.js";

export default function SettingsView({ theme, vault, onUpdate, onChangePassword, onExportBackup, onImportBackup, onDeleteAll, onLockNow }) {
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const [newRule, setNewRule] = useState({ amount: "", frequency: "weekly", startDate: dateKey(new Date()), dayOfMonth: String(new Date().getDate()), account: "digital", label: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef(null);

  const section = (title, children) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: theme.sans, fontSize: 13, color: theme.muted, marginBottom: 10, letterSpacing: 1 }}>{title.toUpperCase()}</div>
      <Panel theme={theme} style={{ padding: 16 }}>{children}</Panel>
    </div>
  );

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ fontFamily: theme.sans, fontSize: 18, marginBottom: 20 }}>Settings</div>

      {section("Appearance", (
        <>
          <Field label="Theme" theme={theme}>
            <div style={{ display: "flex", gap: 8 }}>
              {["jarvis", "modern", "terminal"].map((t) => (
                <div key={t} onClick={() => onUpdate((d) => { d.settings.theme = t; })} style={{
                  flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 10, cursor: "pointer", fontFamily: theme.sans, fontSize: 12, textTransform: "capitalize",
                  border: `1px solid ${vault.settings.theme === t ? theme.accent : theme.border}`, background: vault.settings.theme === t ? `${theme.accent}22` : "transparent",
                }}>{t}</div>
              ))}
            </div>
          </Field>
          <Field label="Accent color" theme={theme}>
            <div style={{ display: "flex", gap: 10 }}>
              {ACCENTS.map((a) => (
                <div key={a.id} onClick={() => onUpdate((d) => { d.settings.accent = a.hex; })} style={{
                  width: 28, height: 28, borderRadius: "50%", background: a.hex, cursor: "pointer",
                  border: vault.settings.accent === a.hex ? "2px solid white" : "2px solid transparent",
                }} />
              ))}
            </div>
          </Field>
          <Field label="Interface font" theme={theme}>
            <select value={vault.settings.fontFamily || "inter"} onChange={(e) => onUpdate((d) => { d.settings.fontFamily = e.target.value; })} style={{ ...inputStyle(theme), colorScheme: "dark" }}>
              {FONT_OPTIONS.map((font) => <option key={font.id} value={font.id} style={{ backgroundColor: theme.bg, color: theme.text }}>{font.label}</option>)}
            </select>
          </Field>
          <Field label="Text size" theme={theme}>
            <select value={vault.settings.fontSize || "normal"} onChange={(e) => onUpdate((d) => { d.settings.fontSize = e.target.value; })} style={{ ...inputStyle(theme), colorScheme: "dark" }}>
              {FONT_SIZE_OPTIONS.map((size) => <option key={size.id} value={size.id} style={{ backgroundColor: theme.bg, color: theme.text }}>{size.label}</option>)}
            </select>
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: `${13 * (theme.fontScale || 1)}px`, fontFamily: theme.sans, cursor: "pointer" }}>
            <input type="checkbox" checked={vault.settings.reducedMotion} onChange={(e) => onUpdate((d) => { d.settings.reducedMotion = e.target.checked; })} />
            Reduce motion
          </label>
        </>
      ))}

      {section("Notifications", (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: theme.sans, marginBottom: 12 }}>
            <input type="checkbox" checked={vault.settings.automaticEarnings !== false} onChange={(e) => onUpdate((d) => { d.settings.automaticEarnings = e.target.checked; })} />
            Recurring budget notifications
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: theme.sans, marginBottom: 8 }}>
            <input type="checkbox" checked={vault.settings.inactivitySummaryEnabled !== false} onChange={(e) => onUpdate((d) => { d.settings.inactivitySummaryEnabled = e.target.checked; })} />
            Inactivity summary
          </label>
          <Field label="Notify me after (days)" theme={theme}>
            <input type="number" min="1" max="3650" step="1" value={vault.settings.inactivityDays || 7} disabled={vault.settings.inactivitySummaryEnabled === false}
              onChange={(e) => onUpdate((d) => { d.settings.inactivityDays = Math.min(3650, Math.max(1, Math.floor(Number(e.target.value) || 1))); })} style={inputStyle(theme)} />
          </Field>
          {vault.auditIssues?.length > 0 && <div role="alert" style={{ marginBottom: 12, padding: 10, border: "1px solid #fb718555", color: "#fb7185", fontFamily: theme.sans, fontSize: 12 }}>
            Financial audit warning: {vault.auditIssues.join(", ")}. New savings finalization is paused until the inconsistency is reviewed.
          </div>}
          {vault.recurringIncome.length === 0 && <div style={{ fontSize: 13, color: theme.muted, marginBottom: 12 }}>No recurring income rules.</div>}
          {vault.recurringIncome.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div style={{ fontFamily: theme.sans, fontSize: 13 }}>
                {fmt(r.amount)} · {r.frequency}{r.frequency === "monthly" ? ` · day ${r.dayOfMonth || new Date(r.startDate).getDate()}` : ""} · {r.account}
                <div style={{ fontSize: 11, color: theme.muted }}>{r.label}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {r.frequency === "monthly" && <input aria-label={`Monthly date for ${r.label || "recurring budget"}`} type="number" min="1" max="31" value={r.dayOfMonth || new Date(r.startDate).getDate()} onChange={(e) => {
                  const day = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                  onUpdate((d) => { const rule = d.recurringIncome.find((item) => item.id === r.id); rule.dayOfMonth = day; });
                }} style={{ ...inputStyle(theme), width: 64 }} />}
                <input type="checkbox" checked={r.enabled} onChange={(e) => onUpdate((d) => { d.recurringIncome.find((x) => x.id === r.id).enabled = e.target.checked; })} />
                <button onClick={() => onUpdate((d) => { d.recurringIncome = d.recurringIncome.filter((x) => x.id !== r.id); })} style={{ background: "none", border: "none", color: "#fb7185", cursor: "pointer" }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <input placeholder="Amount" value={newRule.amount} onChange={(e) => setNewRule({ ...newRule, amount: e.target.value.replace(/[^0-9.]/g, "") })} style={{ ...inputStyle(theme), width: 90 }} />
            <select value={newRule.frequency} onChange={(e) => setNewRule({ ...newRule, frequency: e.target.value })} style={{ ...inputStyle(theme), width: 110 }}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
            <select value={newRule.account} onChange={(e) => setNewRule({ ...newRule, account: e.target.value })} style={{ ...inputStyle(theme), width: 100 }}>
              <option value="digital">Digital</option><option value="physical">Physical</option>
            </select>
            {newRule.frequency === "monthly" ? (
              <input aria-label="Monthly budget date" type="number" min="1" max="31" value={newRule.dayOfMonth} onChange={(e) => setNewRule({ ...newRule, dayOfMonth: e.target.value })} style={{ ...inputStyle(theme), width: 100 }} placeholder="Day 1-31" />
            ) : (
              <input type="date" value={newRule.startDate} onChange={(e) => setNewRule({ ...newRule, startDate: e.target.value })} style={{ ...inputStyle(theme), width: 140 }} />
            )}
            <input placeholder="Label" value={newRule.label} onChange={(e) => setNewRule({ ...newRule, label: e.target.value })} style={{ ...inputStyle(theme), flex: 1, minWidth: 100 }} />
            <button onClick={() => {
              const amt = parseFloat(newRule.amount); if (!Number.isFinite(amt) || amt <= 0) return;
              const dayOfMonth = Math.min(31, Math.max(1, Number(newRule.dayOfMonth) || 1));
              const startDate = parseLocalDate(newRule.startDate);
              if (newRule.frequency === "monthly") {
                const today = new Date();
                let scheduled = new Date(today.getFullYear(), today.getMonth(), Math.min(dayOfMonth, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()));
                if (scheduled < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
                  scheduled = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dayOfMonth, new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate()));
                }
                startDate.setTime(scheduled.getTime());
              }
              onUpdate((d) => { d.recurringIncome.push({ id: uid(), amount: amt, frequency: newRule.frequency, startDate: startDate.toISOString(), dayOfMonth, account: newRule.account, label: newRule.label, enabled: true, lastApplied: null }); });
              setNewRule({ amount: "", frequency: "weekly", startDate: dateKey(new Date()), dayOfMonth: String(new Date().getDate()), account: "digital", label: "" });
            }} style={{ background: theme.accent, border: "none", borderRadius: 10, padding: "0 14px", cursor: "pointer" }}><Plus size={16} color="#00131a" /></button>
          </div>
        </>
      ))}

      {section("Security", (
        <>
          <IconBtn theme={theme} onClick={onLockNow}><Lock size={14} /> Lock now</IconBtn>
          <div style={{ marginTop: 16 }}>
            <Field label="Current password" theme={theme}><input type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} style={inputStyle(theme)} /></Field>
            <Field label="New password" theme={theme}><input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} style={inputStyle(theme)} /></Field>
            {pwMsg && <div style={{ fontSize: 12, color: pwMsg.startsWith("Password updated") ? "#34d399" : "#fb7185", marginBottom: 8 }}>{pwMsg}</div>}
            <IconBtn theme={theme} onClick={async () => { const ok = await onChangePassword(curPass, newPass); setPwMsg(ok ? "Password updated." : "Current password is incorrect."); setCurPass(""); setNewPass(""); }}>Change password</IconBtn>
          </div>
          <div style={{ marginTop: 16, opacity: 0.5 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: theme.sans }}>
              <input type="checkbox" disabled /> <Fingerprint size={16} /> Biometric unlock (requires a native app build)
            </label>
          </div>
        </>
      ))}

      {section("Data", (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <IconBtn theme={theme} onClick={async () => {
            setBackupMsg("");
            try {
              await onExportBackup();
              setBackupMsg("Backup ready. Choose where to save it in the share menu.");
            } catch {
              setBackupMsg("Backup export failed. Check available storage and try again.");
            }
          }}><Download size={14} /> Export encrypted backup</IconBtn>
          {backupMsg && <div role="status" style={{ color: backupMsg.includes("failed") ? "#fb7185" : "#34d399", fontSize: 12, fontFamily: theme.sans }}>{backupMsg}</div>}
          <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => e.target.files[0] && onImportBackup(e.target.files[0])} />
          <IconBtn theme={theme} onClick={() => fileRef.current?.click()}><Upload size={14} /> Import encrypted backup</IconBtn>
          <IconBtn theme={theme} onClick={() => window.print()}><Printer size={14} /> Export PDF summary (print dialog)</IconBtn>
          {!confirmDelete ? (
            <IconBtn theme={theme} danger onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete all financial data</IconBtn>
          ) : (
            <div style={{ border: "1px solid #fb717555", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#fb7185", fontSize: 13, fontFamily: theme.sans, marginBottom: 10 }}><AlertTriangle size={16} /> This permanently erases everything. Are you sure?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <IconBtn theme={theme} danger onClick={() => { onDeleteAll(); setConfirmDelete(false); }}>Yes, delete everything</IconBtn>
                <IconBtn theme={theme} onClick={() => setConfirmDelete(false)}>Cancel</IconBtn>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
