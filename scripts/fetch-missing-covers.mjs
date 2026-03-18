/**
 * Targeted re-fetch for albums that the original script missed.
 * Uses adjusted search queries to improve match rate.
 * Run with:  node --env-file=.env scripts/fetch-missing-covers.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) { console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env"); process.exit(1); }

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 1. Get access token ────────────────────────────────────────────────────────
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

// ── 2. Load existing covers ────────────────────────────────────────────────────
const coversPath = join(__dirname, "../src/data/covers.json");
const covers = JSON.parse(readFileSync(coversPath, "utf8"));

// ── 3. Define missing albums with adjusted queries ─────────────────────────────
// Format: { id, title (for logging), queries: [...] }
// Tries each query in order, stops at first match.
const missing = [
  { id: 17,  title: "Kyōgen - Ado",                    queries: ["Kyogen Ado", "狂言 Ado", "album:Kyogen artist:Ado"] },
  { id: 28,  title: "Escape From New York - Beast Coast",queries: ["album:Escape From New York artist:Beast Coast", "Escape From New York Beast Coast"] },
  { id: 38,  title: "3.15.20 - Childish Gambino",       queries: ["album:3.15.20 artist:Childish Gambino", "3.15.20 Childish Gambino", "Donald Glover 3.15.20"] },
  { id: 63,  title: "What a Time to be Alive - Future & Drake", queries: ["album:What a Time to Be Alive artist:Future", "What a Time to Be Alive Future Drake"] },
  { id: 72,  title: "† (Cross) - Justice",              queries: ["album:Cross artist:Justice", "Justice Cross 2007", "† Justice"] },
  { id: 99,  title: "Kinjitou - Reol",                  queries: ["album:Kinjitou artist:Reol", "金字塔 Reol", "Kinjitou Reol"] },
  { id: 103, title: "Run The Jewels 4 - Run The Jewels", queries: ["album:RTJ4 artist:Run The Jewels", "RTJ4 Run The Jewels", "album:Run The Jewels 4 artist:Run The Jewels"] },
  { id: 109, title: "An Evening With Silk Sonic",        queries: ["album:An Evening With Silk Sonic", "Silk Sonic Evening", "Bruno Mars Anderson Paak Silk Sonic"] },
  { id: 128, title: "Heads in the Clouds - 88rising",   queries: ["album:Heads in the Clouds artist:88rising", "Heads in the Clouds 88rising"] },
  { id: 146, title: "Bryson Tiller - Bryson Tiller",    queries: ["album:Bryson Tiller artist:Bryson Tiller", "Bryson Tiller self-titled 2023"] },
  { id: 157, title: "Music to Be Murdered By - Eminem", queries: ["album:Music to Be Murdered By artist:Eminem", "Music to Be Murdered By Eminem 2020"] },
  { id: 180, title: "All-Amerikkkan Bada$$ - Joey Bada$$", queries: ["album:All-Amerikkkan Badass artist:Joey Badass", "All Amerikkkan Bada$$ Joey Bada$$", "Joey Badass All Amerikkkan"] },
  { id: 200, title: "PARTYPACK EP - PARTYNEXTDOOR",     queries: ["album:PARTYPACK artist:PARTYNEXTDOOR", "PARTYPACK PARTYNEXTDOOR"] },
  { id: 207, title: "August 26 - Post Malone",          queries: ["album:August 26 artist:Post Malone", "Post Malone August 26 2023"] },
  { id: 208, title: "Hollywood's Bleeding - Post Malone",queries: ["album:Hollywood's Bleeding artist:Post Malone", "Hollywoods Bleeding Post Malone"] },
  { id: 212, title: "NEW ROMANCER - RIM",               queries: ["album:NEW ROMANCER artist:RIM", "NEW ROMANCER RIM 2021"] },
  { id: 213, title: "NEW ROMANCER 2 - RIM",             queries: ["album:NEW ROMANCER 2 artist:RIM", "NEW ROMANCER 2 RIM"] },
  { id: 217, title: "Black Face LP - ScHoolboy Q",      queries: ["album:Setbacks artist:ScHoolboy Q", "album:Black Panther ScHoolboy", "ScHoolboy Q Black Face 2011", "Setbacks ScHoolboy Q"] },
  { id: 229, title: "Exodus - Utada Hikaru",            queries: ["album:Exodus artist:Utada Hikaru", "Exodus Utada 2004", "album:Exodus artist:Utada"] },
  { id: 234, title: "The Lost Boy - YBN Cordae",        queries: ["album:The Lost Boy artist:Cordae", "The Lost Boy YBN Cordae", "The Lost Boy Cordae 2019"] },
  { id: 261, title: "Huncho Jack, Jack Huncho",         queries: ["album:Huncho Jack Jack Huncho artist:Travis Scott", "Huncho Jack Jack Huncho Quavo Travis Scott"] },
  { id: 262, title: "Twenty88 - Big Sean & Jhené Aiko", queries: ["album:Twenty88 artist:Big Sean", "Twenty88 Big Sean Jhene Aiko", "album:Twenty88"] },
  { id: 265, title: "On the Rvn - Young Thug",          queries: ["album:On the Rvn artist:Young Thug", "On the Rvn Young Thug 2019"] },
];

// ── 4. Fetch each ──────────────────────────────────────────────────────────────
for (const album of missing) {
  let found = false;

  for (const q of album.queries) {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=5`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const data = await res.json();
    const items = data.albums?.items ?? [];

    const match = items[0];
    const img =
      match?.images?.find((i) => i.width === 300)?.url ??
      match?.images?.[1]?.url ??
      match?.images?.[0]?.url;

    if (img) {
      covers[String(album.id)] = img;
      console.log(`✓ [${album.id}] ${album.title}  (query: "${q}")`);
      console.log(`  → ${match.name} — ${match.artists.map(a=>a.name).join(", ")} (${match.release_date})`);
      found = true;
      break;
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  if (!found) {
    console.log(`✗ NOT FOUND: [${album.id}] ${album.title}`);
  }

  await new Promise((r) => setTimeout(r, 340));
}

// ── 5. Write updated covers.json ───────────────────────────────────────────────
// Sort keys numerically before writing
const sorted = Object.fromEntries(
  Object.entries(covers).sort((a, b) => Number(a[0]) - Number(b[0]))
);
writeFileSync(coversPath, JSON.stringify(sorted, null, 2));
console.log("\n✓ covers.json updated.");
