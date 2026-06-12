import { useState } from "react";
import SubPageLayout from "@/components/SubPageLayout";
import { CHANGELOG } from "@/data/changelog";
import { tierGlowStyle } from "@/constants/theme";

// Parses a change text string into colored segments.
// Handles: "Verb Artist - Album [from TIER] to TIER"
function ColoredText({ text }) {
  const grey = { color: "#555" };
  const white = { color: "white" };

  // Pattern: Verb Artist - Album [from TIER] to TIER
  const m = text.match(/^(\w+)\s+(.+?)\s+(?:(from)\s+([SABCD])\s+)?(to)\s+([SABCD])\s*$/);
  if (m) {
    const [, verb, album, fromWord, fromTier, toWord, toTier] = m;
    return (
      <span>
        <span style={grey}>{verb} </span>
        <span style={white}>{album}</span>
        {fromWord && (
          <>
            <span style={grey}> {fromWord} </span>
            <span style={tierGlowStyle(fromTier)}>{fromTier}</span>
          </>
        )}
        <span style={grey}> {toWord} </span>
        <span style={tierGlowStyle(toTier)}>{toTier}</span>
      </span>
    );
  }

  // Scan for any "to/from TIER" references before trying simpler patterns.
  // Tier letter must be followed by comma, period, whitespace, or end-of-string.
  const segments = [];
  let last = 0;
  let tm;
  const tierRe = /\b(to|from)\s+([SABCD])(?=[,.\s]|$)/g;
  while ((tm = tierRe.exec(text)) !== null) {
    if (tm.index > last) segments.push({ t: text.slice(last, tm.index), type: "grey" });
    segments.push({ t: tm[1] + " ", type: "grey" });
    segments.push({ t: tm[2], type: "tier" });
    last = tm.index + tm[0].length;
  }
  if (segments.length > 0) {
    if (last < text.length) segments.push({ t: text.slice(last), type: "grey" });
    return (
      <span>
        {segments.map((seg, i) =>
          seg.type === "tier"
            ? <span key={i} style={tierGlowStyle(seg.t)}>{seg.t}</span>
            : <span key={i} style={grey}>{seg.t}</span>
        )}
      </span>
    );
  }

  // No tier reference — if it's "Verb Artist - Album", make the album white.
  const n = text.match(/^(\w+)\s+(.+)$/);
  if (n && n[2].includes(" - ")) {
    const [, verb, album] = n;
    return (
      <span>
        <span style={grey}>{verb} </span>
        <span style={white}>{album}</span>
      </span>
    );
  }

  // Plain grey
  return <span style={grey}>{text}</span>;
}

export default function Changelog() {
  const [asc, setAsc] = useState(false);

  // Flatten: each item becomes its own row; entries with no items use description
  const flat = CHANGELOG.flatMap(entry =>
    entry.items.length > 0
      ? entry.items.map(text => ({ date: entry.date, text }))
      : [{ date: entry.date, text: entry.description }]
  );

  const rows = asc ? [...flat].reverse() : flat;

  return (
    <SubPageLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight">Changelog</h2>
          <button
            onClick={() => setAsc(v => !v)}
            className="font-mono text-[10px] text-[#888] hover:text-white border border-[#2a2a2a] hover:border-white px-2 py-1 tracking-widest transition-colors duration-150"
          >
            {asc ? "OLDEST  ▲" : "NEWEST ▼"}
          </button>
        </div>

        <div className="flex flex-col">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-4">
              {/* Timeline */}
              <div className="flex flex-col items-center pt-1.5">
                <div className="w-1 h-1 bg-[#444] shrink-0" />
                {i < rows.length - 1 && <div className="w-px flex-1 bg-[#1e1e1e] mt-1" />}
              </div>
              {/* Row content */}
              <div className="flex flex-col md:flex-row md:gap-3 pb-2">
                <time className="font-mono text-[10px] text-white shrink-0 md:w-24 pt-px mb-0.5 md:mb-0">{row.date}</time>
                <span className="text-xs md:text-sm"><ColoredText text={row.text} /></span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SubPageLayout>
  );
}
