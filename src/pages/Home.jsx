import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Link } from "react-router-dom";
import Lenis from "lenis";

import { ALBUMS } from "@/data/albums";
import { SPOTLIGHTS, GENRE_OPTIONS, SORT_OPTIONS } from "@/data/uiConstants";
import { tierGlowStyle } from "@/constants/theme";
import { isMatch, computeSorted, buildItems, animateColumnReveal } from "@/utils/albumUtils";

import { AlbumCell }         from "@/components/AlbumCell";
import { AlbumExpandedCell } from "@/components/AlbumExpandedCell";
import { SpotlightCell }     from "@/components/SpotlightCell";
import { EmptyCell, TierDividerCell, TierHeaderStrip } from "@/components/GridCells";
import { KnobToggle }        from "@/components/KnobToggle";
import { FooterSelect }      from "@/components/FooterSelect";
import { TierSlider, TierSliderVertical } from "@/components/TierSlider";
import { MobileFilterDrawer } from "@/components/MobileFilterDrawer";

// ─── Grid layout constants ─────────────────────────────────────────────────────
const CHROME  = 32 + 1 + 40; // header (32) + progress bar (1) + footer (40)
const ROW_H   = 131;          // card height in px
const COL_W   = 171;          // card width + 1px border

export default function Home() {
  // ── Filter / sort state ─────────────────────────────────────────────────────
  const [genre,    setGenre]    = useState("All");
  const [tier,     setTier]     = useState("All");
  const [sort,     setSort]     = useState("Rating");
  const [sortDir,  setSortDir]  = useState("asc");
  const [vinylOnly,  setVinylOnly]  = useState(false);
  const [newOnly,    setNewOnly]    = useState(false);
  const [coverArts,  setCoverArts]  = useState(false);
  const [grouped,   setGrouped]   = useState(() => window.innerWidth < 768);

  // ── View mode state ─────────────────────────────────────────────────────────
  const [listMode, setListMode] = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);
  const [progress,    setProgress]    = useState(0); // horizontal scroll progress 0–1

  // ── Mobile UI state ─────────────────────────────────────────────────────────
  const [mobileMenuOpen,      setMobileMenuOpen]      = useState(false);
  const [mobileMenuClosing,   setMobileMenuClosing]   = useState(false);
  const [mobileDrawerOpen,    setMobileDrawerOpen]    = useState(false);
  const [mobileDrawerClosing, setMobileDrawerClosing] = useState(false);
  const [mobileTierOpen,      setMobileTierOpen]      = useState(false);
  const [mobileTierClosing,   setMobileTierClosing]   = useState(false);
  const [mobileClosingId,     setMobileClosingId]     = useState(null);
  const [showTopBtn,    setShowTopBtn]    = useState(false);
  const [mobileHeaderUp, setMobileHeaderUp] = useState(true);

  // ── Dynamic grid dimensions (recalculated on resize) ────────────────────────
  const [rowCount,     setRowCount]     = useState(6);
  const [viewportCols, setViewportCols] = useState(8);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const gridRef          = useRef(null);
  const mainRef          = useRef(null);
  const mobileMainRef    = useRef(null);
  const listRef          = useRef(null);
  const listFlipRef      = useRef(null); // grid positions captured before switching to list
  const gridFlipRef      = useRef(null); // list positions captured before switching back to grid
  const lastScrollY      = useRef(0);
  const lenisRef         = useRef(null);
  const animModeRef      = useRef(null);   // "sort" | "expand" | "filter" | null
  const prevPosRef       = useRef({});     // FLIP position snapshot
  const videoRef         = useRef(null);
  const isInitialMount = useRef(true);
  const wasDragRef     = useRef(false);  // suppresses card click after drag

  // ── Grid dimension update ───────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      setRowCount(Math.max(2, Math.floor((window.innerHeight - CHROME) / ROW_H)));
      setViewportCols(Math.max(2, Math.floor(window.innerWidth / COL_W)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Derived state ───────────────────────────────────────────────────────────
  const sorted = useMemo(
    () => computeSorted(genre, tier, sort, vinylOnly, sortDir, newOnly),
    [genre, tier, sort, vinylOnly, sortDir, newOnly]
  );

  const isDefault = genre === "All" && tier === "All" && sort === "Rating" && sortDir === "asc" && !vinylOnly && !newOnly && !grouped;
  const hasFilter = !isDefault && (genre !== "All" || tier !== "All" || vinylOnly || newOnly);

  const matchedIds = useMemo(() => {
    if (!hasFilter) return null;
    return new Set(ALBUMS.filter((a) => isMatch(a, genre, tier, vinylOnly, newOnly)).map((a) => a.id));
  }, [genre, tier, vinylOnly, newOnly, hasFilter]);

  /** Flat item array for both desktop grid and mobile list */
  const items = useMemo(
    () => buildItems(sorted, isDefault, expandedId, rowCount, viewportCols, grouped),
    [sorted, isDefault, expandedId, rowCount, viewportCols, grouped]
  );

  /** Tier section metadata used by TierHeaderStrip in grouped mode */
  const tierSections = useMemo(() => {
    if (!grouped) return [];
    return ["S", "A", "B", "C", "D"].flatMap((t) => {
      const count = sorted.filter((a) => a.tier === t).length;
      if (count === 0) return [];
      return [{ tier: t, numCols: Math.max(1, Math.ceil(count / rowCount)) }];
    });
  }, [grouped, sorted, rowCount]);

  const gridTemplateCols = grouped && tierSections.length > 0
    ? tierSections.map(({ numCols }) => `4px ${"171px ".repeat(numCols).trim()}`).join(" ")
    : undefined;

  // ── List ↔ Grid FLIP layout animation ────────────────────────────────────────
  useLayoutEffect(() => {
    if (listMode) {
      // Opening: fly cards from their grid positions into the list
      if (!listFlipRef.current || !listRef.current) return;
      const prev = listFlipRef.current;
      listFlipRef.current = null;

      const cells = [...listRef.current.querySelectorAll("[data-album-id]")];
      cells.forEach((el, i) => {
        const id  = Number(el.dataset.albumId);
        const old = prev[id]; // undefined = was off-screen in grid
        const cur = el.getBoundingClientRect();
        animate(el, {
          opacity:    [old ? 0.7 : 0, 1],
          translateX: [old ? old.left - cur.left : 0, 0],
          translateY: [old ? old.top  - cur.top  : 0, 0],
          duration:   old ? 480 : 260,
          ease:       "outQuart",
          delay:      Math.min(i * 18, 200),
        });
      });
    } else {
      // Closing: fly grid cards back from their list positions
      if (!gridFlipRef.current || !gridRef.current) return;
      const prev = gridFlipRef.current;
      gridFlipRef.current = null;

      const cells = [...gridRef.current.querySelectorAll("[data-album-id]")];
      cells.forEach((el, i) => {
        const id  = Number(el.dataset.albumId);
        const old = prev[id];
        if (!old) return;
        const cur = el.getBoundingClientRect();
        // Only animate cards visible in the current grid viewport
        if (cur.right < 0 || cur.left > window.innerWidth) return;
        animate(el, {
          opacity:    [0.7, 1],
          translateX: [old.left - cur.left, 0],
          translateY: [old.top  - cur.top,  0],
          duration:   480,
          ease:       "outQuart",
          delay:      Math.min(i * 18, 200),
        });
      });
    }
  }, [listMode]);

  // ── Mobile scroll: back-to-top button + header auto-hide ───────────────────
  useEffect(() => {
    const el = mobileMainRef.current;
    if (!el) return;
    const onScroll = () => {
      const y      = el.scrollTop;
      const goingUp = y < lastScrollY.current;
      setShowTopBtn(goingUp && y > 80);
      setMobileHeaderUp(goingUp || y < 10);
      lastScrollY.current = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ── Mobile: scroll to top whenever filters/sort change ─────────────────────
  useEffect(() => {
    if (window.innerWidth < 768) {
      mobileMainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [sort, sortDir, genre, tier, vinylOnly, newOnly, grouped]);

  // ── Mobile panel close helpers (animate then unmount) ──────────────────────
  const closeMobileMenu   = () => { setMobileMenuClosing(true);   setTimeout(() => { setMobileMenuOpen(false);   setMobileMenuClosing(false);   }, 180); };
  const closeMobileDrawer = () => { setMobileDrawerClosing(true); setTimeout(() => { setMobileDrawerOpen(false); setMobileDrawerClosing(false); }, 260); };
  const closeMobileTier   = () => { setMobileTierClosing(true);   setTimeout(() => { setMobileTierOpen(false);   setMobileTierClosing(false);   }, 180); };

  // ── FLIP position snapshot helper ──────────────────────────────────────────
  function capturePositions() {
    const pos = {};
    gridRef.current?.querySelectorAll("[data-album-id], [data-spotlight-id]").forEach((el) => {
      const key = el.dataset.albumId ? Number(el.dataset.albumId) : el.dataset.spotlightId;
      pos[key] = el.getBoundingClientRect();
    });
    prevPosRef.current = pos;
  }

  // ── Expand / collapse ───────────────────────────────────────────────────────
  function handleExpand(albumId) {
    if (wasDragRef.current) { wasDragRef.current = false; return; }
    animModeRef.current = "expand";
    capturePositions();
    setExpandedId(albumId);
  }

  function handleCollapse() {
    if (window.innerWidth < 768 || listMode) {
      // Mobile + list mode: CSS class animate out before unmounting
      setMobileClosingId(expandedId);
      setTimeout(() => { setMobileClosingId(null); setExpandedId(null); }, 200);
      return;
    }
    animModeRef.current = "expand";
    capturePositions();
    setExpandedId(null);
  }

  // ── Transition helper: shrink spotlights when leaving default state ─────────
  function applyWithSpotlightTransition(willBeDefault, applyFn) {
    capturePositions();
    animModeRef.current = "sort";
    if (isDefault && !willBeDefault) {
      const els = gridRef.current ? [...gridRef.current.querySelectorAll("[data-spotlight-id]")] : [];
      if (els.length > 0) {
        animate(els, { scale: [1, 0], opacity: [1, 0], duration: 220, ease: "inQuart", delay: stagger(80) });
      }
    }
    applyFn(); // fire immediately — FLIP and spotlight shrink run in parallel
  }

  // ── Sort / filter / reset handlers ─────────────────────────────────────────
  function handleSortChange(newSort) {
    const defaultDir = newSort === "Year" ? "desc" : "asc";
    const wbd = genre === "All" && tier === "All" && newSort === "Rating" && defaultDir === "asc" && !vinylOnly && !newOnly && !grouped;
    applyWithSpotlightTransition(wbd, () => { setSort(newSort); setSortDir(defaultDir); });
  }

  function handleDirChange() {
    const newDir = sortDir === "desc" ? "asc" : "desc";
    const wbd = genre === "All" && tier === "All" && sort === "Rating" && newDir === "asc" && !vinylOnly && !newOnly && !grouped;
    applyWithSpotlightTransition(wbd, () => setSortDir(newDir));
  }

  function handleFilterChange(newGenre, newTier, newVinylOnly, newNewOnly) {
    const wbd = newGenre === "All" && newTier === "All" && sort === "Rating" && sortDir === "asc" && !newVinylOnly && !newNewOnly && !grouped;
    applyWithSpotlightTransition(wbd, () => {
      setGenre(newGenre); setTier(newTier); setVinylOnly(newVinylOnly); setNewOnly(newNewOnly);
    });
  }

  function resetAll() {
    if (isDefault) return;
    animModeRef.current = "sort";
    capturePositions();
    setGenre("All"); setTier("All"); setSort("Rating"); setSortDir("asc"); setVinylOnly(false); setNewOnly(false); setGrouped(false);
  }

  const changeGenre = (g) => handleFilterChange(g,    tier,  vinylOnly,  newOnly);
  const changeTier  = (t) => handleFilterChange(genre, t,    vinylOnly,  newOnly);
  const changeVinyl = ()  => handleFilterChange(genre, tier, !vinylOnly, newOnly);
  const changeNew   = ()  => handleFilterChange(genre, tier,  vinylOnly, !newOnly);

  const changeGroup = () => {
    const next = !grouped;
    const wbd  = genre === "All" && tier === "All" && sort === "Rating" && sortDir === "asc" && !vinylOnly && !newOnly && !next;
    applyWithSpotlightTransition(wbd, () => setGrouped(next));
  };

  const changeList = () => {
    if (listMode) {
      // Capture list positions before unmounting — used for reverse FLIP
      const positions = {};
      listRef.current?.querySelectorAll("[data-album-id]").forEach((el) => {
        positions[Number(el.dataset.albumId)] = el.getBoundingClientRect();
      });
      gridFlipRef.current = positions;
      setListMode(false);
    } else {
      // Capture only the grid cards currently visible in the viewport
      const positions = {};
      gridRef.current?.querySelectorAll("[data-album-id]").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > 0 && rect.left < window.innerWidth) {
          positions[Number(el.dataset.albumId)] = rect;
        }
      });
      listFlipRef.current = positions;
      setListMode(true);
    }
  };

  // ── Lenis horizontal scroll + drag + arrow keys (desktop grid) ──────────────
  useEffect(() => {
    const container = mainRef.current;
    if (!container) return;

    const lenis = new Lenis({
      wrapper:            container,
      content:            container.firstElementChild,
      orientation:        "horizontal",
      gestureOrientation: "both",
      smoothWheel:        true,
      wheelMultiplier:    1.2,
      touchMultiplier:    2,
    });
    lenisRef.current = lenis;

    let rafId;
    function tick(t) {
      lenis.raf(t);
      const max = container.scrollWidth - container.clientWidth;
      setProgress(max > 0 ? container.scrollLeft / max : 0);

      // Video parallax: moves slower than the scroll (scale(1.5) gives room)
      if (videoRef.current) {
        const card       = videoRef.current.parentElement;
        const rect       = card.getBoundingClientRect();
        const normalized = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
        videoRef.current.style.transform = `scale(1.5) translateX(${normalized * -70}px)`;
      }

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    // Drag-to-scroll
    let dragStartX = 0, dragScrollLeft = 0, dragging = false, didDrag = false;
    const onMouseDown = (e) => { dragging = true; didDrag = false; dragStartX = e.clientX; dragScrollLeft = container.scrollLeft; container.style.cursor = "grabbing"; };
    const onMouseMove = (e) => { if (!dragging) return; const dx = e.clientX - dragStartX; if (Math.abs(dx) > 4) didDrag = true; if (didDrag) lenis.scrollTo(dragScrollLeft - dx, { immediate: true }); };
    const onMouseUp   = ()  => { if (didDrag) wasDragRef.current = true; dragging = false; container.style.cursor = ""; };

    // Arrow key navigation
    const onKeyDown = (e) => {
      if (e.key === "ArrowRight") lenis.scrollTo(container.scrollLeft + 280, { duration: 0.5 });
      if (e.key === "ArrowLeft")  lenis.scrollTo(container.scrollLeft - 280, { duration: 0.5 });
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    window.addEventListener("keydown",   onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
      window.removeEventListener("keydown",   onKeyDown);
    };
  }, []);

  // Reset scroll position on any filter/sort change
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    setProgress(0);
  }, [genre, tier, sort, sortDir, vinylOnly, newOnly, grouped]);

  // ── FLIP sort animation + initial entrance ──────────────────────────────────
  useLayoutEffect(() => {
    const mode = animModeRef.current;
    animModeRef.current = null;
    if (!gridRef.current) return;

    if (isInitialMount.current) {
      // First load: column reveal entrance animation
      isInitialMount.current = false;
      animateColumnReveal(gridRef.current);
    } else if (mode === "sort" || mode === "expand") {
      // FLIP: animate each card from its previous position to its new one
      const prev  = prevPosRef.current;
      const cells = [...gridRef.current.querySelectorAll("[data-album-id], [data-spotlight-id]")];
      const DUR   = mode === "expand" ? 420 : undefined;

      cells.forEach((el) => {
        const id  = el.dataset.albumId ? Number(el.dataset.albumId) : el.dataset.spotlightId;
        const old = prev[id];
        if (!old) return;
        const cur = el.getBoundingClientRect();
        const dx  = old.left   - cur.left;
        const dy  = old.top    - cur.top;
        const sx  = old.width  / cur.width;
        const sy  = old.height / cur.height;
        const isScaling = Math.abs(sx - 1) > 0.02 || Math.abs(sy - 1) > 0.02;
        const isMoving  = Math.abs(dx) > 0.5  || Math.abs(dy) > 0.5;
        if (!isScaling && !isMoving) return;

        if (isScaling) {
          el.style.transformOrigin = "top left";
          animate(el, {
            translateX: [dx, 0], translateY: [dy, 0],
            scaleX: [sx, 1],     scaleY: [sy, 1],
            duration: DUR ?? 420, ease: "outQuart",
          });
          setTimeout(() => { el.style.transformOrigin = ""; }, (DUR ?? 420) + 20);
        } else {
          animate(el, {
            translateX: [dx, 0], translateY: [dy, 0],
            duration: DUR ?? (380 + Math.random() * 180),
            ease:     "outQuart",
            delay:    mode === "expand" ? Math.random() * 40 : Math.random() * 80,
          });
        }
      });
    } else if (mode === "filter") {
      animate(gridRef.current.querySelectorAll(".gcell"), {
        opacity: [0, 1], scale: [0.88, 1],
        delay: stagger(16), duration: 320, ease: "outQuart",
      });
    }

    // Always snapshot positions after render for the next FLIP
    const pos = {};
    gridRef.current.querySelectorAll("[data-album-id], [data-spotlight-id]").forEach((el) => {
      const key = el.dataset.albumId ? Number(el.dataset.albumId) : el.dataset.spotlightId;
      pos[key] = el.getBoundingClientRect();
    });
    prevPosRef.current = pos;
  }, [items]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#0c0c0c] md:overflow-hidden">

      {/* ── Desktop header ── */}
      <header className="h-8 shrink-0 hidden md:flex items-center justify-between bg-[#0c0c0c] border-b border-[#1a1a1a] px-4">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-[#e8e8e8] font-bold tracking-widest">Terry's Album List</span>
          <span className="text-[#444]">·</span>
          <span className="text-[#888]">{hasFilter ? (matchedIds?.size ?? 0) : ALBUMS.length} albums</span>
        </div>
        <nav className="flex items-center gap-2 font-mono text-[9px]">
          <Link to="/about"     className="text-[#888] hover:text-white border border-[#2a2a2a] hover:border-white px-1.5 py-0.5 tracking-widest transition-colors duration-150">ABOUT</Link>
          <Link to="/changelog" className="text-[#888] hover:text-white border border-[#2a2a2a] hover:border-white px-1.5 py-0.5 tracking-widest transition-colors duration-150">CHANGELOG</Link>
        </nav>
      </header>

      {/* ── Mobile header (fixed, auto-hides on scroll-down) ── */}
      <header
        className="md:hidden bg-[#0c0c0c] border-b border-[#1a1a1a]"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 20,
          transform: mobileHeaderUp ? "translateY(0)" : "translateY(-100%)",
          transition: "transform 280ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <div className="h-12 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-[#e8e8e8] font-bold tracking-widest">Terry's Album List</span>
            <span className="text-[#444]">·</span>
            <span className="text-[#888]">{hasFilter ? (matchedIds?.size ?? 0) : ALBUMS.length} albums</span>
          </div>
          <button
            onClick={() => mobileMenuOpen ? closeMobileMenu() : setMobileMenuOpen(true)}
            className="flex flex-col gap-[5px] p-2 text-[#888] hover:text-white transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <span className="font-mono text-[13px] leading-none">✕</span>
            ) : (
              <>
                <span className="block w-5 h-px bg-current" />
                <span className="block w-5 h-px bg-current" />
                <span className="block w-5 h-px bg-current" />
              </>
            )}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className={`flex gap-2 px-4 pb-3 font-mono text-[9px] tracking-widest ${mobileMenuClosing ? "mobile-menu-out" : "mobile-menu-in"}`}>
            <Link to="/about"     onClick={closeMobileMenu} className="text-[#888] hover:text-white border border-[#2a2a2a] hover:border-white px-1.5 py-0.5 transition-colors duration-150">ABOUT</Link>
            <Link to="/changelog" onClick={closeMobileMenu} className="text-[#888] hover:text-white border border-[#2a2a2a] hover:border-white px-1.5 py-0.5 transition-colors duration-150">CHANGELOG</Link>
          </div>
        )}
      </header>

      {/* ── Desktop: list mode ── */}
      {listMode && (
        <main className="flex-1 overflow-y-auto hidden md:block no-scrollbar bg-[#111111]">
          <div ref={listRef} className="max-w-[900px] mx-auto">
            {items.filter((i) => i.type !== "empty" && i.type !== "spotlight").map((item) => {
              if (item.type === "divider") return (
                <div key={item.id} className="border-b border-[#1c1c1c] px-4 py-2 flex items-center gap-3">
                  <span className="font-mono text-[10px]" style={tierGlowStyle(item.tier)}>{item.tier}</span>
                  <div className="flex-1 h-px bg-[#1c1c1c]" />
                </div>
              );
              return (
                <div key={item.id} className="border-b border-[#1c1c1c]">
                  {item.type === "expanded"
                    ? <div className={mobileClosingId === item.id ? "mobile-card-close" : "mobile-card-open"}><AlbumExpandedCell album={item} onCollapse={handleCollapse} sort={sort} /></div>
                    : <AlbumCell album={item} onExpand={handleExpand} hasFilter={hasFilter} matched={!matchedIds || matchedIds.has(item.id)} sort={sort} isDefault={isDefault} compact coverArts={coverArts} className="border-r-0" />
                  }
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* ── Desktop: horizontal scroll grid ── */}
      <main
        ref={mainRef}
        className={`flex-1 overflow-x-scroll overflow-y-hidden no-scrollbar cursor-grab ${listMode ? "hidden" : "hidden md:block"}`}
      >
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full font-mono text-[11px] text-[#333]">
            No albums match.
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {grouped && <TierHeaderStrip tierSections={tierSections} />}
            <div
              ref={gridRef}
              className="grid flex-1 border-t border-l border-[#1c1c1c]"
              style={{
                gridTemplateRows:    `repeat(${rowCount}, 1fr)`,
                gridTemplateColumns: gridTemplateCols,
                gridAutoColumns:     "170px",
                gridAutoFlow:        "column dense",
              }}
            >
              {items.map((item) =>
                item.type === "empty"
                  ? <EmptyCell         key={item.id} />
                  : item.type === "divider"
                  ? <TierDividerCell   key={item.id} tier={item.tier} />
                  : item.type === "spotlight"
                  ? (coverArts ? <EmptyCell key={item.id} /> : <SpotlightCell key={item.id} item={item} videoRef={item.id === "s2" ? videoRef : null} />)
                  : item.type === "expanded"
                  ? <AlbumExpandedCell key={item.id} album={item} onCollapse={handleCollapse} sort={sort} />
                  : <AlbumCell        key={item.id} album={item} onExpand={handleExpand} hasFilter={hasFilter} matched={!matchedIds || matchedIds.has(item.id)} sort={sort} isDefault={isDefault} coverArts={coverArts} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Mobile: single-column scroll list ── */}
      <main ref={mobileMainRef} className="flex-1 overflow-y-auto md:hidden pb-12 pt-12 no-scrollbar">
        {/* Welcome spotlight always at top */}
        <div style={{ height: 200 }} className="border-b border-[#1c1c1c] shrink-0">
          <SpotlightCell item={SPOTLIGHTS[0]} />
        </div>
        <div className="border-l border-[#1c1c1c]">
          {items.filter((i) => i.type !== "empty" && i.type !== "spotlight").map((item) => {
            if (item.type === "divider") return (
              <div key={item.id} className="border-b border-r border-[#1c1c1c] px-4 py-2 flex items-center gap-3">
                <span className="font-mono text-[10px]" style={tierGlowStyle(item.tier)}>{item.tier}</span>
                <div className="flex-1 h-px bg-[#1c1c1c]" />
              </div>
            );
            return (
              <div key={item.id} className="border-b border-r border-[#1c1c1c]">
                {item.type === "expanded"
                  ? <div className={mobileClosingId === item.id ? "mobile-card-close" : "mobile-card-open"}><AlbumExpandedCell album={item} onCollapse={handleCollapse} sort={sort} /></div>
                  : <AlbumCell album={item} onExpand={handleExpand} hasFilter={hasFilter} matched={!matchedIds || matchedIds.has(item.id)} sort={sort} isDefault={isDefault} coverArts={coverArts} />
                }
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Desktop: horizontal scroll progress bar ── */}
      <div className="h-px shrink-0 bg-[#1a1a1a] hidden md:block">
        <div className="h-full bg-[#3a3a3a]" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* ── Desktop: bottom filter bar ── */}
      <footer className="h-10 shrink-0 hidden md:flex items-center justify-between bg-[#0c0c0c] px-4">
        {/* Left: view + filter toggles */}
        <div className="flex items-center gap-4">
          <KnobToggle active={listMode}  onClick={changeList}             label="List" />
          <KnobToggle active={coverArts} onClick={() => setCoverArts(v => !v)} label="Cover Art" />
          <KnobToggle active={grouped}   onClick={changeGroup}            label="Group" />
          <KnobToggle active={newOnly}   onClick={changeNew}              label="New" />
          <KnobToggle active={vinylOnly} onClick={changeVinyl}            label="Own Vinyl" />
        </div>

        {/* Center: genre + sort dropdowns + reset */}
        <div className="flex items-center gap-3">
          <FooterSelect value={genre} onChange={changeGenre} options={GENRE_OPTIONS} />
          <span className="text-[#222]">·</span>
          <div className="flex items-center gap-1">
            <FooterSelect value={sort} onChange={handleSortChange} options={SORT_OPTIONS} />
            <button
              onClick={handleDirChange}
              className="font-mono text-[9px] text-[#888] hover:text-[#bbb] transition-colors duration-150 inline-flex items-center"
            >
              {sortDir === "desc" ? "▼" : "▲"}
            </button>
          </div>
          {(sort !== "Rating" || sortDir !== "asc" || genre !== "All" || tier !== "All" || vinylOnly || newOnly || grouped) && (
            <>
              <span className="text-[#333]">·</span>
              <button
                onClick={resetAll}
                className="font-mono text-[11px] text-[#888] hover:text-[#bbb] transition-colors duration-150 leading-none"
              >
                Reset
              </button>
            </>
          )}
        </div>

        {/* Right: tier pitch slider */}
        <div className="relative self-stretch">
          <TierSlider value={tier} onChange={changeTier} />
        </div>
      </footer>

      {/* ── Mobile overlays + bottom bar ── */}
      <div className="md:hidden">
        {/* Left filter drawer */}
        {mobileDrawerOpen && (
          <MobileFilterDrawer
            newOnly={newOnly}     changeNew={changeNew}
            vinylOnly={vinylOnly} changeVinyl={changeVinyl}
            grouped={grouped}     changeGroup={changeGroup}
            sort={sort}           handleSortChange={handleSortChange}
            sortDir={sortDir}     handleDirChange={handleDirChange}
            genre={genre}         changeGenre={changeGenre}
            tier={tier}           resetAll={resetAll}
            closing={mobileDrawerClosing}
            onClose={closeMobileDrawer}
          />
        )}

        {/* Tier filter panel (slides up from bottom-right) */}
        {mobileTierOpen && (
          <div className={`fixed bottom-12 right-0 z-[60] bg-[#0e0e0e] border border-[#222] border-b-0 p-2 ${mobileTierClosing ? "mobile-tier-out" : "mobile-tier-in"}`}>
            <TierSliderVertical value={tier} onChange={(t) => { changeTier(t); closeMobileTier(); }} />
          </div>
        )}

        {/* Back-to-top button (appears when scrolling up past 80px) */}
        {showTopBtn && (
          <button
            onClick={() => mobileMainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-16 right-4 z-50 font-mono text-[9px] tracking-widest text-[#888] hover:text-white border border-[#2a2a2a] hover:border-white bg-[#0e0e0e] px-2.5 py-1.5 transition-colors duration-150"
            style={{ animation: "mobile-card-open 180ms ease both" }}
          >
            ↑ TOP
          </button>
        )}

        {/* Fixed bottom bar with Filters + Tier buttons */}
        <div className="fixed bottom-0 inset-x-0 z-40 h-12 bg-[#0c0c0c] border-t border-[#1a1a1a] flex items-center justify-between px-4">
          <button
            onClick={() => { mobileDrawerOpen ? closeMobileDrawer() : setMobileDrawerOpen(true); if (mobileTierOpen) closeMobileTier(); }}
            className="font-mono text-[10px] tracking-widest transition-colors duration-150 flex items-center gap-2"
            style={{ color: mobileDrawerOpen ? "#e8e8e8" : "#888" }}
          >
            <svg width="13" height="12" viewBox="0 0 13 12" fill="currentColor">
              <rect x="3" y="0" width="1" height="12" rx="0.5"/>
              <rect x="1" y="3" width="5" height="2" rx="1"/>
              <rect x="9" y="0" width="1" height="12" rx="0.5"/>
              <rect x="7" y="7" width="5" height="2" rx="1"/>
            </svg>
            <span>Filters</span>
          </button>
          <button
            onClick={() => { mobileTierOpen ? closeMobileTier() : setMobileTierOpen(true); if (mobileDrawerOpen) closeMobileDrawer(); }}
            className="font-mono text-[10px] tracking-widest transition-colors duration-150 flex items-center gap-2"
            style={{ color: mobileTierOpen ? "#e8e8e8" : "#888" }}
          >
            <span>Tier</span>
            <span style={tier !== "All" ? tierGlowStyle(tier) : { color: "#e8e8e8" }}>
              {tier}
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}
