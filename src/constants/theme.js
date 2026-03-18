// ─── Tier glow colors ─────────────────────────────────────────────────────────
/** Map of tier letter → hex color used for text glow and borders */
export const TIER_COLOR = {
  S: "#c084fc",
  A: "#4ade80",
  B: "#60a5fa",
  C: "#f5c518",
  D: "#f87171",
};

/** Base highlight color for sort-field emphasis */
export const SORT_HL = "#4ade80";

/** Returns inline style { color, textShadow } with a glow for the given tier */
export function tierGlowStyle(tier) {
  const c = TIER_COLOR[tier];
  if (!c) return {};
  return { color: c, textShadow: `0 0 6px ${c}99, 0 0 14px ${c}55` };
}

/** Returns inline style { color, textShadow } with a glow for sort highlights */
export function sortGlow(color = SORT_HL) {
  return { color, textShadow: `0 0 6px ${color}99, 0 0 14px ${color}55` };
}
