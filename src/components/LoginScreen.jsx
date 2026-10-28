import React, { useEffect, useRef, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Panel, Field, inputStyle } from "./ui.jsx";

export default function LoginScreen({ mode, theme, onCreate, onUnlock, error, username }) {
  const [u, setU] = useState(username || "");
  const [p, setP] = useState("");
  const [p2, setP2] = useState("");
  const passwordInput = useRef(null);
  const busy = useRef(false);

  useEffect(() => {
    if (mode !== "unlock" || !error) return undefined;
    setP("");
    const frame = requestAnimationFrame(() => passwordInput.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [error, mode]);

  const submit = async (e) => {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    if (mode === "create") await onCreate(u.trim() || "Owner", p);
    else await onUnlock(p);
    busy.current = false;
  };

  if (mode === "granting") {
    return (
      <div className="login-screen">
        <Panel theme={theme} className="login-panel login-panel--granting" style={{ "--login-accent": theme.accent, "--login-text": theme.text, "--login-muted": theme.muted }}>
          <div className="login-granted-icon"><ShieldCheck size={28} color={theme.accent} /></div>
          <div className="login-brand">GARPH</div>
          <div className="login-granted-title">ACCESS GRANTED</div>
          <div className="login-granted-copy">Initializing local finance system</div>
          <div className="login-progress"><span /></div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="login-screen" style={{ background: theme.bg, color: theme.text, fontFamily: theme.sans }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 30%, ${theme.accent}1a, transparent 60%)`, pointerEvents: "none" }} />
      <Panel theme={theme} className={`login-panel${error && mode === "unlock" ? " login-panel--error" : ""}`} style={{ padding: 32, width: 360, maxWidth: "100%", boxShadow: theme.glow, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", border: `2px solid ${theme.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: theme.glow, marginBottom: 12,
          }}>
            <Lock size={26} color={theme.accent} />
          </div>
          <div style={{ fontFamily: theme.mono, fontSize: 22, letterSpacing: 2 }}>GARPH</div>
          <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>
            {mode === "create" ? "set up your vault" : "enter password to unlock"}
          </div>
        </div>
        <form onSubmit={submit}>
          {mode === "create" && (
            <Field label="Username" theme={theme}>
              <input style={inputStyle(theme)} value={u} onChange={(e) => setU(e.target.value)} placeholder="Owner" />
            </Field>
          )}
          {mode === "unlock" && (
            <div style={{ fontSize: 13, color: theme.muted, marginBottom: 14 }}>{username}</div>
          )}
          <Field label="Password" theme={theme}>
            <input ref={passwordInput} autoFocus={mode === "unlock"} type="password" style={inputStyle(theme)} value={p} onChange={(e) => setP(e.target.value)} aria-invalid={Boolean(error && mode === "unlock")} required />
          </Field>
          {mode === "create" && (
            <Field label="Confirm password" theme={theme}>
              <input type="password" style={inputStyle(theme)} value={p2} onChange={(e) => setP2(e.target.value)} required />
            </Field>
          )}
          {error && <div role="alert" aria-live="assertive" style={{ color: "#fb7185", fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={mode === "create" && (!p || p !== p2)} style={{
            width: "100%", padding: "12px", borderRadius: 12, border: "none", cursor: "pointer",
            background: theme.accent, color: "#00131a", fontWeight: 600, fontFamily: theme.sans, marginTop: 4,
            opacity: mode === "create" && (!p || p !== p2) ? 0.5 : 1,
          }}>
            {mode === "create" ? "Create vault" : "Unlock"}
          </button>
        </form>
      </Panel>
    </div>
  );
}
