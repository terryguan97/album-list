import { useRef, useEffect } from "react";
import { animate } from "animejs";
import { cn } from "@/lib/utils";
import { TIER_TABS, TIER_STEP } from "@/data/uiConstants";

/**
 * Horizontal pitch-control style tier filter slider (desktop footer).
 * Clicking a label or dragging snaps the handle to that position.
 */
export function TierSlider({ value, onChange }) {
  const handleRef  = useRef(null);
  const trackRef   = useRef(null);
  const idxRef     = useRef(TIER_TABS.indexOf(value));
  const dragging   = useRef(false);
  const idx        = TIER_TABS.indexOf(value);

  // FLIP: handle CSS position is already at new idx; animate translateX from old offset
  useEffect(() => {
    if (!handleRef.current) return;
    const prev = idxRef.current;
    idxRef.current = idx;
    if (prev === idx) return;
    animate(handleRef.current, {
      translateX: [(prev - idx) * TIER_STEP, 0],
      duration:   300,
      ease:       "outQuart",
    });
  }, [idx]);

  function idxFromClientX(clientX) {
    const rect = trackRef.current.getBoundingClientRect();
    const raw  = Math.round((clientX - rect.left - 8) / TIER_STEP);
    return Math.max(0, Math.min(TIER_TABS.length - 1, raw));
  }

  function onPointerDown(e) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const i = idxFromClientX(e.clientX);
    if (i !== idx) onChange(TIER_TABS[i]);
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    const i = idxFromClientX(e.clientX);
    if (i !== idx) onChange(TIER_TABS[i]);
  }

  function onPointerUp() {
    dragging.current = false;
  }

  const totalW = (TIER_TABS.length - 1) * TIER_STEP + 16;

  return (
    <div
      ref={trackRef}
      className="relative flex-shrink-0 cursor-pointer select-none"
      style={{ width: totalW, height: "100%" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Ticks + labels */}
      {TIER_TABS.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="absolute flex flex-col items-center"
          style={{ left: i * TIER_STEP + 8 - 6, top: 0, bottom: 0, width: 12, justifyContent: "center", gap: 3 }}
        >
          <span className={cn(
            "font-mono text-[9px] leading-none transition-colors duration-150",
            value === t ? "text-[#d8d8d8]" : "text-[#888] hover:text-[#bbb]"
          )}>
            {t}
          </span>
          <div style={{ width: 1, height: 5, background: value === t ? "#555" : "#242424" }} />
        </button>
      ))}

      {/* Rail */}
      <div className="absolute bg-[#1e1e1e]" style={{ left: 8, right: 8, bottom: 10, height: 1 }} />

      {/* Handle */}
      <div
        ref={handleRef}
        className="absolute"
        style={{
          left:       idx * TIER_STEP + 8 - 5,
          bottom:     6,
          width:      10,
          height:     9,
          background: "#3a3a3a",
          border:     "1px solid #585858",
        }}
      />
    </div>
  );
}

/**
 * Vertical pitch-control style tier filter slider (mobile tier panel).
 * Same logic as TierSlider but oriented vertically.
 */
export function TierSliderVertical({ value, onChange }) {
  const handleRef = useRef(null);
  const trackRef  = useRef(null);
  const idxRef    = useRef(TIER_TABS.indexOf(value));
  const dragging  = useRef(false);
  const idx       = TIER_TABS.indexOf(value);

  useEffect(() => {
    if (!handleRef.current) return;
    const prev = idxRef.current;
    idxRef.current = idx;
    if (prev === idx) return;
    animate(handleRef.current, {
      translateY: [(prev - idx) * TIER_STEP, 0],
      duration:   300,
      ease:       "outQuart",
    });
  }, [idx]);

  function idxFromClientY(clientY) {
    const rect = trackRef.current.getBoundingClientRect();
    const raw  = Math.round((clientY - rect.top - 8) / TIER_STEP);
    return Math.max(0, Math.min(TIER_TABS.length - 1, raw));
  }

  function onPointerDown(e) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const i = idxFromClientY(e.clientY);
    if (i !== idx) onChange(TIER_TABS[i]);
  }

  function onPointerMove(e) {
    if (!dragging.current) return;
    const i = idxFromClientY(e.clientY);
    if (i !== idx) onChange(TIER_TABS[i]);
  }

  function onPointerUp() {
    dragging.current = false;
  }

  const totalH = (TIER_TABS.length - 1) * TIER_STEP + 16;

  return (
    <div
      ref={trackRef}
      className="relative flex-shrink-0 cursor-pointer select-none"
      style={{ height: totalH, width: 48 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Ticks + labels */}
      {TIER_TABS.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="absolute flex items-center justify-end"
          style={{ top: i * TIER_STEP + 8 - 6, left: 0, right: 0, height: 12, gap: 4, paddingRight: 15 }}
        >
          <span className={cn(
            "font-mono text-[9px] leading-none transition-colors duration-150",
            value === t ? "text-[#d8d8d8]" : "text-[#888] hover:text-[#bbb]"
          )}>
            {t}
          </span>
          <div style={{ height: 1, width: 5, background: value === t ? "#555" : "#242424" }} />
        </button>
      ))}

      {/* Rail */}
      <div className="absolute bg-[#1e1e1e]" style={{ top: 8, bottom: 8, right: 14, width: 1 }} />

      {/* Handle */}
      <div
        ref={handleRef}
        className="absolute"
        style={{
          top:        idx * TIER_STEP + 8 - 5,
          right:      10,
          width:      9,
          height:     10,
          background: "#3a3a3a",
          border:     "1px solid #585858",
        }}
      />
    </div>
  );
}
