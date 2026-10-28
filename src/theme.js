export const ACCENTS = [
  { id: "sky", hex: "#38bdf8" },
  { id: "cyan", hex: "#22d3ee" },
  { id: "violet", hex: "#a78bfa" },
  { id: "emerald", hex: "#34d399" },
  { id: "amber", hex: "#fbbf24" },
  { id: "rose", hex: "#fb7185" },
];

export const FONT_OPTIONS = [
  { id: "inter", label: "Inter", stack: "'Inter',system-ui,sans-serif" },
  { id: "system", label: "System Sans", stack: "system-ui,sans-serif" },
  { id: "trebuchet", label: "Trebuchet", stack: "'Trebuchet MS',sans-serif" },
  { id: "georgia", label: "Georgia", stack: "Georgia,serif" },
];

export const FONT_SIZE_OPTIONS = [
  { id: "normal", label: "Normal", scale: 1 },
  { id: "large", label: "Large", scale: 1.12 },
  { id: "xlarge", label: "Extra large", scale: 1.22 },
];

export function useThemeVars(settings) {
  const t = settings.theme;
  const accent = settings.accent || "#38bdf8";
  const sans = FONT_OPTIONS.find((font) => font.id === settings.fontFamily)?.stack || FONT_OPTIONS[0].stack;
  const fontScale = FONT_SIZE_OPTIONS.find((option) => option.id === settings.fontSize)?.scale || 1;

  if (t === "modern") {
    return {
      bg: "#0b1020", panel: "rgba(255,255,255,0.05)", border: "rgba(148,163,184,0.18)",
      glow: "0 0 0 rgba(0,0,0,0)", text: "#e5e7eb", muted: "#94a3b8",
      mono: "'DM Mono','Courier New',monospace", sans,
      accent, dense: false, radius: "20px", mode: t, reducedMotion: !!settings.reducedMotion,
      fontScale,
    };
  }
  if (t === "terminal") {
    return {
      bg: "#020402", panel: "#050805", border: "rgba(34,197,94,0.35)",
      glow: `0 0 10px ${accent}55`, text: "#c8f5d0", muted: "#4b7a55",
      mono: "'DM Mono','Courier New',monospace", sans,
      accent: "#22c55e", dense: true, radius: "4px", mode: t, reducedMotion: !!settings.reducedMotion,
      fontScale,
    };
  }
  return {
    bg: "#03050a", panel: "rgba(14,22,38,0.55)", border: `${accent}44`,
    glow: `0 0 24px ${accent}55, inset 0 0 20px ${accent}11`, text: "#e6f1ff", muted: "#6b7c93",
    mono: "'DM Mono','Courier New',monospace", sans,
    accent, dense: false, radius: "999px", mode: t, reducedMotion: !!settings.reducedMotion,
    fontScale,
  };
}
