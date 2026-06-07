/* ===== Best Deals — Browse page (vanilla JS, no dependencies) ===== */
(function () {
  "use strict";

  var DATA_URL = "./data/coupons.json";
  var RELIABILITY_RANK = { high: 0, medium: 1, low: 2 };

  var state = { category: "All", query: "", sort: "reliability", reliability: "all" };
  var allCoupons = [];
  var meta = { generatedAt: null, categories: [] };
  var els = {};
  function $(id) { return document.getElementById(id); }

  document.addEventListener("DOMContentLoaded", function () {
    els = {
      grid: $("coupon-grid"),
      categoryList: $("category-list"),
      search: $("search"),
      sort: $("sort"),
      reliability: $("reliability"),
      resultCount: $("result-count"),
      loading: $("loading"),
      error: $("error"),
      empty: $("empty"),
      footerUpdated: $("footer-updated"),
      copyLive: $("copy-live"),
      openFilters: $("open-filters"),
      filtersDrawer: $("filters-drawer"),
      detailDrawer: $("detail-drawer"),
      detailBody: $("detail-body"),
      detailTitle: $("detail-title"),
      filterBadge: $("filter-badge"),
      activeFilters: $("active-filters"),
      clearFilters: $("clear-filters"),
      applyCount: $("apply-count")
    };
    bindControls();
    loadData();
  });

  function loadData() {
    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (data) {
        allCoupons = Array.isArray(data.coupons) ? data.coupons : [];
        meta.generatedAt = data.generatedAt || null;
        meta.categories = Array.isArray(data.categories) && data.categories.length
          ? data.categories.slice() : deriveCategories(allCoupons);
        if (els.loading) els.loading.hidden = true;
        applyQueryParams();
        renderFooter();
        renderCategories();
        render();
      })
      .catch(function (err) {
        console.error("Failed to load coupons:", err);
        if (els.loading) els.loading.hidden = true;
        if (els.error) els.error.hidden = false;
      });
  }

  function deriveCategories(list) {
    var seen = {}, out = [];
    list.forEach(function (c) { if (c.category && !seen[c.category]) { seen[c.category] = true; out.push(c.category); } });
    out.sort();
    return out;
  }

  // Apply ?store= / ?category= deep-links coming from the overview page.
  function applyQueryParams() {
    try {
      var params = new URLSearchParams(window.location.search);
      var qpCat = params.get("category");
      var qpStore = params.get("store");
      if (qpCat && meta.categories.indexOf(qpCat) !== -1) state.category = qpCat;
      if (qpStore) {
        state.query = String(qpStore).trim().toLowerCase();
        if (els.search) els.search.value = qpStore;
      }
    } catch (e) { /* ignore */ }
  }

  function renderFooter() {
    var updated = meta.generatedAt ? formatDateTime(meta.generatedAt) : "—";
    if (els.footerUpdated) els.footerUpdated.textContent = updated;
  }

  // ---- Category pills (inside the filters drawer) ----
  function renderCategories() {
    var counts = {};
    allCoupons.forEach(function (c) { counts[c.category] = (counts[c.category] || 0) + 1; });
    var cats = ["All"].concat(meta.categories);
    var frag = document.createDocumentFragment();
    cats.forEach(function (cat) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "category-pill";
      btn.setAttribute("aria-pressed", String(cat === state.category));
      btn.dataset.category = cat;
      btn.appendChild(el("span", null, cat));
      var n = cat === "All" ? allCoupons.length : (counts[cat] || 0);
      btn.appendChild(el("span", "count", "(" + n + ")"));
      btn.addEventListener("click", function () { state.category = cat; updatePillStates(); render(); });
      li.appendChild(btn);
      frag.appendChild(li);
    });
    els.categoryList.innerHTML = "";
    els.categoryList.appendChild(frag);
  }

  function updatePillStates() {
    var pills = els.categoryList.querySelectorAll(".category-pill");
    Array.prototype.forEach.call(pills, function (p) {
      p.setAttribute("aria-pressed", String(p.dataset.category === state.category));
    });
  }

  // ---- Controls / drawers ----
  function bindControls() {
    var t;
    if (els.search) els.search.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { state.query = els.search.value.trim().toLowerCase(); render(); }, 150);
    });
    if (els.sort) els.sort.addEventListener("change", function () { state.sort = els.sort.value; render(); });
    if (els.reliability) els.reliability.addEventListener("change", function () { state.reliability = els.reliability.value; render(); });
    if (els.openFilters) els.openFilters.addEventListener("click", function () {
      if (window.BDDrawer) window.BDDrawer.open(els.filtersDrawer, els.openFilters);
    });
    if (els.clearFilters) els.clearFilters.addEventListener("click", clearAllFilters);
  }

  function clearAllFilters() {
    state.category = "All"; state.query = ""; state.reliability = "all"; state.sort = "reliability";
    if (els.search) els.search.value = "";
    if (els.reliability) els.reliability.value = "all";
    if (els.sort) els.sort.value = "reliability";
    updatePillStates();
    render();
  }

  // ---- Filtering & sorting ----
  function getFiltered() {
    var q = state.query;
    return allCoupons.filter(function (c) {
      if (state.category !== "All" && c.category !== state.category) return false;
      if (state.reliability !== "all" && c.reliability !== state.reliability) return false;
      if (q) {
        var hay = [c.store, c.title, c.description, c.code, c.category, c.discount].filter(Boolean).join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(sorter);
  }

  function sorter(a, b) {
    if (state.sort === "store") return String(a.store).localeCompare(String(b.store));
    if (state.sort === "verified") return new Date(b.verifiedAt || 0) - new Date(a.verifiedAt || 0);
    var ra = RELIABILITY_RANK[a.reliability] != null ? RELIABILITY_RANK[a.reliability] : 99;
    var rb = RELIABILITY_RANK[b.reliability] != null ? RELIABILITY_RANK[b.reliability] : 99;
    if (ra !== rb) return ra - rb;
    return String(a.store).localeCompare(String(b.store));
  }

  // ---- Render ----
  function render() {
    var list = getFiltered();
    els.grid.innerHTML = "";
    var msg = list.length === allCoupons.length
      ? "Showing all " + list.length + " coupons"
      : "Showing " + list.length + " of " + allCoupons.length + " coupons";
    if (els.resultCount) els.resultCount.textContent = msg;
    if (els.applyCount) els.applyCount.textContent = String(list.length);
    if (els.empty) els.empty.hidden = list.length !== 0;
    var frag = document.createDocumentFragment();
    list.forEach(function (c) { frag.appendChild(createCard(c)); });
    els.grid.appendChild(frag);
    updateActiveFilters();
  }

  function updateActiveFilters() {
    var active = [];
    if (state.category !== "All") active.push({ key: "category", label: state.category });
    if (state.reliability !== "all") active.push({ key: "reliability", label: cap(state.reliability) + " reliability" });
    if (state.query) active.push({ key: "query", label: "“" + state.query + "”" });

    if (els.filterBadge) {
      if (active.length) { els.filterBadge.hidden = false; els.filterBadge.textContent = String(active.length); }
      else els.filterBadge.hidden = true;
    }
    if (els.activeFilters) {
      els.activeFilters.innerHTML = "";
      active.forEach(function (a) {
        var chip = document.createElement("button");
        chip.type = "button";
        chip.className = "active-chip";
        chip.setAttribute("aria-label", "Remove filter: " + a.label);
        chip.appendChild(document.createTextNode(a.label + " "));
        chip.appendChild(el("span", "chip-x", "✕"));
        chip.addEventListener("click", function () { removeFilter(a.key); });
        els.activeFilters.appendChild(chip);
      });
      els.activeFilters.hidden = active.length === 0;
    }
  }

  function removeFilter(key) {
    if (key === "category") state.category = "All";
    else if (key === "reliability") { state.reliability = "all"; if (els.reliability) els.reliability.value = "all"; }
    else if (key === "query") { state.query = ""; if (els.search) els.search.value = ""; }
    updatePillStates();
    render();
  }

  // ---- Summary card (opens the detail drawer) ----
  function createCard(c) {
    var card = document.createElement("div");
    card.className = "card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", c.store + ": " + (c.discount || c.title || "offer") + ". View details.");

    var top = el("div", "card-top");
    top.appendChild(el("span", "card-store", c.store));
    var rel = (c.reliability || "low").toLowerCase();
    top.appendChild(el("span", "badge badge-rel-" + rel, cap(rel)));
    card.appendChild(top);

    if (c.discount) card.appendChild(el("div", "card-discount", c.discount));
    if (c.title) card.appendChild(el("div", "card-title", c.title));

    var foot = el("div", "card-foot-sum");
    if (c.category) foot.appendChild(el("span", "chip chip-category", c.category));
    var hasCode = c.code != null && String(c.code).trim() !== "";
    foot.appendChild(el("span", "card-cue", hasCode ? "Get code ›" : "View deal ›"));
    card.appendChild(foot);

    card.addEventListener("click", function () { openDetail(c, card); });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); openDetail(c, card); }
    });
    return card;
  }

  // ---- Detail drawer ----
  function openDetail(c, trigger) {
    var body = els.detailBody;
    body.innerHTML = "";
    els.detailTitle.textContent = c.store;

    var badges = el("div", "detail-badges");
    var rel = (c.reliability || "low").toLowerCase();
    var b = el("span", "badge badge-rel-" + rel, cap(rel));
    b.title = reliabilityHint(rel);
    badges.appendChild(b);
    if (c.category) badges.appendChild(el("span", "chip chip-category", c.category));
    body.appendChild(badges);

    if (c.discount) body.appendChild(el("div", "detail-discount", c.discount));
    if (c.title) body.appendChild(el("div", "detail-subtitle", c.title));
    if (c.description) body.appendChild(el("p", "detail-desc", c.description));

    body.appendChild(buildCodeBlock(c));

    var dl = el("div", "detail-meta");
    if (c.eligibility) dl.appendChild(metaRow("Who", c.eligibility));
    if (c.expiry) dl.appendChild(metaRow("Expires", formatDate(c.expiry)));
    dl.appendChild(metaRow("Confirmed active", c.verifiedAt ? formatDateTime(c.verifiedAt) : "—"));
    body.appendChild(dl);

    if (c.source) {
      var a = document.createElement("a");
      a.className = "btn-primary detail-cta";
      a.href = c.source; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.textContent = "Get the deal →";
      body.appendChild(a);
      body.appendChild(el("p", "detail-source", "Opens " + (c.sourceName || "the source") + " in a new tab. Verify the discount before you pay."));
    }

    if (window.BDDrawer) window.BDDrawer.open(els.detailDrawer, trigger);
  }

  function buildCodeBlock(c) {
    var hasCode = c.code != null && String(c.code).trim() !== "";
    var wrap = el("div", "detail-code-wrap");
    if (hasCode) {
      wrap.appendChild(el("span", "detail-code-label", "Coupon code"));
      var row = el("div", "code-row");
      var box = el("div", "code-box", c.code);
      box.title = c.code;
      row.appendChild(box);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code " + c.code);
      btn.addEventListener("click", function () { copyCode(c.code, btn); });
      row.appendChild(btn);
      wrap.appendChild(row);
    } else {
      var label = c.type === "signup"
        ? "No code — sign up at the store to unlock this offer"
        : "No code needed — the discount applies automatically";
      wrap.appendChild(el("div", "code-box no-code", label));
    }
    return wrap;
  }

  function metaRow(k, v) {
    var row = el("div", "detail-meta-row");
    row.appendChild(el("span", "detail-meta-k", k));
    row.appendChild(el("span", "detail-meta-v", v));
    return row;
  }

  // ---- Copy to clipboard (with fallback) ----
  function copyCode(code, btn) {
    var done = function () {
      btn.classList.add("copied");
      btn.textContent = "Copied!";
      if (els.copyLive) els.copyLive.textContent = "Copied code " + code + " to clipboard";
      setTimeout(function () { btn.textContent = "Copy"; btn.classList.remove("copied"); }, 1600);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(done).catch(function () { fallbackCopy(code, done); });
    } else { fallbackCopy(code, done); }
  }

  function fallbackCopy(code, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = code; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (e) {
      if (els.copyLive) els.copyLive.textContent = "Press Ctrl+C to copy: " + code;
    }
  }

  // ---- Helpers ----
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }

  function reliabilityHint(rel) {
    if (rel === "high") return "Official / evergreen code (first-order, newsletter, student, or trial offer).";
    if (rel === "medium") return "Dated promo with a stated expiry from a reputable deal source.";
    return "Aggregator-listed code with limited corroboration — verify before use.";
  }

  function formatDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    try {
      return d.toLocaleString("en-US", {
        timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true
      }) + " UTC";
    } catch (e) { return d.toUTCString(); }
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    try {
      return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
    } catch (e) { return String(iso); }
  }
})();
