import React from "react";

export function Panel({ theme, children, style, className }) {
  return (
    <div
      className={className}
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        backdropFilter: "blur(10px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function IconBtn({ theme, onClick, children, title, danger }) {
  const scale = theme.fontScale || 1;
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: "transparent", border: `1px solid ${danger ? "#fb717555" : theme.border}`,
        color: danger ? "#fb7185" : theme.text, borderRadius: 12, padding: "10px 14px",
        fontFamily: theme.sans, fontSize: `${13 * scale}px`, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, theme }) {
  const scale = theme.fontScale || 1;
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: `${12 * scale}px`, color: theme.muted, marginBottom: 6, fontFamily: theme.sans }}>{label}</div>
      {children}
    </label>
  );
}

export function inputStyle(theme) {
  const scale = theme.fontScale || 1;
  return {
    width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${theme.border}`,
    color: theme.text, borderRadius: 10, padding: "10px 12px", fontFamily: theme.sans, fontSize: `${14 * scale}px`, outline: "none",
  };
}
