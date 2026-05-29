# Best Deals 🏷️

A standalone, **zero-build** static webapp that displays a curated directory of **real coupon &
promo codes**, organized by category and browsable with search, filtering, and sorting.

The site has two pages:

| Page | File | What it shows |
| --- | --- | --- |
| **Overview (home)** | `index.html` | A stats dashboard — totals by category, reliability mix, offer types, top stores, and freshness/expiry. |
| **Browse** | `browse.html` | The full, filterable coupon list. Each card has a copy-to-clipboard code, source link, and confirmation time. |

> **146 coupons** across **14 categories**, collected **2026-05-29**.

## ⚠️ How to read the data (please read)

Coupon codes **cannot be truly tested without going through a real checkout**, and codes posted on
aggregator sites go stale quickly. So this directory is built for **transparency**, not false promises:

- **“Confirmed active at <time>”** means the code was found **listed as active on its linked source**
  at that UTC time — *not* that it was tested at a real checkout.
- Every coupon has a **source link** so you can verify it yourself.
- Every coupon has a **reliability tier**:
  - **High** — official / evergreen codes (first-order or newsletter/SMS discounts, student/military,
    free trials, or codes on the brand's own site).
  - **Medium** — dated, time-limited promos with an explicit expiry from a reputable deal site.
  - **Low** — aggregator-listed codes with weaker corroboration. *Verify before use.*

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
│       ├── app.js              # Browser page logic (filter/search/sort/copy)
│       └── stats.js            # Overview page logic (aggregations + charts)
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
  "generatedAt": "2026-05-29T21:03:49Z",   // when the dataset was assembled
  "count": 146,
  "categories": ["Fashion & Apparel", "..."],
  "coupons": [
    {
      "id": "ubereats-affeats10us0426",
      "store": "Uber Eats",
      "category": "Food Delivery",
      "title": "$10 off your first order of $20+",
      "code": "AFFEATS10US0426",          // null for no-code deals/signups
      "type": "code",                       // code | deal | signup
      "description": "New customers get $10 off a first order of $20 or more.",
      "discount": "$10 off",
      "eligibility": "New customers only",  // or null
      "expiry": "2026-05-31",               // ISO date or null
      "reliability": "high",                // high | medium | low
      "source": "https://...",
      "sourceName": "DealNews",
      "verifiedAt": "2026-05-29T20:25:00Z"
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

*Data is a point-in-time snapshot from 2026-05-29. The “Last updated” time on the Overview page and
each card's “Confirmed active” stamp make that freshness explicit.*
