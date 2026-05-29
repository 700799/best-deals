#!/usr/bin/env node
/**
 * Validate + normalize data/coupons.json (no dependencies).
 *
 *  - Validates required fields and enum values.
 *  - Dedupes by store+code (case-insensitive); for no-code offers, by store+title.
 *  - Generates a stable `id` where missing.
 *  - Sorts coupons (category, store, title) and orders `categories` by count.
 *  - Recomputes `count` and `categories`, stamps `generatedAt` (unless --keep-date).
 *  - Writes the file back pretty-printed.
 *
 * Exits non-zero (without writing) if any record fails validation.
 *
 * Usage: node scripts/validate-coupons.mjs [--keep-date] [--check]
 *   --check      validate only; never write.
 *   --keep-date  preserve the existing generatedAt instead of stamping now.
 */
import { readFileSync, writeFileSync } from "node:fs";

const DATA_PATH = new URL("../data/coupons.json", import.meta.url);
const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has("--check");
const KEEP_DATE = args.has("--keep-date");

const TYPES = new Set(["code", "deal", "signup"]);
const RELIABILITY = new Set(["high", "medium", "low"]);
const REQUIRED = ["store", "category", "title", "type", "description", "discount", "reliability", "source", "sourceName", "verifiedAt"];

function fail(msg) {
  console.error("✗ " + msg);
  process.exitCode = 1;
}

function slug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

let raw;
try {
  raw = readFileSync(DATA_PATH, "utf8");
} catch (e) {
  console.error("Could not read " + DATA_PATH.pathname + ": " + e.message);
  process.exit(1);
}

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error("data/coupons.json is not valid JSON: " + e.message);
  process.exit(1);
}

const coupons = Array.isArray(data.coupons) ? data.coupons : null;
if (!coupons) {
  console.error('Expected top-level "coupons" array.');
  process.exit(1);
}

const errors = [];
const seenIds = new Set();
const seenKeys = new Set();
const deduped = [];

coupons.forEach((c, i) => {
  const where = `coupon[${i}] (${c && c.store ? c.store : "?"})`;

  if (!c || typeof c !== "object") {
    errors.push(`${where}: not an object`);
    return;
  }
  for (const f of REQUIRED) {
    if (c[f] == null || String(c[f]).trim() === "") errors.push(`${where}: missing "${f}"`);
  }
  if (c.type && !TYPES.has(c.type)) errors.push(`${where}: invalid type "${c.type}"`);
  if (c.reliability && !RELIABILITY.has(c.reliability)) errors.push(`${where}: invalid reliability "${c.reliability}"`);

  const hasCode = c.code != null && String(c.code).trim() !== "";
  if (c.type === "code" && !hasCode) errors.push(`${where}: type "code" but no code value`);
  // A coupon that carries a usable code is a "code" offer for display purposes — normalize.
  if (hasCode && c.type !== "code") c.type = "code";

  if (c.source && !/^https?:\/\//i.test(c.source)) errors.push(`${where}: source is not an http(s) URL`);
  if (c.verifiedAt && isNaN(new Date(c.verifiedAt))) errors.push(`${where}: verifiedAt is not a valid date`);
  if (c.expiry != null && c.expiry !== "" && isNaN(new Date(c.expiry))) errors.push(`${where}: expiry is not a valid date`);

  // normalize optional fields
  if (!hasCode) c.code = null;
  if (c.eligibility === "" ) c.eligibility = null;
  if (c.expiry === "") c.expiry = null;

  // id
  let id = c.id && String(c.id).trim() ? slug(c.id) : slug(c.store) + "-" + slug(hasCode ? c.code : c.title);
  let base = id, n = 2;
  while (seenIds.has(id)) id = base + "-" + n++;
  seenIds.add(id);
  c.id = id;

  // dedupe key
  const key = hasCode
    ? slug(c.store) + "|" + String(c.code).trim().toLowerCase()
    : slug(c.store) + "|" + slug(c.title);
  if (seenKeys.has(key)) return; // drop duplicate
  seenKeys.add(key);
  deduped.push(c);
});

if (errors.length) {
  errors.forEach(fail);
  console.error(`\n${errors.length} validation error(s). File not written.`);
  process.exit(1);
}

// sort coupons
deduped.sort((a, b) =>
  String(a.category).localeCompare(String(b.category)) ||
  String(a.store).localeCompare(String(b.store)) ||
  String(a.title).localeCompare(String(b.title))
);

// categories ordered by count desc, then alpha
const counts = {};
deduped.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
const categories = Object.keys(counts).sort((a, b) => (counts[b] - counts[a]) || a.localeCompare(b));

const relCounts = { high: 0, medium: 0, low: 0 };
deduped.forEach((c) => { relCounts[c.reliability] = (relCounts[c.reliability] || 0) + 1; });

const out = {
  generatedAt: KEEP_DATE && data.generatedAt ? data.generatedAt : new Date().toISOString(),
  count: deduped.length,
  categories,
  coupons: deduped
};

const dropped = coupons.length - deduped.length;

console.log("Best Deals — coupon data validation");
console.log("------------------------------------");
console.log("Total coupons:      " + out.count + (dropped ? "  (" + dropped + " duplicate(s) dropped)" : ""));
console.log("Categories:         " + categories.length);
console.log("Reliability:        high " + relCounts.high + " / medium " + relCounts.medium + " / low " + relCounts.low);
console.log("");
categories.forEach((cat) => console.log("  " + cat.padEnd(26) + counts[cat]));
console.log("");

if (out.count < 100) {
  console.warn("⚠  Fewer than 100 coupons (" + out.count + ").");
}

if (CHECK_ONLY) {
  console.log("--check: validation passed, file not written.");
  process.exit(0);
}

writeFileSync(DATA_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log("✓ Wrote " + DATA_PATH.pathname + " (generatedAt " + out.generatedAt + ")");
