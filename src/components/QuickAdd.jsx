import React, { useState } from "react";
import { X } from "lucide-react";
import { Panel, Field, inputStyle } from "./ui.jsx";
import { uid, CATEGORIES } from "../lib/finance.js";

export default function QuickAdd({ theme, onClose, onSubmit }) {
  const [type, setType] = useState("spent");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("digital");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [direction, setDirection] = useState("d2p");
  const [note, setNote] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const tx = { id: uid(), date: new Date().toISOString(), amount: amt, type, note };
    if (type === "transfer") tx.direction = direction;
    else { tx.account = account; if (type === "spent") tx.category = category; }
    const error = onSubmit(tx);
    if (error) setSubmissionError(error);
  };

  const chip = (active) => ({
    flex: 1, padding: "10px 0", textAlign: "center", borderRadius: 10, cursor: "pointer", fontFamily: theme.sans, fontSize: 13,
    border: `1px solid ${active ? theme.accent : theme.border}`, background: active ? `${theme.accent}22` : "transparent", color: theme.text,
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480 }}>
        <Panel theme={theme} style={{ padding: 20, borderRadius: "20px 20px 0 0", boxShadow: theme.glow }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: theme.sans, fontWeight: 600 }}>New transaction</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: theme.muted, cursor: "pointer" }}><X size={20} /></button>
          </div>
          <form onSubmit={submit}>
            <input autoFocus inputMode="decimal" placeholder="₱0" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setSubmissionError(""); }}
              style={{ ...inputStyle(theme), fontFamily: theme.mono, fontSize: 28, textAlign: "center", marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <div style={chip(type === "earned")} onClick={() => { setType("earned"); setSubmissionError(""); }}>Earned</div>
              <div style={chip(type === "spent")} onClick={() => { setType("spent"); setSubmissionError(""); }}>Spent</div>
              <div style={chip(type === "transfer")} onClick={() => { setType("transfer"); setSubmissionError(""); }}>Transfer</div>
            </div>
            {type !== "transfer" ? (
              <>
                <Field label="Account" theme={theme}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={chip(account === "digital")} onClick={() => { setAccount("digital"); setSubmissionError(""); }}>Digital</div>
                    <div style={chip(account === "physical")} onClick={() => { setAccount("physical"); setSubmissionError(""); }}>Physical</div>
                  </div>
                </Field>
                {type === "spent" && (
                  <Field label="Category" theme={theme}>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle(theme)}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                )}
              </>
            ) : (
              <Field label="Direction" theme={theme}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={chip(direction === "d2p")} onClick={() => { setDirection("d2p"); setSubmissionError(""); }}>Digital → Physical</div>
                  <div style={chip(direction === "p2d")} onClick={() => { setDirection("p2d"); setSubmissionError(""); }}>Physical → Digital</div>
                </div>
              </Field>
            )}
            <Field label="Note (optional)" theme={theme}>
              <input value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle(theme)} />
            </Field>
            {submissionError && <div role="alert" aria-live="assertive" style={{ color: "#fb7185", whiteSpace: "pre-line", fontFamily: theme.mono, fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>{submissionError}</div>}
            <button type="submit" style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: theme.accent, color: "#00131a", fontWeight: 600, cursor: "pointer", fontFamily: theme.sans }}>
              Save transaction
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
