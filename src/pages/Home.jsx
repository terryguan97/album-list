import { useState, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { Link } from "react-router-dom";
import Lenis from "lenis";
import { ALBUMS, GENRES } from "@/data/albums";
import { cn } from "@/lib/utils";
import VinylIcon from "@/components/ui/VinylIcon";
import albumsBgVideo from "@/assets/65390-514139029_tiny.mp4";

// ─── Tier glow colors ─────────────────────────────────────────────────────────
const TIER_COLOR = { S: "#c084fc", A: "#4ade80", B: "#60a5fa", C: "#f5c518", D: "#f87171" };
function tierGlowStyle(tier) {
  const c = TIER_COLOR[tier];
  if (!c) return {};
  return { color: c, textShadow: `0 0 6px ${c}99, 0 0 14px ${c}55` };
}
const SORT_HL = "#4ade80";
function sortGlow(color = SORT_HL) {
  return { color, textShadow: `0 0 6px ${color}99, 0 0 14px ${color}55` };
}

// ─── Genre breakdown for COLLECTION card ─────────────────────────────────────
const GENRE_BREAKDOWN = (() => {
  const counts = {};
  ALBUMS.forEach((a) => { counts[a.genre] = (counts[a.genre] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const othersCount = sorted.slice(3).reduce((s, [, c]) => s + c, 0);
  return [...sorted.slice(0, 3), ["Others", othersCount]];
})();

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

function buildItems(albums, showSpotlights, expandedId, rowCount, viewportCols, grouped) {
  if (grouped) {
    const result = [];
    let seq = 1;
    ["S", "A", "B", "C", "D"].forEach((t) => {
      const group = albums.filter((a) => a.tier === t);
      if (group.length === 0) return;
      const numCols  = Math.max(1, Math.ceil(group.length / rowCount));
      const padding  = numCols * rowCount - group.length;
      result.push({ type: "divider", id: `divider-${t}`, tier: t });
      group.forEach((a) => result.push({ ...a, type: a.id === expandedId ? "expanded" : "album", seq: seq++ }));
      for (let i = 0; i < padding; i++)
        result.push({ type: "empty", id: `empty-${t}-${i}` });
    });
    return result;
  }

  const items = albums.map((a, i) => ({
    ...a,
    type: a.id === expandedId ? "expanded" : "album",
    seq: i + 1,
  }));
  if (showSpotlights && items.length > 3) {
    const n         = items.length;
    const totalCols = viewportCols;

    // s1: ~25% from top-left
    const s1Idx = Math.min(
      Math.floor(0.25 * totalCols) * rowCount + Math.floor(0.25 * rowCount),
      n
    );

    // s2: pinned to bottom-right of viewport via explicit grid placement
    const s2 = {
      ...SPOTLIGHTS[1],
      gridStyle: {
        gridColumn: `${viewportCols - 2} / span 2`,
        gridRow:    `${rowCount - 2} / span 2`,
      },
    };

    items.splice(s1Idx, 0, SPOTLIGHTS[0]);
    items.push(s2);
  }
  return items;
}

// Standalone sort/filter computation (used for both rendering and exit-preview)
function isMatch(a, g, t, vo, no) {
  return (g === "All" || a.genre === g) && (t === "All" || a.tier === t) && (!vo || a.vinyl) && (!no || a.latest);
}

function computeSorted(g, t, s, vo, dir, no) {
  const hasFilter = g !== "All" || t !== "All" || vo || no;
  const asc = dir === "asc";
  const cmp = {
    Rating: (a, b) => asc ? TIER_ORDER[a.tier] - TIER_ORDER[b.tier] : TIER_ORDER[b.tier] - TIER_ORDER[a.tier],
    Album:  (a, b) => asc ? a.title.localeCompare(b.title)   : b.title.localeCompare(a.title),
    Artist: (a, b) => asc ? a.artist.localeCompare(b.artist) : b.artist.localeCompare(a.artist),
    Genre:  (a, b) => asc ? a.genre.localeCompare(b.genre)   : b.genre.localeCompare(a.genre),
    Year:   (a, b) => asc ? a.year - b.year                  : b.year - a.year,
  }[s] || ((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  if (!hasFilter) return [...ALBUMS].sort(cmp);

  // Keep all albums — matched bubble to front, each group sorted independently
  const matched   = ALBUMS.filter((a) =>  isMatch(a, g, t, vo, no)).sort(cmp);
  const unmatched = ALBUMS.filter((a) => !isMatch(a, g, t, vo, no)).sort(cmp);
  return [...matched, ...unmatched];
}

// ─── Column-reveal animation (initial load only) ─────────────────────────────
function animateColumnReveal(gridEl, { spotlights = true } = {}) {
  const allCells       = [...gridEl.querySelectorAll(".gcell")];
  const spotlightCells = allCells.filter((el) => el.classList.contains("col-span-2"));
  const regularCells   = allCells.filter((el) => !el.classList.contains("col-span-2"));

  // Hide cells before any frame paints (spotlights only if we're animating them)
  regularCells.forEach((el) => { el.style.opacity = "0"; });
  if (spotlights) spotlightCells.forEach((el) => { el.style.opacity = "0"; });

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

  if (spotlights) {
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
}


// ─── Shared tilt handlers ─────────────────────────────────────────────────────
function useTilt(rx = 14, ry = 18, sc = 1.09, perspective = 500) {
  const ref = useRef(null);
  const isMobile = () => window.innerWidth < 768;
  function onMouseMove(e) {
    if (isMobile()) return;
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
    if (isMobile()) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 500ms cubic-bezier(0.23,1,0.32,1), background-color 150ms";
    el.style.transform  = "";
    el.style.zIndex     = "";
  }
  return { ref, onMouseMove, onMouseLeave };
}

// ─── Album cell ───────────────────────────────────────────────────────────────
function AlbumCell({ album, onExpand, matched, hasFilter, sort, isDefault }) {
  const { ref: cardRef, onMouseMove, onMouseLeave } = useTilt(14, 18, 1.09, 500);

  const dimmed  = hasFilter && !matched;
  const glowing = hasFilter &&  matched;

  const byRating = !sort || sort === "Rating";
  const byYear   = sort === "Year";
  const byArtist = sort === "Artist";
  const byAlbum  = sort === "Album";
  const byGenre  = sort === "Genre";

  return (
    <div
      ref={cardRef}
      data-album-id={album.id}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={() => onExpand(album.id)}
      className="gcell group bg-[#111111] p-4 flex flex-col justify-between cursor-pointer
                  hover:bg-[#181818] border-b border-r border-[#1c1c1c]"
      style={{
        willChange: "transform",
        position: "relative",
        opacity: dimmed ? 0.25 : 1,
        transition: "opacity 300ms ease, box-shadow 300ms ease",
        boxShadow: glowing ? "inset 0 0 0 1px rgba(255,255,255,0.07), inset 0 0 24px rgba(255,255,255,0.03)" : "none",
      }}
    >
      {/* ── Desktop layout ── */}
      <div className="hidden md:flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          {byGenre ? (
            <span className="font-mono text-[10px] truncate max-w-[90px]" style={sortGlow()}>
              {album.genre}
            </span>
          ) : (
            <span className="font-mono text-[10px] text-[#383838] transition-colors duration-250 group-hover:text-white">
              {String(album.seq).padStart(2, "0")}
            </span>
          )}
          {album.latest && !isDefault && (
            <span className="font-mono text-[7px] tracking-widest text-white border border-white/30 px-1 leading-tight">
              NEW
            </span>
          )}
        </div>
        <span className="font-mono text-[10px]" style={byRating ? tierGlowStyle(album.tier) : { color: "#383838" }}>
          {album.tier}
        </span>
      </div>
      <div className="hidden md:block mt-2 flex-1">
        <p
          className="text-[12.5px] font-medium leading-snug line-clamp-2 transition-colors duration-250 group-hover:text-white"
          style={byAlbum ? sortGlow() : { color: "#bfbfbf" }}
        >
          {album.crowned && <span className="mr-1 text-[#666] transition-colors duration-250 group-hover:text-white">♛</span>}
          {album.title}
        </p>
        <p
          className="text-[10.5px] mt-0.5 truncate transition-colors duration-250 group-hover:text-white"
          style={byArtist ? sortGlow() : { color: "#484848" }}
        >
          {album.artist}
        </p>
      </div>
      {!isDefault && (
        <div className="hidden md:flex items-end justify-between mt-2">
          <span
            className="font-mono text-[10px] transition-colors duration-250 group-hover:text-white"
            style={byYear ? sortGlow() : { color: "#383838" }}
          >
            {album.year}
          </span>
          {album.vinyl && <VinylIcon className="text-[#383838] transition-colors duration-250 group-hover:text-white" />}
        </div>
      )}

      {/* ── Mobile layout ── */}
      <div className="flex md:hidden items-center gap-3">
        <span className="font-mono text-[10px] text-[#555] shrink-0 group-hover:text-white transition-colors duration-150">
          {byGenre ? album.genre : String(album.seq).padStart(2, "0")}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[#bfbfbf] truncate leading-snug group-hover:text-white transition-colors duration-150">
            {album.crowned && <span className="mr-1 text-[#555]">♛</span>}
            {album.title}
          </p>
          <p className="text-[11px] text-[#484848] truncate group-hover:text-white transition-colors duration-150">
            {album.artist}
          </p>
        </div>
        <span className="font-mono text-[10px] shrink-0" style={tierGlowStyle(album.tier)}>
          {album.tier}
        </span>
      </div>
    </div>
  );
}

// ─── Expanded album cell (2×2) ────────────────────────────────────────────────
function AlbumExpandedCell({ album, onCollapse, sort }) {
  const { ref: cardRef, onMouseMove, onMouseLeave } = useTilt(10, 14, 1.03, 700);

  const byRating = !sort || sort === "Rating";
  const byYear   = sort === "Year";
  const byArtist = sort === "Artist";
  const byAlbum  = sort === "Album";
  const byGenre  = sort === "Genre";

  return (
    <div
      ref={cardRef}
      data-album-id={album.id}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onCollapse}
      className="gcell col-span-2 row-span-2 bg-[#161616] p-6 flex flex-col justify-between
                  cursor-pointer hover:bg-[#1c1c1c] relative overflow-hidden border-b border-r border-[#1c1c1c]"
      style={{ willChange: "transform" }}
    >
      {/* subtle top-left glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff04] to-transparent pointer-events-none" />

      <div className="relative z-10 flex items-start justify-between">
        <span className="font-mono text-[13px] text-white">{String(album.seq).padStart(2, "0")}</span>
        <span className="font-mono text-[13px]" style={byRating ? tierGlowStyle(album.tier) : { color: "#555" }}>
          {album.tier}
        </span>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center mt-4">
        {album.latest && (
          <span className="font-mono text-[8px] tracking-widest text-white border border-white/30 px-1 leading-tight self-start mb-2">
            NEW
          </span>
        )}
        <p className="text-[22px] font-bold leading-tight tracking-tight"
           style={byAlbum ? sortGlow() : { color: "white" }}>
          {album.crowned && <span className="mr-2">♛</span>}
          {album.title}
        </p>
        <p className="text-[13px] mt-1.5" style={byArtist ? sortGlow() : { color: "rgba(255,255,255,0.6)" }}>
          {album.artist}
        </p>
        <p className="font-mono text-[10px] mt-3 tracking-widest uppercase"
           style={byGenre ? sortGlow() : { color: "rgba(255,255,255,0.3)" }}>
          {album.genre}
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {album.vinyl && <VinylIcon className="text-white/50" />}
          <span className="font-mono text-[13px]" style={byYear ? sortGlow() : { color: "rgba(255,255,255,0.5)" }}>{album.year}</span>
        </div>
        <span className="font-mono text-[11px] text-white/20 tracking-widest">CLICK TO CLOSE</span>
      </div>
    </div>
  );
}

// ─── Empty padding cell (grouped mode) ───────────────────────────────────────
function EmptyCell() {
  return <div className="bg-[#0e0e0e] border-b border-r border-[#1c1c1c]" />;
}

// ─── Tier divider cell ────────────────────────────────────────────────────────
function TierDividerCell({ tier }) {
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

// ─── Tier header strip (grouped mode) ─────────────────────────────────────────
function TierHeaderStrip({ tierSections }) {
  return (
    <div className="flex shrink-0 border-b border-[#1c1c1c]" style={{ height: "26px" }}>
      {tierSections.map(({ tier, numCols }) => {
        const color = TIER_COLOR[tier] ?? "#444";
        return (
          <div key={tier} className="flex shrink-0" style={{ width: 4 + numCols * 171 }}>
            <div style={{ width: 4, background: "#0c0c0c", boxShadow: `-3px 0 12px ${color}55` }} />
            <div className="flex items-center px-3 bg-[#0c0c0c]" style={{ width: numCols * 171 }}>
              <span className="font-mono text-[10px] tracking-widest" style={{ color, textShadow: `0 0 8px ${color}` }}>
                {tier}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Spotlight cell (2×2) ─────────────────────────────────────────────────────
function SpotlightCell({ item, videoRef }) {
  const isCollection = item.id === "s2";
  const cardRef    = useRef(null);
  const contentRef = useRef(null);
  const genreRef   = useRef(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!hovered || !genreRef.current) return;
    const rows = [...genreRef.current.children];
    rows.forEach((r) => { r.style.opacity = "0"; r.style.transform = "translateY(8px)"; });
    animate(rows, {
      opacity:    [0, 1],
      translateY: [8, 0],
      duration:   220,
      ease:       "outQuart",
      delay:      stagger(50),
    });
  }, [hovered]);

  function onMouseMove(e) {
    if (window.innerWidth < 768) return;
    const el      = cardRef.current;
    const content = contentRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x  = (e.clientX - left) / width;
    const y  = (e.clientY - top)  / height;
    const rx = (0.5 - y) * 16;
    const ry = (x - 0.72) * 22;
    el.style.transition      = "";
    el.style.transformOrigin = "72% center";
    el.style.transform       = `perspective(480px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.06)`;
    el.style.zIndex          = "10";
    if (isCollection && content) {
      const tx = (x - 0.5) * 20;
      const ty = (y - 0.5) * 12;
      content.style.transition = "";
      content.style.transform  = `translate(${tx}px, ${ty}px)`;
    }
  }

  function onMouseLeave() {
    const el      = cardRef.current;
    const content = contentRef.current;
    if (!el) return;
    el.style.transition      = "transform 500ms cubic-bezier(0.23,1,0.32,1)";
    el.style.transformOrigin = "";
    el.style.transform       = "";
    el.style.zIndex          = "";
    if (isCollection) {
      setHovered(false);
      if (content) {
        content.style.transition = "transform 500ms cubic-bezier(0.23,1,0.32,1)";
        content.style.transform  = "";
      }
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={isCollection ? () => setHovered(true) : undefined}
      data-spotlight-id={item.id}
      className="gcell col-span-2 row-span-2 bg-[#0f0f0f] p-6 flex flex-col justify-end
                  relative overflow-hidden cursor-default border-b border-r border-[#1c1c1c]"
      style={{ willChange: "transform", ...item.gridStyle }}
    >
      {isCollection && (
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
        style={{ opacity: isCollection ? 0.2 : 1 }}
      />
      <div ref={isCollection ? contentRef : undefined} className="relative z-10">
        <p className="font-mono text-[9px] tracking-[0.25em] text-[#c8c8c8] mb-4 uppercase">
          {item.eyebrow}
        </p>
        {isCollection && hovered ? (
          <div ref={genreRef} className="flex flex-col gap-2.5">
            {GENRE_BREAKDOWN.map(([genre, count]) => (
              <div key={genre} className="flex items-baseline justify-between">
                <span className="text-[18px] font-bold text-[#c8c8c8] leading-tight tracking-tight">
                  {genre}
                </span>
                <span className="font-mono text-[14px] text-white">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <h2 className="text-[26px] font-bold text-[#c8c8c8] leading-tight whitespace-pre-line tracking-tight">
              {item.title}
            </h2>
            <p className="text-[11px] text-[#c8c8c8] mt-3 leading-relaxed">{item.body}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Knob toggle ──────────────────────────────────────────────────────────────
function KnobToggle({ active, onClick, label = "Own Vinyl" }) {
  const knobRef = useRef(null);
  const prevRef = useRef(active);
  // off = 400deg, on = 480deg (+80 CW), consistent absolute rotation
  const rotRef  = useRef(active ? 45 : 375);

  // Set initial transform via JS so it uses the same property as anime.js
  useLayoutEffect(() => {
    if (knobRef.current) {
      knobRef.current.style.transform = `rotate(${rotRef.current}deg)`;
    }
  }, []);

  useEffect(() => {
    if (!knobRef.current) return;
    const wasActive = prevRef.current;
    prevRef.current = active;
    if (active === wasActive) return;

    const from  = rotRef.current;
    const delta = active ? +80 : -80;  // CW to turn on, CCW to turn off
    const to    = from + delta;
    rotRef.current = to;

    animate(knobRef.current, {
      rotate:   [from, to],
      duration: 480,
      ease:     "outBack(1.4)",
    });
  }, [active]);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 group"
      title={label}
    >
      <svg
        ref={knobRef}
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ willChange: "transform" }}
        className={cn(
          "transition-colors duration-200",
          active ? "text-[#e0e0e0]" : "text-[#888] group-hover:text-[#bbb]"
        )}
      >
        <path d="M8.41826 9.71486C7.43023 10.4735 6.18444 10.3257 5.44765 9.38856C4.74632 8.49652 4.88303 7.23351 5.75977 6.50505C6.66693 5.75131 7.90046 5.85063 8.6789 6.7401C9.45676 7.62891 9.35883 8.86337 8.41826 9.71486Z" fill="currentColor"/>
        <path d="M10.9219 0C11.751 0 12.5801 0 13.4441 0.00959808C13.6134 0.121743 13.7808 0.0879107 13.9292 0.110948C15.2726 0.319523 16.5319 0.76075 17.7275 1.40485C19.1385 2.16503 20.3372 3.17247 21.35 4.41191C22.4508 5.7591 23.2136 7.27438 23.6577 8.95343C23.8287 9.5997 23.9289 10.2583 24 10.9219C24 11.626 24 12.3301 23.9982 13.0749C23.957 13.3993 23.919 13.6833 23.8778 13.9668C23.6971 15.2101 23.2918 16.3824 22.7235 17.4967C22.3736 18.1828 21.961 18.8335 21.4768 19.4363C20.786 20.2962 20.0055 21.0627 19.1169 21.7172C18.4193 22.2308 17.6743 22.6624 16.882 23.014C16.0326 23.3909 15.1546 23.669 14.2397 23.8377C13.9925 23.8833 13.7282 23.8642 13.5 24C12.6553 24 11.8105 24 10.9259 23.995C10.4132 23.9556 9.94724 23.8731 9.48292 23.7819C8.53908 23.5965 7.63931 23.2744 6.77498 22.8604C5.98733 22.4831 5.24697 22.0228 4.56294 21.4764C3.79956 20.8666 3.1134 20.1807 2.5081 19.4125C1.86875 18.6011 1.34787 17.7201 0.938169 16.7736C0.585134 15.9581 0.323412 15.1144 0.162492 14.2382C0.117207 13.9916 0.143 13.7259 0 13.5C0 12.5146 1.86265e-09 11.5293 0.0132504 10.5114C0.105967 10.3306 0.0951126 10.1629 0.11965 10.0047C0.313582 8.75465 0.717098 7.57136 1.2977 6.45439C2.00814 5.08765 2.95449 3.90365 4.12342 2.88982C5.30514 1.86489 6.63354 1.11035 8.10249 0.593933C9.01542 0.272989 9.96079 0.0969967 10.9219 0ZM4.78222 3.77462C3.75836 4.69471 2.91 5.75172 2.2777 6.97821C1.60633 8.28047 1.20844 9.65684 1.08628 11.1209C1.00925 12.044 1.04437 12.9579 1.20597 13.8636C1.52177 15.6336 2.22802 17.2342 3.33043 18.6624C3.96388 19.4831 4.68945 20.2081 5.52075 20.8184C6.59627 21.6079 7.77874 22.1953 9.06999 22.5523C10.4119 22.9233 11.7767 23.0484 13.1596 22.8959C14.0815 22.7943 14.9796 22.5774 15.8504 22.2474C17.1412 21.7582 18.2998 21.049 19.3221 20.1304C20.2015 19.3401 20.9263 18.4189 21.5183 17.3883C22.3727 15.9011 22.8312 14.2994 22.9438 12.5995C23.001 11.7368 22.9282 10.8756 22.7702 10.0207C22.3955 7.9939 21.5073 6.21986 20.1416 4.68911C19.3597 3.81275 18.4485 3.08723 17.4245 2.49821C15.9393 1.6439 14.3406 1.17658 12.642 1.05784C11.6372 0.987606 10.6332 1.07338 9.65016 1.29939C7.83519 1.71665 6.21318 2.52377 4.78222 3.77462Z" fill="currentColor"/>
      </svg>
      <span className={cn(
        "font-mono text-[11px] transition-colors duration-200",
        active ? "text-[#e0e0e0]" : "text-[#888] group-hover:text-[#bbb]"
      )}>
        {label}
      </span>
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
          visible ? "text-[#e0e0e0]" : "text-[#888] hover:text-[#bbb]"
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
// ─── Tier pitch slider (horizontal) ──────────────────────────────────────────
const TIER_STEP = 30; // px between each option center

function TierSlider({ value, onChange }) {
  const handleRef = useRef(null);
  const idxRef    = useRef(TIER_TABS.indexOf(value));
  const idx       = TIER_TABS.indexOf(value);

  useEffect(() => {
    if (!handleRef.current) return;
    const prev = idxRef.current;
    idxRef.current = idx;
    if (prev === idx) return;
    // FLIP: handle CSS left has already moved to new idx; animate translateX from old offset
    animate(handleRef.current, {
      translateX: [(prev - idx) * TIER_STEP, 0],
      duration:   300,
      ease:       "outQuart",
    });
  }, [idx]);

  const totalW = (TIER_TABS.length - 1) * TIER_STEP + 16;

  return (
    <div className="relative flex-shrink-0" style={{ width: totalW, height: "100%" }}>
      {/* Ticks + labels — each is a clickable button */}
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
      <div
        className="absolute bg-[#1e1e1e]"
        style={{ left: 8, right: 8, bottom: 10, height: 1 }}
      />

      {/* Handle */}
      <div
        ref={handleRef}
        className="absolute"
        style={{
          left:         idx * TIER_STEP + 8 - 5,
          bottom:       6,
          width:        10,
          height:       9,
          background:   "#3a3a3a",
          border:       "1px solid #585858",
        }}
      />
    </div>
  );
}

function MobileFilterDrawer({
  newOnly, changeNew, vinylOnly, changeVinyl, grouped, changeGroup,
  sort, handleSortChange, sortDir, handleDirChange,
  genre, changeGenre, tier, resetAll, onClose, closing,
}) {
  const drawerRef = useRef(null);

  useLayoutEffect(() => {
    if (!drawerRef.current) return;
    animate(drawerRef.current, {
      translateX: ["-100%", "0%"],
      duration: 280,
      ease: "outQuart",
    });
  }, []);

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
      {/* Backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} />
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 left-0 bottom-12 z-40 w-64 bg-[#0e0e0e] border-r border-[#222] font-mono overflow-y-auto no-scrollbar flex flex-col"
      >
        <div className="p-5 flex flex-col gap-6 flex-1">
          {/* Knobs */}
          <div>
            <p className="text-[9px] tracking-widest text-[#444] mb-4 uppercase">Toggles</p>
            <div className="flex gap-5">
              <KnobToggle active={grouped}   onClick={changeGroup} label="Group" />
              <KnobToggle active={newOnly}   onClick={changeNew}   label="New" />
              <KnobToggle active={vinylOnly} onClick={changeVinyl} label="Own Vinyl" />
            </div>
          </div>
          {/* Sort */}
          <div>
            <p className="text-[9px] tracking-widest text-[#444] mb-2 uppercase">Sort</p>
            <div className="flex flex-col">
              {SORT_OPTIONS.map((o) => (
                <div key={o.value} className="flex items-center">
                  <button
                    onClick={() => handleSortChange(o.value)}
                    className="text-left text-[11px] px-2 py-1.5 transition-colors duration-150 flex-1"
                    style={sort === o.value ? { ...sortGlow(SORT_HL), opacity: 1 } : { color: "#888" }}
                  >
                    {o.label}
                  </button>
                  {sort === o.value && (
                    <button onClick={handleDirChange} className="ml-1 text-[9px] text-[#888] px-2 py-1.5">
                      {sortDir === "desc" ? "▼" : "▲"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          {/* Genre */}
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
          {/* Reset */}
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

function TierSliderVertical({ value, onChange }) {
  const handleRef = useRef(null);
  const idxRef    = useRef(TIER_TABS.indexOf(value));
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

  const totalH = (TIER_TABS.length - 1) * TIER_STEP + 16;

  return (
    <div className="relative flex-shrink-0" style={{ height: totalH, width: 48 }}>
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
      <div
        className="absolute bg-[#1e1e1e]"
        style={{ top: 8, bottom: 8, right: 14, width: 1 }}
      />

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

export default function Home() {
  const [genre,      setGenre]      = useState("All");
  const [tier,       setTier]       = useState("All");
  const [sort,       setSort]       = useState("Rating");
  const [sortDir,    setSortDir]    = useState("asc");
  const [vinylOnly,  setVinylOnly]  = useState(false);
  const [newOnly,    setNewOnly]    = useState(false);
  const [grouped,    setGrouped]    = useState(() => window.innerWidth < 768);
  const [listMode,    setListMode]    = useState(false);
  const [listClosing, setListClosing] = useState(false);
  const listRef = useRef(null);
  const [expandedId, setExpandedId] = useState(null);
  const [progress,   setProgress]   = useState(0);

  const [mobileMenuOpen,     setMobileMenuOpen]     = useState(false);
  const [mobileMenuClosing,  setMobileMenuClosing]  = useState(false);
  const [mobileDrawerOpen,   setMobileDrawerOpen]   = useState(false);
  const [mobileDrawerClosing,setMobileDrawerClosing]= useState(false);
  const [mobileTierOpen,     setMobileTierOpen]     = useState(false);
  const [mobileTierClosing,  setMobileTierClosing]  = useState(false);
  const [mobileClosingId,    setMobileClosingId]    = useState(null);
  const [showTopBtn,       setShowTopBtn]       = useState(false);
  const [mobileHeaderUp,   setMobileHeaderUp]   = useState(true);

  const gridRef          = useRef(null);
  const mainRef          = useRef(null);
  const mobileMainRef    = useRef(null);
  const lastScrollY      = useRef(0);
  const lenisRef         = useRef(null);
  const animModeRef      = useRef(null);
  const prevPosRef       = useRef({});
  const videoRef         = useRef(null);
  const isInitialMount   = useRef(true);
  const prevIsDefaultRef = useRef(true); // true = default state on first render
  const wasDragRef       = useRef(false);

  // ── List mode open animation ──────────────────────────────────────────────
  useEffect(() => {
    if (listMode && !listClosing && listRef.current) {
      animate(listRef.current, {
        opacity: [0, 1], translateY: [-10, 0],
        duration: 300, ease: "outQuart",
      });
    }
  }, [listMode]);

  // ── Mobile close helpers (animate then unmount) ───────────────────────────
  function closeMobileMenu()   { setMobileMenuClosing(true);   setTimeout(() => { setMobileMenuOpen(false);   setMobileMenuClosing(false);   }, 180); }
  function closeMobileDrawer() { setMobileDrawerClosing(true); setTimeout(() => { setMobileDrawerOpen(false); setMobileDrawerClosing(false); }, 260); }
  function closeMobileTier()   { setMobileTierClosing(true);   setTimeout(() => { setMobileTierOpen(false);   setMobileTierClosing(false);   }, 180); }

  // ── Mobile back-to-top scroll detection ───────────────────────────────────
  useEffect(() => {
    const el = mobileMainRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = el.scrollTop;
      const goingUp = y < lastScrollY.current;
      setShowTopBtn(goingUp && y > 80);
      setMobileHeaderUp(goingUp || y < 10);
      lastScrollY.current = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ── Mobile: scroll to top on filter/sort change ───────────────────────────
  useEffect(() => {
    if (window.innerWidth < 768) {
      mobileMainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [sort, sortDir, genre, tier, vinylOnly, newOnly, grouped]);

  // ── Dynamic row / viewport-col count ──────────────────────────────────────
  const [rowCount,     setRowCount]     = useState(6);
  const [viewportCols, setViewportCols] = useState(8);
  useEffect(() => {
    const CHROME = 32 + 1 + 40;
    const ROW_H  = 131;
    const COL_W  = 171; // 170px card + 1px border
    const update = () => {
      setRowCount(Math.max(2, Math.floor((window.innerHeight - CHROME) / ROW_H)));
      setViewportCols(Math.max(2, Math.floor(window.innerWidth / COL_W)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const sorted = useMemo(() => computeSorted(genre, tier, sort, vinylOnly, sortDir, newOnly), [genre, tier, sort, vinylOnly, sortDir, newOnly]);

  const isDefault  = genre === "All" && tier === "All" && sort === "Rating" && sortDir === "asc" && !vinylOnly && !newOnly && !grouped;
  const hasFilter  = !isDefault && (genre !== "All" || tier !== "All" || vinylOnly || newOnly);
  const matchedIds = useMemo(() => {
    if (!hasFilter) return null;
    return new Set(ALBUMS.filter((a) => isMatch(a, genre, tier, vinylOnly, newOnly)).map((a) => a.id));
  }, [genre, tier, vinylOnly, newOnly, hasFilter]);
  const items      = useMemo(() => buildItems(sorted, isDefault, expandedId, rowCount, viewportCols, grouped), [sorted, isDefault, expandedId, rowCount, viewportCols, grouped]);

  const tierSections = useMemo(() => {
    if (!grouped) return [];
    return ["S","A","B","C","D"].flatMap((t) => {
      const count = sorted.filter((a) => a.tier === t).length;
      if (count === 0) return [];
      return [{ tier: t, numCols: Math.max(1, Math.ceil(count / rowCount)) }];
    });
  }, [grouped, sorted, rowCount]);

  const gridTemplateCols = grouped && tierSections.length > 0
    ? tierSections.map(({ numCols }) => `4px ${"171px ".repeat(numCols).trim()}`).join(" ")
    : undefined;

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
    if (wasDragRef.current) { wasDragRef.current = false; return; }
    animModeRef.current = "expand";
    capturePositions();
    setExpandedId(albumId);
  }

  function handleCollapse() {
    if (window.innerWidth < 768) {
      setMobileClosingId(expandedId);
      setTimeout(() => { setMobileClosingId(null); setExpandedId(null); }, 200);
      return;
    }
    animModeRef.current = "expand";
    capturePositions();
    setExpandedId(null);
  }

  // ── Spotlight shrink-out helper ───────────────────────────────────────────
  function applyWithSpotlightTransition(willBeDefault, applyFn) {
    capturePositions();
    animModeRef.current = "sort";
    if (isDefault && !willBeDefault) {
      const els = gridRef.current
        ? [...gridRef.current.querySelectorAll("[data-spotlight-id]")]
        : [];
      if (els.length > 0) {
        animate(els, { scale: [1, 0], opacity: [1, 0], duration: 220, ease: "inQuart", delay: stagger(80) });
      }
    }
    applyFn(); // fire immediately — FLIP and spotlight shrink run in parallel
  }

  // ── Sort / filter / reset handlers ───────────────────────────────────────
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

  const changeGenre = (g) => handleFilterChange(g,     tier,  vinylOnly,  newOnly);
  const changeTier  = (t) => handleFilterChange(genre, t,     vinylOnly,  newOnly);
  const changeVinyl = ()  => handleFilterChange(genre, tier, !vinylOnly,  newOnly);
  const changeNew   = ()  => handleFilterChange(genre, tier,  vinylOnly, !newOnly);
  const changeGroup = ()  => {
    const next = !grouped;
    const wbd  = genre === "All" && tier === "All" && sort === "Rating" && sortDir === "asc" && !vinylOnly && !newOnly && !next;
    applyWithSpotlightTransition(wbd, () => setGrouped(next));
  };
  const changeList = () => {
    if (listMode) {
      setListClosing(true);
      if (listRef.current) {
        animate(listRef.current, {
          opacity: [1, 0], translateY: [0, -10],
          duration: 220, ease: "inQuart",
          complete: () => { setListMode(false); setListClosing(false); },
        });
      } else {
        setListMode(false); setListClosing(false);
      }
    } else {
      setListMode(true);
    }
  };

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
      if (didDrag) wasDragRef.current = true;
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
  }, [genre, tier, sort, sortDir, vinylOnly, newOnly, grouped]);

  // ── FLIP (sort) + entrance (filter) + initial load ───────────────────────
  useLayoutEffect(() => {
    const mode = animModeRef.current;
    animModeRef.current = null;
    if (!gridRef.current) return;

    const prevIsDefault = prevIsDefaultRef.current;
    prevIsDefaultRef.current = isDefault;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      animateColumnReveal(gridRef.current);
    } else if (!prevIsDefault && isDefault) {
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
    <div className="h-screen flex flex-col bg-[#0c0c0c] md:overflow-hidden">

      {/* ── Header ── */}
      <header
        className="h-8 shrink-0 hidden md:flex items-center justify-between bg-[#0c0c0c] border-b border-[#1a1a1a]"
        style={{ paddingLeft: "16px", paddingRight: "16px" }}
      >
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

      {/* ── Mobile header ── */}
      <header
        className="md:hidden bg-[#0c0c0c] border-b border-[#1a1a1a]"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
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
        <main className="flex-1 overflow-y-auto hidden md:block no-scrollbar">
          <div ref={listRef} className="max-w-[900px] mx-auto border-x border-[#1c1c1c]">
          <div style={{ height: 200 }} className="border-b border-[#1c1c1c]">
            <SpotlightCell item={SPOTLIGHTS[0]} />
          </div>
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
                  ? <AlbumExpandedCell album={item} onCollapse={handleCollapse} sort={sort} />
                  : <AlbumCell album={item} onExpand={handleExpand} hasFilter={hasFilter} matched={!matchedIds || matchedIds.has(item.id)} sort={sort} isDefault={isDefault} />
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
                  ? <EmptyCell          key={item.id} />
                  : item.type === "divider"
                  ? <TierDividerCell    key={item.id}  tier={item.tier} />
                  : item.type === "spotlight"
                  ? <SpotlightCell      key={item.id}  item={item} videoRef={item.id === "s2" ? videoRef : null} />
                  : item.type === "expanded"
                  ? <AlbumExpandedCell  key={item.id}  album={item} onCollapse={handleCollapse} sort={sort} />
                  : <AlbumCell         key={item.id}  album={item} onExpand={handleExpand} hasFilter={hasFilter} matched={!matchedIds || matchedIds.has(item.id)} sort={sort} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Mobile: single-column scroll grid ── */}
      <main ref={mobileMainRef} className="flex-1 overflow-y-auto md:hidden pb-12 pt-12 no-scrollbar">
        {/* s1 spotlight always at top, full width */}
        <div style={{ height: 200 }} className="border-b border-[#1c1c1c] shrink-0">
          <SpotlightCell item={SPOTLIGHTS[0]} />
        </div>
        {/* Album cards: single column, full width */}
        <div className="border-l border-[#1c1c1c]">
          {items.filter(i => i.type !== "empty" && i.type !== "spotlight").map((item) => {
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
                  : <AlbumCell album={item} onExpand={handleExpand} hasFilter={hasFilter} matched={!matchedIds || matchedIds.has(item.id)} sort={sort} isDefault={isDefault} />
                }
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Progress bar ── */}
      <div className="h-px shrink-0 bg-[#1a1a1a] hidden md:block">
        <div className="h-full bg-[#3a3a3a]" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* ── Bottom filter bar ── */}
      <footer
        className="h-10 shrink-0 hidden md:flex items-center justify-between bg-[#0c0c0c]"
        style={{ paddingLeft: "16px", paddingRight: "16px" }}
      >
        {/* Left: vinyl + new + group + list toggles */}
        <div className="flex items-center gap-4">
          <KnobToggle active={listMode}  onClick={changeList}  label="List" />
          <KnobToggle active={grouped}   onClick={changeGroup} label="Group" />
          <KnobToggle active={newOnly}   onClick={changeNew}   label="New" />
          <KnobToggle active={vinylOnly} onClick={changeVinyl} label="Own Vinyl" />
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

      {/* ── Mobile bottom bar ── */}
      <div className="md:hidden">
        {/* Left drawer */}
        {mobileDrawerOpen && (
          <MobileFilterDrawer
            newOnly={newOnly}   changeNew={changeNew}
            vinylOnly={vinylOnly} changeVinyl={changeVinyl}
            grouped={grouped}   changeGroup={changeGroup}
            sort={sort}         handleSortChange={handleSortChange}
            sortDir={sortDir}   handleDirChange={handleDirChange}
            genre={genre}       changeGenre={changeGenre}
            tier={tier}         resetAll={resetAll}
            closing={mobileDrawerClosing}
            onClose={closeMobileDrawer}
          />
        )}
        {/* Tier panel (expands upward from bottom right) */}
        {mobileTierOpen && (
          <div className={`fixed bottom-12 right-0 z-[60] bg-[#0e0e0e] border border-[#222] border-b-0 p-2 ${mobileTierClosing ? "mobile-tier-out" : "mobile-tier-in"}`}>
            <TierSliderVertical value={tier} onChange={(t) => { changeTier(t); closeMobileTier(); }} />
          </div>
        )}
        {/* Back to top */}
        {showTopBtn && (
          <button
            onClick={() => mobileMainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-16 right-4 z-50 font-mono text-[9px] tracking-widest text-[#888] hover:text-white border border-[#2a2a2a] hover:border-white bg-[#0e0e0e] px-2.5 py-1.5 transition-colors duration-150"
            style={{ animation: "mobile-card-open 180ms ease both" }}
          >
            ↑ TOP
          </button>
        )}

        {/* Bottom bar */}
        <div className="fixed bottom-0 inset-x-0 z-40 h-12 bg-[#0c0c0c] border-t border-[#1a1a1a] flex items-center justify-between px-4">
          <button
            onClick={() => { mobileDrawerOpen ? closeMobileDrawer() : setMobileDrawerOpen(true); if (mobileTierOpen) closeMobileTier(); }}
            className="font-mono text-[10px] tracking-widest transition-colors duration-150 flex items-center gap-2"
            style={{ color: mobileDrawerOpen ? "#e8e8e8" : "#888" }}
          >
            <svg width="13" height="12" viewBox="0 0 13 12" fill="currentColor">
              {/* left slider line */}
              <rect x="3" y="0" width="1" height="12" rx="0.5"/>
              {/* left handle */}
              <rect x="1" y="3" width="5" height="2" rx="1"/>
              {/* right slider line */}
              <rect x="9" y="0" width="1" height="12" rx="0.5"/>
              {/* right handle */}
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
