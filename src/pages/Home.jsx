import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Link } from "react-router-dom";
import Lenis from "lenis";
import { ALBUMS, GENRES } from "@/data/albums";
import { cn } from "@/lib/utils";
import VinylIcon from "@/components/ui/VinylIcon";
import albumsBgVideo from "@/assets/65390-514139029_tiny.mp4";

// ─── Spotlight cards ──────────────────────────────────────────────────────────
const SPOTLIGHTS = [
  {
    id: "s1",
    type: "spotlight",
    eyebrow: "WELCOME",
    title: "Terry's\nAlbum List",
    body: "My List. My Music.",
  },
  {
    id: "s2",
    type: "spotlight",
    eyebrow: "COLLECTION",
    title: `${ALBUMS.length}\nAlbums`,
    body: "Hip-Hop · R&B · J-Pop · and more",
  },
];

const TIER_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4 };

function buildItems(albums, showSpotlights, expandedId) {
  const items = albums.map((a, i) => ({
    ...a,
    type: a.id === expandedId ? "expanded" : "album",
    seq: i + 1,
  }));
  // Keep spotlights in the layout at all times (removing them shifts grid positions left,
  // which causes the FLIP animation to incorrectly animate cards "leftward")
  if (showSpotlights) {
    if (items.length > 7)  items.splice(7,  0, SPOTLIGHTS[0]);
    if (items.length > 48) items.splice(48, 0, SPOTLIGHTS[1]);
  }
  return items;
}

// Standalone sort/filter computation (used for both rendering and exit-preview)
function computeSorted(g, t, s, vo, dir) {
  let list = ALBUMS.filter(
    (a) => (g === "All" || a.genre === g) && (t === "All" || a.tier === t)
  );
  if (vo) list = list.filter((a) => a.vinyl);
  const asc = dir === "asc";
  switch (s) {
    case "Rating": list.sort((a, b) => asc ? TIER_ORDER[b.tier] - TIER_ORDER[a.tier] : TIER_ORDER[a.tier] - TIER_ORDER[b.tier]); break;
    case "Album":  list.sort((a, b) => asc ? a.title.localeCompare(b.title)   : b.title.localeCompare(a.title));                  break;
    case "Artist": list.sort((a, b) => asc ? a.artist.localeCompare(b.artist) : b.artist.localeCompare(a.artist));                break;
    case "Genre":  list.sort((a, b) => asc ? a.genre.localeCompare(b.genre)   : b.genre.localeCompare(a.genre));                  break;
    case "Year":   list.sort((a, b) => asc ? a.year - b.year                  : b.year - a.year);                                 break;
  }
  return list;
}

// ─── Column-reveal animation (initial load only) ─────────────────────────────
function animateColumnReveal(gridEl) {
  const allCells      = [...gridEl.querySelectorAll(".gcell")];
  const spotlightCells = allCells.filter((el) => el.classList.contains("col-span-2"));
  const regularCells   = allCells.filter((el) => !el.classList.contains("col-span-2"));

  // Hide everything before any frame paints
  allCells.forEach((el) => { el.style.opacity = "0"; });

  // Group regular album cells by their column (left offset)
  const colMap = new Map();
  regularCells.forEach((el) => {
    const left = Math.round(el.getBoundingClientRect().left);
    if (!colMap.has(left)) colMap.set(left, []);
    colMap.get(left).push(el);
  });

  const sortedCols = [...colMap.entries()].sort((a, b) => a[0] - b[0]);

  sortedCols.forEach(([, colCells], colIdx) => {
    animate(colCells, {
      opacity:    [0, 1],
      translateX: [-16, 0],
      duration:   400,
      ease:       "outQuart",
      delay:      colIdx * 35,
    });
  });

  // Spotlight 2×2 cards appear after all album columns finish, one after the other
  const afterAlbums = (sortedCols.length - 1) * 35 + 400 + 100;
  spotlightCells.forEach((el, i) => {
    animate(el, {
      opacity:    [0, 1],
      translateX: [-16, 0],
      duration:   420,
      ease:       "outQuart",
      delay:      afterAlbums + i * 180,
    });
  });
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function useTime() {
  const fmt = () =>
    new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });
  const [time, setTime] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 15_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ─── Shared tilt handlers ─────────────────────────────────────────────────────
function useTilt(rx = 14, ry = 18, sc = 1.09, perspective = 500) {
  const ref = useRef(null);
  function onMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x  = (e.clientX - left) / width;
    const y  = (e.clientY - top)  / height;
    const rX = (0.5 - y) * rx;
    const rY = (x - 0.5) * ry;
    el.style.transition = "background-color 150ms";
    el.style.transform  = `perspective(${perspective}px) rotateX(${rX}deg) rotateY(${rY}deg) scale(${sc})`;
    el.style.zIndex     = "10";
  }
  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 500ms cubic-bezier(0.23,1,0.32,1), background-color 150ms";
    el.style.transform  = "";
    el.style.zIndex     = "";
  }
  return { ref, onMouseMove, onMouseLeave };
}

// ─── Album cell ───────────────────────────────────────────────────────────────
function AlbumCell({ album, onExpand }) {
  const { ref: cardRef, onMouseMove, onMouseLeave } = useTilt(14, 18, 1.09, 500);

  return (
    <div
      ref={cardRef}
      data-album-id={album.id}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={() => onExpand(album.id)}
      className="gcell group bg-[#111111] p-4 flex flex-col justify-between cursor-pointer
                  hover:bg-[#181818]"
      style={{ willChange: "transform", position: "relative" }}
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] text-[#383838] transition-colors duration-250 group-hover:text-white">
          {String(album.seq).padStart(2, "0")}
        </span>
        <span className="font-mono text-[10px] text-[#383838] transition-colors duration-250 group-hover:text-white">{album.tier}</span>
      </div>
      <div className="mt-2 flex-1">
        <p className="text-[12.5px] font-medium text-[#bfbfbf] leading-snug line-clamp-2 transition-colors duration-250 group-hover:text-white">
          {album.crowned && <span className="mr-1 text-[#666] transition-colors duration-250 group-hover:text-white">♛</span>}
          {album.title}
        </p>
        <p className="text-[10.5px] text-[#484848] mt-0.5 truncate transition-colors duration-250 group-hover:text-white">{album.artist}</p>
      </div>
      <div className="flex items-end justify-between mt-2">
        <span className="font-mono text-[10px] text-[#383838] transition-colors duration-250 group-hover:text-white">{album.year}</span>
        {album.vinyl && <VinylIcon className="text-[#383838] transition-colors duration-250 group-hover:text-white" />}
      </div>
    </div>
  );
}

// ─── Expanded album cell (2×2) ────────────────────────────────────────────────
function AlbumExpandedCell({ album, onCollapse }) {
  const { ref: cardRef, onMouseMove, onMouseLeave } = useTilt(10, 14, 1.03, 700);

  return (
    <div
      ref={cardRef}
      data-album-id={album.id}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onCollapse}
      className="gcell col-span-2 row-span-2 bg-[#161616] p-6 flex flex-col justify-between
                  cursor-pointer hover:bg-[#1c1c1c] relative overflow-hidden"
      style={{ willChange: "transform" }}
    >
      {/* subtle top-left glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff04] to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between">
        <span className="font-mono text-[10px] text-white">{String(album.seq).padStart(2, "0")}</span>
        <span className="font-mono text-[10px] text-white">{album.tier}</span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center mt-4">
        <p className="text-[22px] font-bold text-white leading-tight tracking-tight">
          {album.crowned && <span className="mr-2 text-white">♛</span>}
          {album.title}
        </p>
        <p className="text-[13px] text-white/60 mt-1.5">{album.artist}</p>
        <p className="font-mono text-[10px] text-white/30 mt-3 tracking-widest uppercase">
          {album.genre}
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {album.vinyl && <VinylIcon className="text-white/50" />}
          <span className="font-mono text-[10px] text-white/50">{album.year}</span>
        </div>
        <span className="font-mono text-[9px] text-white/20 tracking-widest">CLICK TO CLOSE</span>
      </div>
    </div>
  );
}

// ─── Spotlight cell (2×2) ─────────────────────────────────────────────────────
function SpotlightCell({ item, videoRef }) {
  const hasVideo = item.id === "s2";
  const cardRef  = useRef(null);

  function onMouseMove(e) {
    const el = cardRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x  = (e.clientX - left) / width;
    const y  = (e.clientY - top)  / height;
    const rx = (0.5 - y) * 10;
    const ry = (x - 0.5) * 14;
    el.style.transition = "";
    el.style.transform  = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.03)`;
    el.style.zIndex     = "10";
  }

  function onMouseLeave() {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = "transform 500ms cubic-bezier(0.23,1,0.32,1)";
    el.style.transform  = "";
    el.style.zIndex     = "";
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      data-spotlight-id={item.id}
      className="gcell col-span-2 row-span-2 bg-[#0f0f0f] p-6 flex flex-col justify-end
                  relative overflow-hidden cursor-default"
      style={{ willChange: "transform" }}
    >
      {hasVideo && (
        <video
          ref={videoRef}
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: "20% center", willChange: "transform" }}
        >
          <source src={albumsBgVideo} type="video/mp4" />
        </video>
      )}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#1c1c1c] via-[#111111] to-[#080808]"
        style={{ opacity: hasVideo ? 0.2 : 1 }}
      />
      <div className="relative z-10">
        <p className="font-mono text-[9px] tracking-[0.25em] text-[#c8c8c8] mb-4 uppercase">
          {item.eyebrow}
        </p>
        <h2 className="text-[26px] font-bold text-[#c8c8c8] leading-tight whitespace-pre-line tracking-tight">
          {item.title}
        </h2>
        <p className="text-[11px] text-[#c8c8c8] mt-3 leading-relaxed">{item.body}</p>
      </div>
    </div>
  );
}

// ─── Filter tab ───────────────────────────────────────────────────────────────
function FilterTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "font-mono text-[11px] transition-colors duration-150",
        active ? "text-[#e0e0e0]" : "text-[#404040] hover:text-[#888888]"
      )}
    >
      {label}
    </button>
  );
}

// ─── Dropdown select ──────────────────────────────────────────────────────────
function FooterSelect({ value, onChange, options }) {
  const [visible, setVisible] = useState(false);
  const listRef = useRef(null);
  const wrapRef = useRef(null);

  const open = () => setVisible(true);

  const close = () => {
    if (listRef.current) {
      animate(listRef.current, {
        scaleY:   [1, 0],
        opacity:  [1, 0],
        duration: 140,
        ease:     "inQuart",
      });
      setTimeout(() => setVisible(false), 145);
    } else {
      setVisible(false);
    }
  };

  const toggle = () => (visible ? close() : open());

  useEffect(() => {
    if (visible && listRef.current) {
      animate(listRef.current, {
        scaleY:   [0, 1],
        opacity:  [0, 1],
        duration: 200,
        ease:     "outQuart",
      });
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (!wrapRef.current?.contains(e.target)) close(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={toggle}
        className={cn(
          "font-mono text-[11px] transition-colors duration-150",
          visible ? "text-[#e0e0e0]" : "text-[#404040] hover:text-[#888888]"
        )}
      >
        {selected?.label}
      </button>
      {visible && (
        <div
          ref={listRef}
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2"
          style={{
            opacity: 0,
            scaleY: 0,
            transformOrigin: "bottom",
            background: "#0c0c0c",
          }}
        >
          {options.map(({ value: v, label }) => (
            <button
              key={v}
              onClick={() => { onChange(v); close(); }}
              className={cn(
                "w-full text-center font-mono text-[11px] px-5 whitespace-nowrap transition-colors duration-100",
                v === value ? "text-[#e0e0e0]" : "text-[#505050] hover:text-white"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const GENRE_OPTIONS = [{ value: "All", label: "All Genres" }, ...GENRES.map((g) => ({ value: g, label: g }))];
const SORT_OPTIONS  = [
  { value: "Rating", label: "Rating" },
  { value: "Album",  label: "Album"  },
  { value: "Artist", label: "Artist" },
  { value: "Genre",  label: "Genre"  },
  { value: "Year",   label: "Year"   },
];
const TIER_TABS = ["All", "S", "A", "B", "C", "D"];

export default function Home() {
  const [genre,      setGenre]      = useState("All");
  const [tier,       setTier]       = useState("All");
  const [sort,       setSort]       = useState("Rating");
  const [sortDir,    setSortDir]    = useState("desc");
  const [vinylOnly,  setVinylOnly]  = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [progress,   setProgress]   = useState(0);

  const gridRef        = useRef(null);
  const mainRef        = useRef(null);
  const lenisRef       = useRef(null);
  const animModeRef    = useRef(null);       // 'filter' | 'sort'
  const prevPosRef     = useRef({});         // { [albumId]: DOMRect }
  const videoRef       = useRef(null);
  const isInitialMount = useRef(true);
  const time = useTime();

  // ── Dynamic row count ─────────────────────────────────────────────────────
  const [rowCount, setRowCount] = useState(6);
  useEffect(() => {
    const CHROME = 32 + 1 + 40;
    const ROW_H  = 131;
    const update = () =>
      setRowCount(Math.max(2, Math.floor((window.innerHeight - CHROME) / ROW_H)));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const sorted = useMemo(() => computeSorted(genre, tier, sort, vinylOnly, sortDir), [genre, tier, sort, vinylOnly, sortDir]);

  const isDefault = genre === "All" && tier === "All" && sort === "Rating" && sortDir === "desc" && !vinylOnly;
  const items     = useMemo(() => buildItems(sorted, isDefault, expandedId), [sorted, isDefault, expandedId]);

  // ── Position snapshot helper ──────────────────────────────────────────────
  function capturePositions() {
    const pos = {};
    gridRef.current?.querySelectorAll("[data-album-id], [data-spotlight-id]").forEach((el) => {
      const key = el.dataset.albumId
        ? Number(el.dataset.albumId)
        : el.dataset.spotlightId;
      pos[key] = el.getBoundingClientRect();
    });
    prevPosRef.current = pos;
  }

  // ── Expand / collapse ─────────────────────────────────────────────────────
  function handleExpand(albumId) {
    animModeRef.current = "expand";
    capturePositions();
    setExpandedId(albumId);
  }

  function handleCollapse() {
    animModeRef.current = "expand";
    capturePositions();
    setExpandedId(null);
  }

  // ── Sort change: capture → FLIP ───────────────────────────────────────────
  function handleSortChange(newSort) {
    animModeRef.current = "sort";
    capturePositions();
    setSort(newSort);
  }

  function handleDirChange() {
    animModeRef.current = "sort";
    capturePositions();
    setSortDir((d) => (d === "desc" ? "asc" : "desc"));
  }

  // ── Filter change: animate exits → update state ───────────────────────────
  function handleFilterChange(newGenre, newTier, newVinylOnly) {
    const newIds    = new Set(computeSorted(newGenre, newTier, sort, newVinylOnly, sortDir).map((a) => a.id));
    const exitIds   = new Set(sorted.filter((a) => !newIds.has(a.id)).map((a) => a.id));
    const exitEls   = gridRef.current
      ? [...gridRef.current.querySelectorAll("[data-album-id]")].filter(
          (el) => exitIds.has(Number(el.dataset.albumId))
        )
      : [];

    const apply = () => {
      animModeRef.current = "filter";
      setGenre(newGenre);
      setTier(newTier);
      setVinylOnly(newVinylOnly);
    };

    if (exitEls.length > 0) {
      animate(exitEls, {
        scale:    [1, 0],
        opacity:  [1, 0],
        duration: 160,
        ease:     "inQuart",
        delay:    stagger(8),
      });
      setTimeout(apply, 200);
    } else {
      apply();
    }
  }

  const changeGenre = (g)  => handleFilterChange(g, tier, vinylOnly);
  const changeTier  = (t)  => handleFilterChange(genre, t, vinylOnly);
  const changeVinyl = ()   => handleFilterChange(genre, tier, !vinylOnly);

  // ── Lenis horizontal scroll ───────────────────────────────────────────────
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

      // Parallax: video translates slower than the card (scale(1.15) gives ~25% room each side)
      if (videoRef.current) {
        const card = videoRef.current.parentElement;
        const rect = card.getBoundingClientRect();
        const normalized = (rect.left + rect.width / 2) / window.innerWidth - 0.5;
        const offset = normalized * -70;
        videoRef.current.style.transform = `scale(1.5) translateX(${offset}px)`;
      }

      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    // ── Drag to scroll ──────────────────────────────────────────────────────
    let dragStartX    = 0;
    let dragScrollLeft = 0;
    let dragging      = false;
    let didDrag       = false;

    function onMouseDown(e) {
      dragging       = true;
      didDrag        = false;
      dragStartX     = e.clientX;
      dragScrollLeft = container.scrollLeft;
      container.style.cursor = "grabbing";
    }

    function onMouseMove(e) {
      if (!dragging) return;
      const dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 4) didDrag = true;
      if (didDrag) lenis.scrollTo(dragScrollLeft - dx, { immediate: true });
    }

    function onMouseUp() {
      dragging = false;
      container.style.cursor = "";
    }

    // ── Arrow key navigation ─────────────────────────────────────────────────
    function onKeyDown(e) {
      if (e.key === "ArrowRight") lenis.scrollTo(container.scrollLeft + 280, { duration: 0.5 });
      if (e.key === "ArrowLeft")  lenis.scrollTo(container.scrollLeft - 280, { duration: 0.5 });
    }

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove",    onMouseMove);
    window.addEventListener("mouseup",      onMouseUp);
    window.addEventListener("keydown",      onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove",    onMouseMove);
      window.removeEventListener("mouseup",      onMouseUp);
      window.removeEventListener("keydown",      onKeyDown);
    };
  }, []);

  // ── Reset scroll on any change ────────────────────────────────────────────
  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
    setProgress(0);
  }, [genre, tier, sort, sortDir, vinylOnly]);

  // ── FLIP (sort) + entrance (filter) + initial load ───────────────────────
  useLayoutEffect(() => {
    const mode = animModeRef.current;
    animModeRef.current = null;
    if (!gridRef.current) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      animateColumnReveal(gridRef.current);
    } else if (mode === "sort" || mode === "expand") {
      const prev    = prevPosRef.current;
      const cells   = [...gridRef.current.querySelectorAll("[data-album-id], [data-spotlight-id]")];
      const DUR     = mode === "expand" ? 420 : undefined;
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
        const isMoving  = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
        if (!isScaling && !isMoving) return;

        if (isScaling) {
          // The expanding/collapsing card — FLIP with scale from top-left origin
          el.style.transformOrigin = "top left";
          animate(el, {
            translateX: [dx, 0],
            translateY: [dy, 0],
            scaleX:     [sx, 1],
            scaleY:     [sy, 1],
            duration:   DUR ?? 420,
            ease:       "outQuart",
          });
          setTimeout(() => { el.style.transformOrigin = ""; }, (DUR ?? 420) + 20);
        } else {
          animate(el, {
            translateX: [dx, 0],
            translateY: [dy, 0],
            duration:   DUR ?? (380 + Math.random() * 180),
            ease:       "outQuart",
            delay:      mode === "expand" ? Math.random() * 40 : Math.random() * 80,
          });
        }
      });
    } else if (mode === "filter") {
      const cells = gridRef.current.querySelectorAll(".gcell");
      animate(cells, {
        opacity:  [0, 1],
        scale:    [0.88, 1],
        delay:    stagger(16),
        duration: 320,
        ease:     "outQuart",
      });
    }

    // Always snapshot positions after render for next FLIP
    const pos = {};
    gridRef.current.querySelectorAll("[data-album-id], [data-spotlight-id]").forEach((el) => {
      const key = el.dataset.albumId
        ? Number(el.dataset.albumId)
        : el.dataset.spotlightId;
      pos[key] = el.getBoundingClientRect();
    });
    prevPosRef.current = pos;
  }, [items]);

  return (
    <div className="h-screen flex flex-col bg-[#0c0c0c] overflow-hidden">

      {/* ── Header ── */}
      <header
        className="h-8 shrink-0 flex items-center justify-between bg-[#0c0c0c] border-b border-[#1a1a1a]"
        style={{ paddingLeft: "16px", paddingRight: "16px" }}
      >
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="text-[#e8e8e8] font-bold tracking-widest">Terry's Album List</span>
          <span className="text-[#222]">·</span>
          <span className="text-[#2a2a2a]">{time}</span>
        </div>
        <nav className="flex items-center gap-3 font-mono text-[11px]">
          <Link to="/about"     className="text-[#3a3a3a] hover:text-[#888] transition-colors">About</Link>
          <span className="text-[#222]">·</span>
          <Link to="/admin"     className="text-[#3a3a3a] hover:text-[#888] transition-colors">Admin</Link>
          <span className="text-[#222]">·</span>
          <Link to="/changelog" className="text-[#3a3a3a] hover:text-[#888] transition-colors">Changelog</Link>
        </nav>
      </header>

      {/* ── Desktop: horizontal scroll grid ── */}
      <main
        ref={mainRef}
        className="flex-1 overflow-x-scroll overflow-y-hidden hidden md:block no-scrollbar cursor-grab"
      >
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-full font-mono text-[11px] text-[#333]">
            No albums match.
          </div>
        ) : (
          <div className="h-full">
            <div
              ref={gridRef}
              className="grid gap-px bg-[#1c1c1c] h-full"
              style={{
                gridTemplateRows: `repeat(${rowCount}, 1fr)`,
                gridAutoColumns:  "170px",
                gridAutoFlow:     "column dense",
              }}
            >
              {items.map((item) =>
                item.type === "spotlight"
                  ? <SpotlightCell      key={item.id}  item={item} videoRef={item.id === "s2" ? videoRef : null} />
                  : item.type === "expanded"
                  ? <AlbumExpandedCell  key={item.id}  album={item} onCollapse={handleCollapse} />
                  : <AlbumCell         key={item.id}  album={item} onExpand={handleExpand} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Mobile: vertical scroll grid ── */}
      <main className="flex-1 overflow-y-auto md:hidden">
        <div
          className="grid gap-px bg-[#1c1c1c]"
          style={{ gridTemplateColumns: "repeat(2, 1fr)", gridAutoRows: "130px" }}
        >
          {items.map((item) =>
            item.type === "spotlight"
              ? <SpotlightCell key={item.id} item={item} />
              : <AlbumCell     key={item.id} album={item} />
          )}
        </div>
      </main>

      {/* ── Progress bar ── */}
      <div className="h-px shrink-0 bg-[#1a1a1a] hidden md:block">
        <div className="h-full bg-[#3a3a3a]" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* ── Bottom filter bar ── */}
      <footer
        className="h-10 shrink-0 flex items-center justify-between bg-[#0c0c0c]"
        style={{ paddingLeft: "16px", paddingRight: "16px" }}
      >
        {/* Left: count + vinyl toggle */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-[#2e2e2e]">
            {sorted.length} {sorted.length === 1 ? "album" : "albums"}
          </span>
          <span className="text-[#222]">·</span>
          <FilterTab label="Own Vinyl" active={vinylOnly} onClick={changeVinyl} />
        </div>

        {/* Center: genre + sort dropdowns */}
        <div className="flex items-center gap-3">
          <FooterSelect value={genre} onChange={changeGenre} options={GENRE_OPTIONS} />
          <span className="text-[#222]">·</span>
          <div className="flex items-center gap-1">
            <FooterSelect value={sort} onChange={handleSortChange} options={SORT_OPTIONS} />
            <button
              onClick={handleDirChange}
              className="font-mono text-[9px] text-[#404040] hover:text-[#888888] transition-colors duration-150 leading-none"
            >
              {sortDir === "desc" ? "▼" : "▲"}
            </button>
          </div>
        </div>

        {/* Right: tier tabs */}
        <div className="flex items-center gap-3">
          {TIER_TABS.map((t) => (
            <FilterTab key={t} label={t} active={tier === t} onClick={() => changeTier(t)} />
          ))}
        </div>
      </footer>

    </div>
  );
}
