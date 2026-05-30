/* ===== Best Deals — app logic (vanilla JS, no dependencies) ===== */
(function () {
  "use strict";

  var DATA_URL = "./data/coupons.json";
  var RELIABILITY_RANK = { high: 0, medium: 1, low: 2 };

  var state = {
    category: "All",
    query: "",
    sort: "reliability",
    reliability: "all"
  };

  var allCoupons = [];
  var meta = { generatedAt: null, categories: [] };

  // ---- DOM refs ----
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
      statTotal: $("stat-total"),
      statCategories: $("stat-categories"),
      statUpdated: $("stat-updated"),
      footerUpdated: $("footer-updated"),
      copyLive: $("copy-live")
    };

    bindControls();
    loadData();
  });

  // ---- Data loading ----
  function loadData() {
    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        allCoupons = Array.isArray(data.coupons) ? data.coupons : [];
        meta.generatedAt = data.generatedAt || null;
        meta.categories = Array.isArray(data.categories) && data.categories.length
          ? data.categories.slice()
          : deriveCategories(allCoupons);
        els.loading.hidden = true;
        applyQueryParams();
        renderStats();
        renderCategories();
        render();
      })
      .catch(function (err) {
        console.error("Failed to load coupons:", err);
        els.loading.hidden = true;
        els.error.hidden = false;
      });
  }

  function deriveCategories(list) {
    var seen = {};
    var out = [];
    list.forEach(function (c) {
      if (c.category && !seen[c.category]) { seen[c.category] = true; out.push(c.category); }
    });
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

  // ---- Stats ----
  function renderStats() {
    els.statTotal.textContent = String(allCoupons.length);
    els.statCategories.textContent = String(meta.categories.length);
    var updated = meta.generatedAt ? formatDateTime(meta.generatedAt) : "—";
    els.statUpdated.textContent = updated;
    els.footerUpdated.textContent = updated;
  }

  // ---- Category pills ----
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

      var label = document.createElement("span");
      label.textContent = cat;
      btn.appendChild(label);

      var n = cat === "All" ? allCoupons.length : (counts[cat] || 0);
      var count = document.createElement("span");
      count.className = "count";
      count.textContent = "(" + n + ")";
      btn.appendChild(count);

      btn.addEventListener("click", function () {
        state.category = cat;
        updatePillStates();
        render();
      });

      li.appendChild(btn);
      frag.appendChild(li);
    });

    els.categoryList.innerHTML = "";
    els.categoryList.appendChild(frag);
  }

  function updatePillStates() {
    var pills = els.categoryList.querySelectorAll(".category-pill");
    pills.forEach(function (p) {
      p.setAttribute("aria-pressed", String(p.dataset.category === state.category));
    });
  }

  // ---- Controls ----
  function bindControls() {
    var t;
    els.search.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        state.query = els.search.value.trim().toLowerCase();
        render();
      }, 150);
    });
    els.sort.addEventListener("change", function () {
      state.sort = els.sort.value;
      render();
    });
    els.reliability.addEventListener("change", function () {
      state.reliability = els.reliability.value;
      render();
    });
  }

  // ---- Filtering & sorting ----
  function getFiltered() {
    var q = state.query;
    return allCoupons.filter(function (c) {
      if (state.category !== "All" && c.category !== state.category) return false;
      if (state.reliability !== "all" && c.reliability !== state.reliability) return false;
      if (q) {
        var hay = [c.store, c.title, c.description, c.code, c.category, c.discount]
          .filter(Boolean).join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    }).sort(sorter);
  }

  function sorter(a, b) {
    if (state.sort === "store") {
      return String(a.store).localeCompare(String(b.store));
    }
    if (state.sort === "verified") {
      return new Date(b.verifiedAt || 0) - new Date(a.verifiedAt || 0);
    }
    // reliability (default): high -> medium -> low, then store A-Z
    var ra = RELIABILITY_RANK[a.reliability] != null ? RELIABILITY_RANK[a.reliability] : 99;
    var rb = RELIABILITY_RANK[b.reliability] != null ? RELIABILITY_RANK[b.reliability] : 99;
    if (ra !== rb) return ra - rb;
    return String(a.store).localeCompare(String(b.store));
  }

  // ---- Render ----
  function render() {
    var list = getFiltered();
    els.grid.innerHTML = "";

    els.resultCount.textContent = list.length === allCoupons.length
      ? "Showing all " + list.length + " coupons"
      : "Showing " + list.length + " of " + allCoupons.length + " coupons";

    els.empty.hidden = list.length !== 0;

    var frag = document.createDocumentFragment();
    list.forEach(function (c) { frag.appendChild(createCard(c)); });
    els.grid.appendChild(frag);
  }

  // ---- Card builder (textContent everywhere — no HTML injection) ----
  function createCard(c) {
    var card = document.createElement("article");
    card.className = "card";
    card.setAttribute("role", "listitem");

    // top: store + reliability badge
    var top = el("div", "card-top");
    top.appendChild(el("span", "card-store", c.store));
    var rel = (c.reliability || "low").toLowerCase();
    var badge = el("span", "badge badge-rel-" + rel, rel.charAt(0).toUpperCase() + rel.slice(1));
    badge.title = reliabilityHint(rel);
    top.appendChild(badge);
    card.appendChild(top);

    if (c.discount) card.appendChild(el("div", "card-discount", c.discount));
    if (c.title) card.appendChild(el("div", "card-title", c.title));
    if (c.description) card.appendChild(el("p", "card-desc", c.description));

    // meta chips: category + eligibility
    var metaRow = el("div", "card-meta");
    if (c.category) metaRow.appendChild(el("span", "chip chip-category", c.category));
    if (c.eligibility) metaRow.appendChild(el("span", "chip", c.eligibility));
    if (metaRow.childNodes.length) card.appendChild(metaRow);

    // code row
    card.appendChild(buildCodeRow(c));

    // footer: verified + source + expiry
    var foot = el("div", "card-foot");

    var verified = el("span", "verified");
    var check = el("span", "check", "✓");
    verified.appendChild(check);
    var vtext = c.verifiedAt ? "Confirmed active " + formatDateTime(c.verifiedAt) : "Confirmation time unknown";
    verified.appendChild(document.createTextNode(" " + vtext));
    foot.appendChild(verified);

    var right = el("span", "foot-right");
    if (c.expiry) {
      var exp = el("span", "expiry", "Expires " + formatDate(c.expiry));
      if (isSoon(c.expiry)) exp.classList.add("soon");
      right.appendChild(exp);
      right.appendChild(document.createTextNode("  "));
    }
    if (c.source) {
      var a = document.createElement("a");
      a.className = "source-link";
      a.href = c.source;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Source" + (c.sourceName ? ": " + c.sourceName : "");
      right.appendChild(a);
    }
    foot.appendChild(right);
    card.appendChild(foot);

    return card;
  }

  function buildCodeRow(c) {
    var row = el("div", "code-row");
    var hasCode = c.code != null && String(c.code).trim() !== "";

    if (hasCode) {
      var box = el("div", "code-box", c.code);
      box.title = c.code;
      row.appendChild(box);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "Copy";
      btn.setAttribute("aria-label", "Copy code " + c.code + " for " + c.store);
      btn.addEventListener("click", function () { copyCode(c.code, btn); });
      row.appendChild(btn);
    } else {
      var label = c.type === "signup" ? "No code — sign up at store" : "No code needed — automatic deal";
      row.appendChild(el("div", "code-box no-code", label));
    }
    return row;
  }

  // ---- Copy to clipboard (with fallback for non-secure contexts) ----
  function copyCode(code, btn) {
    var done = function () {
      btn.classList.add("copied");
      var original = "Copy";
      btn.textContent = "Copied!";
      els.copyLive.textContent = "Copied code " + code + " to clipboard";
      setTimeout(function () {
        btn.textContent = original;
        btn.classList.remove("copied");
      }, 1600);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(done).catch(function () { fallbackCopy(code, done); });
    } else {
      fallbackCopy(code, done);
    }
  }

  function fallbackCopy(code, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = code;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (e) {
      els.copyLive.textContent = "Press Ctrl+C to copy: " + code;
    }
  }

  // ---- Helpers ----
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

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
    } catch (e) {
      return d.toUTCString();
    }
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    try {
      return d.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
    } catch (e) {
      return String(iso);
    }
  }

  function isSoon(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return false;
    var days = (d - new Date()) / 86400000;
    return days >= 0 && days <= 14;
  }
})();
