# Best Deals 🏷️

A standalone, **zero-build** static webapp that surfaces a curated directory of **real, hand-picked
deals** on popular brands and products — scored, ranked, and browsable through drawers.

The site has two pages:

| Page | File | What it shows |
| --- | --- | --- |
| **Overview (home)** | `index.html` | Leads with **⭐ Today's Top 10** + a **🔥 Top Deals** rail, then a stats dashboard — totals by category, reliability mix, offer types, top stores, freshness/expiry. |
| **Browse** | `browse.html` | The deal grid with a **category-jump drawer** (incl. a **⭐ Top 10 Daily** filter), a **Filters** drawer (search / sort by *Best* / reliability / top-deals-only), and a **detail drawer** per deal (code + copy, terms, "Get the deal"). |

> **596 hand-picked deals** across **36 categories** — **wine by varietal** (Merlot, Cabernet, Pinot Noir, Chardonnay, Rosé, Sparkling…) and **spirits by type** (Whiskey & Bourbon, Tequila, Vodka, Gin, Rum) from retailers that ship · **Pickleball** & **Power Tools** · a big **Restaurants & Dining** section (national + Northern California) · Credit Cards · Internet & Mobile · Starlink · Automotive · AI & LLMs · Computers, and more. High/Medium only, **scored & ranked**, with a **⭐ Top 10 Daily** + Top Deals. Collected **2026-06-08**.

## ⚠️ How to read the data (please read)

Coupon codes **cannot be truly tested without going through a real checkout**, and codes posted on
aggregator sites go stale quickly. So this directory is built for **transparency**, not false promises:

- **“Confirmed active at <time>”** means the code was found **listed as active on its linked source**
  at that UTC time — *not* that it was tested at a real checkout.
- Every deal has a **source link** so you can verify it yourself.
- Every deal has a **reliability tier** (only **High/Medium** are kept):
  - **High** — official brand sale pages or strongly corroborated deals.
  - **Medium** — from a reputable deal site; rates can rotate, so verify before use.
- Every deal has a **score** (0–100) used by the *Best* sort; the top ~30 are **featured** as Top Deals, and the elite **top 10** form **Today's Top 10**.

Codes may expire, be region- or account-specific, or change at any time. **Always confirm the
discount applies before you pay.** This site has no affiliation with the brands listed and earns no
commission.

## Project structure

```
.
├── index.html                  # Overview / stats page (home)
├── browse.html                 # Coupon browser
├── assets/
│   ├── css/styles.css          # All styles (light/dark, responsive)
│   └── js/
│       ├── theme.js            # Shared light/dark toggle
│       ├── drawer.js           # Shared drawer controller (backdrop, ESC, focus trap)
│       ├── app.js              # Browse logic (filters/category/detail drawers, Best sort)
│       └── stats.js            # Overview logic (Top Deals, charts, category drawer)
├── data/coupons.json           # The dataset (single source of truth)
├── scripts/validate-coupons.mjs# Validate / normalize / dedupe the dataset (Node, no deps)
├── .github/workflows/deploy-pages.yml  # GitHub Pages deploy
├── vercel.json                 # Vercel static config
└── .nojekyll                   # Serve files as-is on GitHub Pages
```

No frameworks, no bundler, no dependencies — just HTML, CSS, and vanilla JS. All asset/data paths are
**relative**, so the site works from a GitHub Pages subpath *and* from a Vercel/root deploy.

## Run locally

```bash
# from the repo root
python3 -m http.server 8000
# then open http://localhost:8000/
```

(Opening `index.html` via `file://` will fail to load the data because browsers block `fetch` from the
filesystem — use a local server.)

## Data schema

`data/coupons.json`:

```jsonc
{
  "generatedAt": "2026-06-08T00:16:55Z",   // when the dataset was assembled
  "count": 596,
  "categories": ["Home & Garden", "Internet & Mobile", "AI & LLMs", "..."],
  "coupons": [
    {
      "id": "lululemon-up-to-67-off",
      "store": "Lululemon",
      "category": "Fashion & Apparel",
      "title": "We Made Too Much — up to 67% off + free shipping",
      "code": null,                          // null for no-code deals
      "type": "deal",                        // code | deal | signup
      "description": "Lululemon's outlet section, up to 67% off, free shipping.",
      "discount": "Up to 67% off",
      "eligibility": null,                   // or a string
      "expiry": "2026-06-11",                // ISO date or null
      "reliability": "high",                 // high | medium (low is excluded)
      "source": "https://...",
      "sourceName": "Lululemon",
      "verifiedAt": "2026-06-08T00:10:00Z",
      "score": 82,                           // 0–100 ranking ("Best" sort)
      "featured": true,                      // shown in Top Deals
      "top10": true,                         // in Today's Top 10
      "dailyRank": 1                         // 1–10 (null otherwise)
    }
  ]
}
```

### Validate / re-normalize the data

```bash
node scripts/validate-coupons.mjs          # validate, dedupe, sort, recount, stamp, write
node scripts/validate-coupons.mjs --check   # validate only (CI-friendly; never writes)
```

The validator fails (non-zero exit, no write) if any record is missing a required field or has an
invalid `type`/`reliability`/URL/date.

## Deployment

### GitHub Pages
A workflow at `.github/workflows/deploy-pages.yml` publishes the site on every push to `main`.
**One-time setup:** in the repo, go to **Settings → Pages → Build and deployment → Source** and choose
**“GitHub Actions.”** The site then serves at `https://<owner>.github.io/best-deals/`.

### Vercel
The repo includes `vercel.json` for a no-build static deploy. Import the repo into Vercel (or deploy
via the Vercel integration); it serves the root directory directly and gives an instant preview URL.

---

*Data is a point-in-time snapshot from 2026-06-08. Standout deals are time-limited, so this ages
faster than evergreen offers — the “Last updated” time and each deal's “Confirmed active” stamp make
that freshness explicit.*
