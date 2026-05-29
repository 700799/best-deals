# 🏷️ Best Deals — Coupon Browser

A **standalone, zero-build static webapp** for browsing real coupon and promo codes by category.
It ships with **145 coupons across 14 categories**, gathered from public sources during a single
collection run on **2026-05-29**.

Each coupon shows **what it does**, a **reliability tier**, a **source link**, and the **UTC time it
was confirmed active** — and you can search, filter, sort, and copy codes with one click.

> **🔴 Please read — what "confirmed active" means.**
> Coupon codes are **not tested at a real checkout**. "Confirmed active" is the time the code was
> found **listed as active on its linked source**. Codes expire, can be region- or account-specific,
> and change without notice. Roughly 40% of aggregator codes go stale over time. **Always verify the
> discount applies before you pay**, and use the reliability badge + source link to judge each offer.
> This site has no brand affiliation and earns no commission.

## What's inside

- **145 coupons / 14 categories** — Fashion & Apparel, Health & Beauty, Food Delivery,
  Restaurants & Dining, Groceries & Meal Kits, Electronics & Tech, Home & Garden, Travel,
  General Retail, Pets, Software & SaaS, Streaming & Subscriptions, Gaming, Online Learning.
- **Reliability tiers** (filterable):
  - **High** — official / evergreen offers (first-order or newsletter codes, student/military, free trials, codes on the brand's own site).
  - **Medium** — dated, time-limited promos with a stated future expiry from a reputable deal site.
  - **Low** — aggregator-listed codes with limited corroboration.
- **Browse & find** — category pills, free-text search (store / offer / code), reliability filter, and
  sort by reliability / newest verified / store name.
- **Copy-to-clipboard** for every code (with a fallback for non-secure contexts).
- **Accessible & responsive** — keyboard friendly, ARIA live regions, light/dark theme.

## Project structure

```
index.html                      # the whole app (single page)
assets/css/styles.css           # styles + light/dark themes
assets/js/app.js                # vanilla JS: load, filter, sort, render, copy (no dependencies)
data/coupons.json               # the coupon dataset
scripts/validate-coupons.mjs    # validate / dedupe / normalize / re-stamp the dataset (Node, no deps)
.github/workflows/deploy-pages.yml   # GitHub Pages deployment (GitHub Actions)
vercel.json                     # Vercel static-hosting config
```

## Run locally

The page loads `data/coupons.json` with `fetch()`, so it must be served over HTTP — opening
`index.html` directly via `file://` will be blocked by the browser. Use any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Update / re-validate the data

Edit `data/coupons.json`, then run the validator. It checks required fields and enums, drops
duplicates, regenerates each `id`, recomputes `count`/`categories`, and re-stamps `generatedAt`:

```bash
node scripts/validate-coupons.mjs          # validate + normalize + write
node scripts/validate-coupons.mjs --check  # validate only (no write)
```

Each coupon record:

```json
{
  "store": "Uber Eats",
  "category": "Food Delivery",
  "title": "$10 off your first order of $20+",
  "code": "AFFEATS10US0426",
  "type": "code",
  "description": "New Uber Eats customers get $10 off a first order of $20 or more.",
  "discount": "$10 off",
  "eligibility": "New customers only",
  "expiry": "2026-05-31",
  "reliability": "high",
  "source": "https://www.dealnews.com/features/uber-eats/promo-codes/",
  "sourceName": "DealNews",
  "verifiedAt": "2026-05-29T20:40:00Z"
}
```

## Deployment

The site is fully static and works on either host (asset/data paths are relative, so it runs from a
subpath like `/best-deals/` or from a domain root).

### GitHub Pages
1. Push to the `main` branch.
2. In the repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow publishes the site; it also runs on demand via **Actions → Deploy to GitHub
   Pages → Run workflow**.
4. Live at `https://<owner>.github.io/best-deals/`.

### Vercel
The repo includes `vercel.json` for static hosting (no build step). Import the repo in Vercel, or
deploy from the branch for an instant live + preview URL.

---

*Data is a point-in-time snapshot from 2026-05-29. The "Last updated" time in the header and each
card's "Confirmed active" stamp make that freshness explicit.*
