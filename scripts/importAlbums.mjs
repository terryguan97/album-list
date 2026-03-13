/**
 * One-time migration script: CSV → Firestore
 *
 * Usage:
 *   1. Export your spreadsheet as albums.csv and place it in the project root
 *   2. Make sure your CSV has these columns (names must match exactly):
 *      spotifyId, name, artist, year, genre (comma-separated), tier, coverUrl, spotifyUrl, notes
 *   3. Create a .env file with your Firebase config (see .env.example)
 *   4. Run: node scripts/importAlbums.mjs
 *
 * Install script dependencies first (one time):
 *   npm install --save-dev csv-parse dotenv
 */

import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { config } from "dotenv";

config(); // load .env

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const csvPath = new URL("../albums.csv", import.meta.url).pathname;
const rows = parse(readFileSync(csvPath), {
  columns: true,        // use first row as column names
  skip_empty_lines: true,
  trim: true,
});

console.log(`Found ${rows.length} albums to import...`);

let count = 0;
for (const row of rows) {
  const id = row.spotifyId;
  if (!id) {
    console.warn(`Skipping row with no spotifyId: ${row.name}`);
    continue;
  }

  await setDoc(doc(db, "albums", id), {
    spotifyId: id,
    name: row.name,
    artist: row.artist,
    year: Number(row.year),
    genre: row.genre ? row.genre.split(",").map((g) => g.trim()) : [],
    tier: row.tier || "C",
    coverUrl: row.coverUrl || "",
    spotifyUrl: row.spotifyUrl || "",
    notes: row.notes || "",
    addedAt: new Date(),
  });

  console.log(`[${++count}/${rows.length}] Imported: ${row.name} — ${row.artist}`);
}

console.log("\nDone! All albums imported.");
process.exit(0);
