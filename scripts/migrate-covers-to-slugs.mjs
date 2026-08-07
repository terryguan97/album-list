/**
 * One-time migration: rekeys covers.json from numeric IDs to artist-title slugs.
 * Run once after updating albums.js to use slugify().
 *
 *   node scripts/migrate-covers-to-slugs.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const coversPath = join(__dirname, "../src/data/covers.json");

const { ALBUMS } = await import("../src/data/albums.js");
const oldCovers  = JSON.parse(readFileSync(coversPath, "utf8"));

const newCovers = {};
let migrated = 0, missing = 0;

for (const album of ALBUMS) {
  const oldUrl = oldCovers[String(album.id)];
  if (oldUrl) {
    newCovers[album.slug] = oldUrl;
    migrated++;
  } else {
    console.log(`  ✗ no cover for [${album.id}] ${album.title} — ${album.artist} (slug: ${album.slug})`);
    missing++;
  }
}

writeFileSync(coversPath, JSON.stringify(newCovers, null, 2));
console.log(`\n✓ Migration complete — ${migrated} slugs written, ${missing} still missing.`);
