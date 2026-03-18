/**
 * One-time script: fetches album cover art URLs from Spotify and writes
 * them to src/data/covers.json.
 *
 * Run with:  node --env-file=.env scripts/fetch-covers.mjs
 */

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) { console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env"); process.exit(1); }

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 1. Get access token (Client Credentials — no user login needed) ────────────
const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
  method:  "POST",
  headers: {
    "Content-Type":  "application/x-www-form-urlencoded",
    "Authorization": "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
  },
  body: "grant_type=client_credentials",
});

const { access_token } = await tokenRes.json();
if (!access_token) { console.error("Failed to get token"); process.exit(1); }
console.log("✓ Got Spotify token\n");

// ── 2. Load albums ─────────────────────────────────────────────────────────────
const { ALBUMS } = await import("../src/data/albums.js");

// ── 3. Search each album and collect cover URLs ────────────────────────────────
const covers  = {};
const missing = [];

for (const album of ALBUMS) {
  // Build search query: narrow by album title + first artist name
  const primaryArtist = album.artist.split(/[,&]/)[0].trim();
  const q = `album:${album.title} artist:${primaryArtist}`;

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=3`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  const data = await res.json();
  const items = data.albums?.items ?? [];

  // Try to find the right year match first, then fall back to first result
  const match =
    items.find((i) => Math.abs(new Date(i.release_date).getFullYear() - album.year) <= 1) ??
    items[0];

  // Prefer 300px image; fall back to whatever is available
  const img =
    match?.images?.find((i) => i.width === 300)?.url ??
    match?.images?.[1]?.url ??
    match?.images?.[0]?.url;

  if (img) {
    covers[album.id] = img;
    console.log(`✓ [${album.id}] ${album.title} — ${album.artist}`);
  } else {
    missing.push(album);
    console.log(`✗ NOT FOUND: [${album.id}] ${album.title} — ${album.artist}`);
  }

  // ~3 requests/second to stay well under rate limits
  await new Promise((r) => setTimeout(r, 340));
}

// ── 4. Write covers.json ───────────────────────────────────────────────────────
const outPath = join(__dirname, "../src/data/covers.json");
writeFileSync(outPath, JSON.stringify(covers, null, 2));

console.log(`\n✓ Done — ${Object.keys(covers).length}/${ALBUMS.length} covers saved to src/data/covers.json`);

if (missing.length) {
  console.log(`\n✗ Missing (${missing.length}):`);
  missing.forEach((a) => console.log(`  [${a.id}] ${a.title} — ${a.artist}`));
}
