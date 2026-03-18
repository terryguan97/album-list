import { TIER_COLOR } from "@/constants/theme";

/** Empty padding cell used in grouped mode to fill incomplete rows */
export function EmptyCell() {
  return <div className="bg-[#0e0e0e] border-b border-r border-[#1c1c1c]" />;
}

/**
 * Full-height vertical divider cell separating tier groups in the desktop grid.
 * Renders a colored left border with a glow effect.
 */
export function TierDividerCell({ tier }) {
  const color = TIER_COLOR[tier] ?? "#444";
  return (
    <div
      className="gcell bg-[#0c0c0c]"
      style={{
        gridRow:    "1 / -1",
        borderLeft: `4px solid ${color}`,
        boxShadow:  `inset 6px 0 20px ${color}1a, -3px 0 18px ${color}55`,
      }}
    />
  );
}

/**
 * Horizontal strip above the desktop grid showing tier labels
 * with colored glow, aligned to each tier's column section.
 */
export function TierHeaderStrip({ tierSections }) {
  return (
    <div className="flex shrink-0 border-b border-[#1c1c1c]" style={{ height: "26px" }}>
      {tierSections.map(({ tier, numCols }) => {
        const color = TIER_COLOR[tier] ?? "#444";
        return (
          <div key={tier} className="flex shrink-0" style={{ width: 4 + numCols * 171 }}>
            <div style={{ width: 4, background: "#0c0c0c", boxShadow: `-3px 0 12px ${color}55` }} />
            <div className="flex items-center px-3 bg-[#0c0c0c]" style={{ width: numCols * 171 }}>
              <span
                className="font-mono text-[10px] tracking-widest"
                style={{ color, textShadow: `0 0 8px ${color}` }}
              >
                {tier}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
