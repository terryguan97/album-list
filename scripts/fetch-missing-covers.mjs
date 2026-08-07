/**
 * Fetches covers for any album whose slug is absent from covers.json.
 * Automatically detects missing entries — no hardcoded IDs needed.
 *
 * Run with:  node --env-file=.env scripts/fetch-missing-covers.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) { console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env"); process.exit(1); }

const __dirname  = dirname(fileURLToPath(import.meta.url));
const coversPath = join(__dirname, "../src/data/covers.json");

// ── 1. Get token ───────────────────────────────────────────────────────────────
const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "Content-Type":  "application/x-www-form-urlencoded",
    "Authorization": "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
  },
  body: "grant_type=client_credentials",
});
const { access_token } = await tokenRes.json();
if (!access_token) { console.error("Failed to get token"); process.exit(1); }
console.log("✓ Got Spotify token\n");

// ── 2. Find missing ────────────────────────────────────────────────────────────
const { ALBUMS } = await import("../src/data/albums.js");
const covers     = JSON.parse(readFileSync(coversPath, "utf8"));
const missing    = ALBUMS.filter(a => !covers[a.slug]);

if (missing.length === 0) { console.log("✓ No missing covers."); process.exit(0); }
console.log(`Missing (${missing.length}):`);
missing.forEach(a => console.log(`  ${a.slug}`));
console.log();

// ── 3. Fetch each missing cover ────────────────────────────────────────────────
for (const album of missing) {
  const primaryArtist = album.artist.split(/[,&]/)[0].trim();
  const q = `album:${album.title} artist:${primaryArtist}`;

  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=3`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const data  = await res.json();
  const items = data.albums?.items ?? [];
  const match = items.find(i => Math.abs(new Date(i.release_date).getFullYear() - album.year) <= 1) ?? items[0];
  const img   =
    match?.images?.find(i => i.width === 300)?.url ??
    match?.images?.[1]?.url ??
    match?.images?.[0]?.url;

  if (img) {
    covers[album.slug] = img;
    console.log(`✓ ${album.slug}`);
    console.log(`  → ${match.name} (${match.release_date})`);
  } else {
    console.log(`✗ NOT FOUND: ${album.slug}`);
  }
  await new Promise(r => setTimeout(r, 340));
}

// ── 4. Write ───────────────────────────────────────────────────────────────────
writeFileSync(coversPath, JSON.stringify(covers, null, 2));
console.log("\n✓ covers.json updated.");
