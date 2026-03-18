import { animate } from "animejs";
import { ALBUMS } from "@/data/albums";
import { SPOTLIGHTS } from "@/data/uiConstants";

/** Sort priority for tiers: S=0 (best) … D=4 (worst) */
export const TIER_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4 };

/**
 * Returns true if album `a` passes all active filters.
 * @param {object} a       - Album object
 * @param {string} g       - Genre filter ("All" = no filter)
 * @param {string} t       - Tier filter  ("All" = no filter)
 * @param {boolean} vo     - Vinyl-only flag
 * @param {boolean} no     - New-only flag
 */
export function isMatch(a, g, t, vo, no) {
  return (
    (g === "All" || a.genre === g) &&
    (t === "All" || a.tier  === t) &&
    (!vo || a.vinyl) &&
    (!no || a.latest)
  );
}

/**
 * Computes a sorted album list for the current filter/sort state.
 * When filters are active, matched albums bubble to the front;
 * both matched and unmatched groups are sorted independently.
 */
export function computeSorted(g, t, s, vo, dir, no) {
  const hasFilter = g !== "All" || t !== "All" || vo || no;
  const asc = dir === "asc";

  const cmp = {
    Rating: (a, b) => asc ? TIER_ORDER[a.tier] - TIER_ORDER[b.tier] : TIER_ORDER[b.tier] - TIER_ORDER[a.tier],
    Album:  (a, b) => asc ? a.title.localeCompare(b.title)           : b.title.localeCompare(a.title),
    Artist: (a, b) => asc ? a.artist.localeCompare(b.artist)         : b.artist.localeCompare(a.artist),
    Genre:  (a, b) => asc ? a.genre.localeCompare(b.genre)           : b.genre.localeCompare(a.genre),
    Year:   (a, b) => asc ? a.year - b.year                          : b.year - a.year,
  }[s] ?? ((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  if (!hasFilter) return [...ALBUMS].sort(cmp);

  const matched   = ALBUMS.filter((a) =>  isMatch(a, g, t, vo, no)).sort(cmp);
  const unmatched = ALBUMS.filter((a) => !isMatch(a, g, t, vo, no)).sort(cmp);
  return [...matched, ...unmatched];
}

/**
 * Builds the flat items array for the grid/list renderers.
 * Handles grouped mode (tier dividers + empty padding cells)
 * and spotlight insertion in the default ungrouped layout.
 *
 * @param {object[]} albums       - Sorted album array
 * @param {boolean}  showSpotlights - Insert spotlight cards (default state only)
 * @param {number|null} expandedId - ID of the currently expanded album
 * @param {number}   rowCount     - Number of grid rows visible in the viewport
 * @param {number}   viewportCols - Number of grid columns visible in the viewport
 * @param {boolean}  grouped      - Group albums into tier sections
 */
export function buildItems(albums, showSpotlights, expandedId, rowCount, viewportCols, grouped) {
  if (grouped) {
    const result = [];
    let seq = 1;
    ["S", "A", "B", "C", "D"].forEach((t) => {
      const group = albums.filter((a) => a.tier === t);
      if (group.length === 0) return;
      const numCols = Math.max(1, Math.ceil(group.length / rowCount));
      const padding = numCols * rowCount - group.length;

      result.push({ type: "divider", id: `divider-${t}`, tier: t });
      group.forEach((a) => result.push({ ...a, type: a.id === expandedId ? "expanded" : "album", seq: seq++ }));
      for (let i = 0; i < padding; i++) result.push({ type: "empty", id: `empty-${t}-${i}` });
    });
    return result;
  }

  const items = albums.map((a, i) => ({
    ...a,
    type: a.id === expandedId ? "expanded" : "album",
    seq: i + 1,
  }));

  if (showSpotlights && items.length > 3) {
    const n = items.length;

    // s1: ~25% from top-left of the viewport
    const s1Idx = Math.min(
      Math.floor(0.25 * viewportCols) * rowCount + Math.floor(0.25 * rowCount),
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

/**
 * Column-reveal entrance animation for the desktop grid.
 * Staggers columns left→right; optionally animates spotlight cells after albums.
 *
 * @param {HTMLElement} gridEl
 * @param {{ spotlights?: boolean }} options
 */
export function animateColumnReveal(gridEl, { spotlights = true } = {}) {
  const allCells       = [...gridEl.querySelectorAll(".gcell")];
  const spotlightCells = allCells.filter((el) => el.classList.contains("col-span-2"));
  const regularCells   = allCells.filter((el) => !el.classList.contains("col-span-2"));

  // Hide before any frame paints
  regularCells.forEach((el) => { el.style.opacity = "0"; });
  if (spotlights) spotlightCells.forEach((el) => { el.style.opacity = "0"; });

  // Group regular cells by column (left offset) and animate left→right
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
