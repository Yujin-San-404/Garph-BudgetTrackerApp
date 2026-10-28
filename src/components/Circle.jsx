import React from "react";
import { fmt } from "../lib/finance.js";

export default function Circle({ id, label, value, theme, slot, active, description, support, progress, onClick }) {
  const gaugeLength = progress == null ? 92 : Math.max(0, Math.min(100, progress)) * 2.64;

  return (
    <button
      className={`hud-node hud-node--${slot}${active ? " is-active" : ""}`}
      type="button"
      onClick={() => onClick(id)}
      aria-label={`${label}: ${fmt(value)}. ${description}. ${support}.`}
      aria-pressed={active}
      style={{ "--node-accent": theme.accent, "--node-text": theme.text, "--node-muted": theme.muted, "--node-panel": theme.panel, "--node-border": theme.border }}
    >
      <svg className="hud-node-rings" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="hud-ring hud-ring--outer" cx="50" cy="50" r="47" />
        <circle className="hud-ring hud-ring--track" cx="50" cy="50" r="42" />
        <circle className="hud-ring hud-ring--gauge" cx="50" cy="50" r="42" strokeDasharray={`${gaugeLength} 264`} />
        <circle className="hud-ring hud-ring--inner" cx="50" cy="50" r="36" />
      </svg>
      <span className="hud-node-content">
        <span className="hud-node-label">{label}</span>
        <span className="hud-node-value">{fmt(value)}</span>
        {active ? (
          <>
            <span className="hud-node-description">{description}</span>
            <span className="hud-node-support">{support}</span>
          </>
        ) : <span className="hud-node-support">{support}</span>}
      </span>
    </button>
  );
}
