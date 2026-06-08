/* ===== Best Deals — stats / overview page (vanilla JS, no dependencies) ===== */
(function () {
  "use strict";

  var DATA_URL = "./data/coupons.json";
  var SOON_DAYS = 14;

  document.addEventListener("DOMContentLoaded", function () {
    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(render)
      .catch(function (err) {
        console.error("Failed to load coupons:", err);
        hide("loading");
        show("error");
      });
  });

  function render(data) {
    var coupons = Array.isArray(data.coupons) ? data.coupons : [];
    var total = coupons.length;
    var generatedAt = data.generatedAt || null;

    // ---- aggregations ----
    var catCounts = tally(coupons, function (c) { return c.category; });
    var categories = (Array.isArray(data.categories) && data.categories.length)
      ? data.categories.slice()
      : Object.keys(catCounts).sort(function (a, b) { return catCounts[b] - catCounts[a]; });

    var relCounts = tally(coupons, function (c) { return c.reliability; });
    var typeCounts = tally(coupons, function (c) { return c.type; });
    var storeCounts = tally(coupons, function (c) { return c.store; });

    var distinctStores = Object.keys(storeCounts).length;
    var withCode = coupons.filter(function (c) { return c.code != null && String(c.code).trim() !== ""; }).length;
    var withExpiry = coupons.filter(function (c) { return !!c.expiry; }).length;
    var evergreen = total - withExpiry;

    var now = Date.now();
    var dated = coupons.filter(function (c) { return c.expiry && !isNaN(new Date(c.expiry)); });
    var expiringSoon = dated.filter(function (c) {
      var d = (new Date(c.expiry) - now) / 86400000;
      return d >= 0 && d <= SOON_DAYS;
    });
    var soonest = dated
      .filter(function (c) { return (new Date(c.expiry) - now) >= -86400000; })
      .sort(function (a, b) { return new Date(a.expiry) - new Date(b.expiry); })
      .slice(0, 5);

    // ---- hero + footer ----
    setText("hero-total", String(total));
    var updated = generatedAt ? formatDateTime(generatedAt) : "—";
    setText("hero-updated", updated);
    setText("footer-updated", updated);

    // ---- KPI cards ----
    var kpis = [
      { value: total, label: "Total deals", href: "./browse.html" },
      { value: categories.length, label: "Categories", href: "./browse.html" },
      { value: distinctStores, label: "Distinct stores", href: "./browse.html?sort=store" },
      { value: relCounts.high || 0, label: "High reliability", sub: pct(relCounts.high || 0, total) + "% of all", href: "./browse.html?reliability=high" },
      { value: withCode, label: "Ready-to-use codes", sub: pct(withCode, total) + "% copyable", href: "./browse.html?type=code" },
      { value: expiringSoon.length, label: "Expiring ≤ " + SOON_DAYS + " days", sub: evergreen + " never expire", href: "./browse.html?expiring=1" }
    ];
    var kpiWrap = byId("kpis");
    kpis.forEach(function (k) {
      var card = document.createElement(k.href ? "a" : "div");
      card.className = "kpi";
      if (k.href) { card.href = k.href; card.setAttribute("aria-label", k.value + " " + k.label + " — view in Browse"); }
      card.appendChild(el("div", "kpi-value", String(k.value)));
      card.appendChild(el("div", "kpi-label", k.label));
      if (k.sub) card.appendChild(el("div", "kpi-sub", k.sub));
      kpiWrap.appendChild(card);
    });

    // ---- charts ----
    renderBars("chart-category", categories.map(function (cat) {
      return { label: cat, value: catCounts[cat] || 0 };
    }), function (r) { return "./browse.html?category=" + encodeURIComponent(r.label); });

    renderBars("chart-reliability", [
      { label: "High", value: relCounts.high || 0, cls: "fill-high" },
      { label: "Medium", value: relCounts.medium || 0, cls: "fill-medium" },
      { label: "Low", value: relCounts.low || 0, cls: "fill-low" }
    ], function (r) { return "./browse.html?reliability=" + r.label.toLowerCase(); });
    setText("note-reliability",
      "High = official / evergreen codes. Medium = dated promos with a stated expiry. " +
      "Low = aggregator-listed, so verify before use.");

    renderBars("chart-type", [
      { label: "Code", value: typeCounts.code || 0 },
      { label: "Deal", value: typeCounts.deal || 0 },
      { label: "Signup", value: typeCounts.signup || 0 }
    ], function (r) { return "./browse.html?type=" + r.label.toLowerCase(); });

    var topStores = Object.keys(storeCounts)
      .sort(function (a, b) { return storeCounts[b] - storeCounts[a] || a.localeCompare(b); })
      .slice(0, 10)
      .map(function (s) { return { label: s, value: storeCounts[s] }; });
    renderBars("chart-stores", topStores, function (r) { return "./browse.html?store=" + encodeURIComponent(r.label); });

    renderExpiry(byId("chart-expiry"), {
      evergreen: evergreen, dated: withExpiry, soonCount: expiringSoon.length,
      total: total, updated: updated, soonest: soonest
    });

    renderDailyTop10(coupons, updated);
    renderTopDeals(coupons);
    renderCategoryNav(categories, catCounts, total);

    hide("loading");
    show("stats-content");
  }

  // ---- renderers ----
  function renderBars(containerId, rows, hrefFor) {
    var container = byId(containerId);
    if (!container) return;
    var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 0) || 1;
    rows.forEach(function (r) {
      var href = hrefFor ? hrefFor(r) : null;
      var row = el(href ? "a" : "div", "bar-row" + (href ? " bar-row-link" : ""));
      if (href) { row.href = href; row.setAttribute("aria-label", r.label + ": " + r.value + " — view deals"); }
      row.appendChild(el("span", "bar-label", r.label));
      var track = el("span", "bar-track");
      var fill = el("span", "bar-fill" + (r.cls ? " " + r.cls : ""));
      fill.style.width = Math.max(2, Math.round((r.value / max) * 100)) + "%";
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el("span", "bar-value", String(r.value)));
      container.appendChild(row);
    });
  }

  function renderExpiry(container, x) {
    var grid = el("div", "expiry-stats");
    grid.appendChild(miniStat(x.evergreen, "Evergreen (no expiry)"));
    grid.appendChild(miniStat(x.dated, "Dated (has expiry)"));
    grid.appendChild(miniStat(x.soonCount, "Expiring soon"));
    container.appendChild(grid);

    var note = el("p", "panel-note");
    note.appendChild(document.createTextNode("All " + x.total + " coupons were confirmed active on "));
    note.appendChild(el("strong", null, x.updated));
    note.appendChild(document.createTextNode("."));
    container.appendChild(note);

    if (x.soonest.length) {
      container.appendChild(el("h4", "subhead", "Soonest to expire"));
      var ul = el("ul", "expiry-list");
      x.soonest.forEach(function (c) {
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.className = "expiry-link";
        if (c.source) { a.href = c.source; a.target = "_blank"; a.rel = "noopener noreferrer"; }
        else { a.href = "./browse.html?store=" + encodeURIComponent(c.store); }
        a.appendChild(el("span", "expiry-store", c.store));
        a.appendChild(el("span", "expiry-when", formatDate(c.expiry)));
        li.appendChild(a);
        ul.appendChild(li);
      });
      container.appendChild(ul);
    }
  }

  function miniStat(value, label) {
    var box = el("div", "mini-stat");
    box.appendChild(el("div", "mini-value", String(value)));
    box.appendChild(el("div", "mini-label", label));
    return box;
  }

  // ---- Top Deals + category drawer ----
  function renderDailyTop10(coupons, updated) {
    var ol = byId("daily-top10-list");
    if (!ol) return;
    var top = coupons.filter(function (c) { return c.top10; })
      .sort(function (a, b) { return (a.dailyRank || 99) - (b.dailyRank || 99); }).slice(0, 10);
    if (!top.length) return;
    setText("daily-date", "Refreshed " + updated);
    var frag = document.createDocumentFragment();
    top.forEach(function (c, i) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "daily-deal";
      a.href = "./browse.html?deal=" + encodeURIComponent(c.id);
      a.setAttribute("aria-label", "#" + (c.dailyRank || i + 1) + " " + c.store + ": " + (c.discount || c.title || "deal"));
      a.appendChild(el("span", "daily-rank", String(c.dailyRank || i + 1)));
      var info = el("div", "daily-info");
      info.appendChild(el("div", "daily-store", c.store));
      if (c.discount) info.appendChild(el("div", "daily-disc", c.discount));
      if (c.title) info.appendChild(el("div", "daily-title", c.title));
      a.appendChild(info);
      li.appendChild(a);
      frag.appendChild(li);
    });
    ol.innerHTML = "";
    ol.appendChild(frag);
    show("daily-top10");
  }

  function renderTopDeals(coupons) {
    var grid = byId("top-deals-grid");
    if (!grid) return;
    var featured = coupons.filter(function (c) { return c.featured && !c.top10; })
      .sort(function (a, b) { return (b.score || 0) - (a.score || 0); })
      .slice(0, 12);
    if (!featured.length) return;
    var frag = document.createDocumentFragment();
    featured.forEach(function (c) {
      var a = document.createElement("a");
      a.className = "card top-deal-card";
      a.href = "./browse.html?deal=" + encodeURIComponent(c.id);
      a.setAttribute("aria-label", c.store + ": " + (c.discount || c.title || "deal"));
      var top = el("div", "card-top");
      top.appendChild(el("span", "card-store", c.store));
      top.appendChild(el("span", "badge badge-featured", "★ Best"));
      a.appendChild(top);
      if (c.discount) a.appendChild(el("div", "card-discount", c.discount));
      if (c.title) a.appendChild(el("div", "card-title", c.title));
      var foot = el("div", "card-foot-sum");
      if (c.category) foot.appendChild(el("span", "chip chip-category", c.category));
      var hasCode = c.code != null && String(c.code).trim() !== "";
      foot.appendChild(el("span", "card-cue", hasCode ? "Get code ›" : "View deal ›"));
      a.appendChild(foot);
      frag.appendChild(a);
    });
    grid.innerHTML = "";
    grid.appendChild(frag);
    show("top-deals");
  }

  function renderCategoryNav(categories, catCounts, total) {
    var list = byId("category-list");
    var btn = byId("open-categories");
    if (!list) return;
    var cats = [{ name: "All", n: total, href: "./browse.html" }].concat(categories.map(function (cat) {
      return { name: cat, n: catCounts[cat] || 0, href: "./browse.html?category=" + encodeURIComponent(cat) };
    }));
    var frag = document.createDocumentFragment();
    cats.forEach(function (c) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "category-pill";
      a.href = c.href;
      a.appendChild(el("span", null, c.name));
      a.appendChild(el("span", "count", String(c.n)));
      li.appendChild(a);
      frag.appendChild(li);
    });
    list.innerHTML = "";
    list.appendChild(frag);
    if (btn) btn.addEventListener("click", function () {
      if (window.BDDrawer) window.BDDrawer.open(byId("category-drawer"), btn);
    });
  }

  // ---- helpers ----
  function tally(list, keyFn) {
    var out = {};
    list.forEach(function (item) {
      var k = keyFn(item);
      if (k == null) return;
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function byId(id) { return document.getElementById(id); }
  function setText(id, text) { var n = byId(id); if (n) n.textContent = text; }
  function show(id) { var n = byId(id); if (n) n.hidden = false; }
  function hide(id) { var n = byId(id); if (n) n.hidden = true; }

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
