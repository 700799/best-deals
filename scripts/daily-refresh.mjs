#!/usr/bin/env node
/**
 * Daily freshness pass — no dependencies, no LLM, no network.
 * Run by .github/workflows/daily-refresh.yml every morning:
 *   1. Prune deals whose `expiry` is before today (UTC).
 *   2. Recompute `featured` (top ~40 by score, balanced by category & store).
 *   3. Rotate "Today's Top 10" — a date-seeded shuffle of the featured set,
 *      so the Top 10 changes every day while staying high-quality.
 *   4. Re-stamp `generatedAt` (drives the visible "Last updated" time) and
 *      recompute `count` / `categories`.
 * It never invents deals; the catalogue only gains new deals on re-collection.
 */
import { readFileSync, writeFileSync } from "node:fs";

const DATA = new URL("../data/coupons.json", import.meta.url);
const FEATURED = 40;

const now = new Date();
const todayMid = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
const dayNumber = Math.floor(todayMid / 86400000);

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

// Deterministic per-day shuffle (LCG seeded by the day number).
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = (seed >>> 0) || 1;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

const data = JSON.parse(readFileSync(DATA, "utf8"));
let coupons = Array.isArray(data.coupons) ? data.coupons : [];
const before = coupons.length;

// 1) prune expired
coupons = coupons.filter((c) => {
  if (!c.expiry) return true;
  const e = new Date(c.expiry);
  if (isNaN(e)) return true;
  return e.getTime() >= todayMid;
});
const pruned = before - coupons.length;

coupons.forEach((c) => { c.featured = false; c.top10 = false; c.dailyRank = null; });

// 2) featured = top ~40 by score, <=4 per category, <=2 per store
const byScore = coupons.slice().sort((a, b) => (b.score || 0) - (a.score || 0) || String(a.store).localeCompare(String(b.store)));
const featured = [];
{
  const catN = {}, stN = {};
  for (const c of byScore) {
    if (featured.length >= FEATURED) break;
    if ((catN[c.category] || 0) >= 4) continue;
    if ((stN[slug(c.store)] || 0) >= 2) continue;
    c.featured = true; featured.push(c);
    catN[c.category] = (catN[c.category] || 0) + 1;
    stN[slug(c.store)] = (stN[slug(c.store)] || 0) + 1;
  }
}

// 3) Today's Top 10 = date-seeded shuffle of the featured set, <=2 per store
{
  const shuffled = seededShuffle(featured, dayNumber);
  const stN = {}; let rank = 0;
  for (const c of shuffled) {
    if (rank >= 10) break;
    if ((stN[slug(c.store)] || 0) >= 2) continue;
    c.top10 = true; c.dailyRank = ++rank;
    stN[slug(c.store)] = (stN[slug(c.store)] || 0) + 1;
  }
}

// 4) re-stamp + recompute
const counts = {};
coupons.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
const categories = Object.keys(counts).sort((a, b) => (counts[b] - counts[a]) || a.localeCompare(b));

writeFileSync(DATA, JSON.stringify({ generatedAt: now.toISOString(), count: coupons.length, categories, coupons }, null, 2) + "\n");
console.log("Daily refresh " + now.toISOString() + ": pruned " + pruned + " expired, " + coupons.length + " remain across " + categories.length + " categories; Top 10 rotated (day " + dayNumber + ").");
