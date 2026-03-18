import { useRef, useEffect, useLayoutEffect } from "react";
import { animate } from "animejs";
import { KnobToggle } from "@/components/KnobToggle";
import { sortGlow } from "@/constants/theme";
import { SORT_OPTIONS, GENRE_OPTIONS } from "@/data/uiConstants";

/**
 * Full-height left-side drawer for mobile filter controls.
 * Slides in from the left on mount (anime.js translateX).
 * Slides back out when the `closing` prop becomes true,
 * then the parent unmounts it after the animation completes.
 */
export function MobileFilterDrawer({
  newOnly, changeNew,
  vinylOnly, changeVinyl,
  grouped, changeGroup,
  sort, handleSortChange,
  sortDir, handleDirChange,
  genre, changeGenre,
  tier, resetAll,
  onClose, closing,
}) {
  const drawerRef = useRef(null);

  // Slide in on mount
  useLayoutEffect(() => {
    if (!drawerRef.current) return;
    animate(drawerRef.current, {
      translateX: ["-100%", "0%"],
      duration: 280,
      ease: "outQuart",
    });
  }, []);

  // Slide out when parent signals close
  useEffect(() => {
    if (!closing || !drawerRef.current) return;
    animate(drawerRef.current, {
      translateX: ["0%", "-100%"],
      duration: 260,
      ease: "inQuart",
    });
  }, [closing]);

  const isDirty = sort !== "Rating" || sortDir !== "asc" || genre !== "All" || tier !== "All" || vinylOnly || newOnly || grouped;

  return (
    <>
      {/* Backdrop — tapping closes the drawer */}
      <div className="fixed inset-0 z-30" onClick={onClose} />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed top-0 left-0 bottom-12 z-40 w-64 bg-[#0e0e0e] border-r border-[#222] font-mono overflow-y-auto no-scrollbar flex flex-col"
      >
        <div className="p-5 flex flex-col gap-6 flex-1">

          {/* Toggle knobs */}
          <div>
            <p className="text-[9px] tracking-widest text-[#444] mb-4 uppercase">Toggles</p>
            <div className="flex gap-5">
              <KnobToggle active={grouped}   onClick={changeGroup} label="Group" />
              <KnobToggle active={newOnly}   onClick={changeNew}   label="New" />
              <KnobToggle active={vinylOnly} onClick={changeVinyl} label="Own Vinyl" />
            </div>
          </div>

          {/* Sort options */}
          <div>
            <p className="text-[9px] tracking-widest text-[#444] mb-2 uppercase">Sort</p>
            <div className="flex flex-col">
              {SORT_OPTIONS.map((o) => (
                <div key={o.value} className="flex items-center">
                  <button
                    onClick={() => handleSortChange(o.value)}
                    className="text-left text-[11px] px-2 py-1.5 transition-colors duration-150 flex-1"
                    style={sort === o.value ? { ...sortGlow(), opacity: 1 } : { color: "#888" }}
                  >
                    {o.label}
                  </button>
                  {sort === o.value && (
                    <button
                      onClick={handleDirChange}
                      className="ml-1 text-[9px] text-[#888] px-2 py-1.5"
                    >
                      {sortDir === "desc" ? "▼" : "▲"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Genre filter */}
          <div>
            <p className="text-[9px] tracking-widest text-[#444] mb-2 uppercase">Genre</p>
            <div className="flex flex-col">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => changeGenre(g.value)}
                  className="text-left text-[11px] px-2 py-1.5 transition-colors duration-150"
                  style={{ color: genre === g.value ? "#e8e8e8" : "#888" }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset (only shown when filters are active) */}
          {isDirty && (
            <button
              onClick={() => { resetAll(); onClose(); }}
              className="text-[11px] text-[#888] hover:text-[#bbb] transition-colors text-left px-2"
            >
              Reset All
            </button>
          )}
        </div>
      </div>
    </>
  );
}
