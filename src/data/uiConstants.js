import { ALBUMS, GENRES } from "@/data/albums";

// ─── Spotlight cards (2×2 feature cells in the desktop grid) ──────────────────
export const SPOTLIGHTS = [
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

// ─── Genre breakdown for COLLECTION spotlight (top 3 genres + Others) ─────────
export const GENRE_BREAKDOWN = (() => {
  const counts = {};
  ALBUMS.forEach((a) => { counts[a.genre] = (counts[a.genre] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const othersCount = sorted.slice(3).reduce((s, [, c]) => s + c, 0);
  return [...sorted.slice(0, 3), ["Others", othersCount]];
})();

// ─── Dropdown options ──────────────────────────────────────────────────────────
export const GENRE_OPTIONS = [
  { value: "All", label: "All Genres" },
  ...GENRES.map((g) => ({ value: g, label: g })),
];

export const SORT_OPTIONS = [
  { value: "Rating", label: "Rating" },
  { value: "Album",  label: "Album"  },
  { value: "Artist", label: "Artist" },
  { value: "Genre",  label: "Genre"  },
  { value: "Year",   label: "Year"   },
];

// ─── Tier filter tabs ──────────────────────────────────────────────────────────
export const TIER_TABS = ["All", "S", "A", "B", "C", "D"];

/** Pixel spacing between each tier option in the slider components */
export const TIER_STEP = 30;
