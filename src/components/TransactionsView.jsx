import React, { useMemo, useState } from "react";
import { Panel, inputStyle } from "./ui.jsx";
import { ArrowDownCircle, ArrowUpCircle, Repeat } from "lucide-react";
import { fmt } from "../lib/finance.js";

export default function TransactionsView({ theme, vault }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    return vault.transactions.slice().reverse().filter((t) => {
      if (filter !== "all" && t.type !== filter && !(filter === t.account)) return false;
      if (q && !(t.note || "").toLowerCase().includes(q.toLowerCase()) && !(t.category || "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [vault.transactions, filter, q]);

  const chip = (id, label) => (
    <div onClick={() => setFilter(id)} style={{
      padding: "6px 12px", borderRadius: 999, fontSize: 12, cursor: "pointer", fontFamily: theme.sans, whiteSpace: "nowrap",
      border: `1px solid ${filter === id ? theme.accent : theme.border}`, background: filter === id ? `${theme.accent}22` : "transparent", color: theme.text,
    }}>{label}</div>
  );

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ fontFamily: theme.sans, fontSize: 18, marginBottom: 12 }}>Transactions</div>
      <input placeholder="Search notes or category…" value={q} onChange={(e) => setQ(e.target.value)} style={{ ...inputStyle(theme), marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {chip("all", "All")}{chip("earned", "Earned")}{chip("spent", "Spent")}{chip("transfer", "Transfer")}{chip("digital", "Digital")}{chip("physical", "Physical")}
      </div>
      <Panel theme={theme} style={{ padding: 4 }}>
        {list.length === 0 && <div style={{ padding: 20, textAlign: "center", color: theme.muted, fontFamily: theme.sans, fontSize: 13 }}>No transactions match.</div>}
        {list.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: `1px solid ${theme.border}` }}>
            <div style={{ color: t.type === "spent" ? "#fb7185" : t.type === "earned" ? "#34d399" : theme.accent }}>
              {t.type === "spent" ? <ArrowDownCircle size={20} /> : t.type === "earned" ? <ArrowUpCircle size={20} /> : <Repeat size={20} />}
            </div>
            <div style={{ flex: 1, fontFamily: theme.sans }}>
              <div style={{ fontSize: 14 }}>{t.type === "spent" ? t.category : t.type === "transfer" ? (t.direction === "d2p" ? "Digital → Physical" : "Physical → Digital") : (t.note || "Income")}</div>
              <div style={{ fontSize: 11, color: theme.muted }}>{new Date(t.date).toLocaleString()} {t.account ? `· ${t.account}` : ""}</div>
            </div>
            <div style={{ fontFamily: theme.mono, fontSize: 14, color: t.type === "spent" ? "#fb7185" : t.type === "earned" ? "#34d399" : theme.text }}>
              {t.type === "spent" ? "-" : t.type === "earned" ? "+" : "↔"}{fmt(t.amount)}
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}
