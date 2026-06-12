/**
 * Fixes covers.json after inserting a new album mid-array in albums.js.
 *
 * When you insert an album at position N in the raw[] array, every album
 * after it shifts up by one ID, breaking the covers.json mapping.
 * Run this script immediately after the insert to re-align the keys.
 *
 * Usage:
 *   node scripts/shift-covers.mjs <insert-id>
 *
 * Example — inserted Graduation at position 74:
 *   node scripts/shift-covers.mjs 74
 *
 * The script shifts all keys >= <insert-id> up by 1 and leaves <insert-id>
 * empty. Then run fetch-missing-covers.mjs to fill in the new album's cover.
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const coversPath = join(__dirname, "../src/data/covers.json");

const insertId = parseInt(process.argv[2]);
if (!insertId || insertId < 1) {
  console.error("Usage: node scripts/shift-covers.mjs <insert-id>");
  console.error("Example: node scripts/shift-covers.mjs 74");
  process.exit(1);
}

const covers = JSON.parse(readFileSync(coversPath, "utf8"));
const shifted = {};

for (const [key, url] of Object.entries(covers)) {
  const id = parseInt(key);
  shifted[id < insertId ? key : String(id + 1)] = url;
}

writeFileSync(coversPath, JSON.stringify(shifted, null, 2));

const total = Object.keys(shifted).length;
console.log(`✓ Shifted covers.json: keys >= ${insertId} moved up by 1`);
console.log(`  ${total} covers retained — key ${insertId} is now empty`);
console.log(`  Run fetch-missing-covers.mjs to fill in the new album's cover`);
