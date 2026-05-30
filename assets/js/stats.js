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
      { value: total, label: "Total coupons" },
      { value: categories.length, label: "Categories" },
      { value: distinctStores, label: "Distinct stores" },
      { value: relCounts.high || 0, label: "High reliability", sub: pct(relCounts.high || 0, total) + "% of all" },
      { value: withCode, label: "Ready-to-use codes", sub: pct(withCode, total) + "% copyable" },
      { value: expiringSoon.length, label: "Expiring ≤ " + SOON_DAYS + " days", sub: evergreen + " never expire" }
    ];
    var kpiWrap = byId("kpis");
    kpis.forEach(function (k) {
      var card = el("div", "kpi");
      card.appendChild(el("div", "kpi-value", String(k.value)));
      card.appendChild(el("div", "kpi-label", k.label));
      if (k.sub) card.appendChild(el("div", "kpi-sub", k.sub));
      kpiWrap.appendChild(card);
    });

    // ---- charts ----
    renderBars("chart-category", categories.map(function (cat) {
      return { label: cat, value: catCounts[cat] || 0 };
    }));

    renderBars("chart-reliability", [
      { label: "High", value: relCounts.high || 0, cls: "fill-high" },
      { label: "Medium", value: relCounts.medium || 0, cls: "fill-medium" },
      { label: "Low", value: relCounts.low || 0, cls: "fill-low" }
    ]);
    setText("note-reliability",
      "High = official / evergreen codes. Medium = dated promos with a stated expiry. " +
      "Low = aggregator-listed, so verify before use.");

    renderBars("chart-type", [
      { label: "Code", value: typeCounts.code || 0 },
      { label: "Deal", value: typeCounts.deal || 0 },
      { label: "Signup", value: typeCounts.signup || 0 }
    ]);

    var topStores = Object.keys(storeCounts)
      .sort(function (a, b) { return storeCounts[b] - storeCounts[a] || a.localeCompare(b); })
      .slice(0, 10)
      .map(function (s) { return { label: s, value: storeCounts[s] }; });
    renderBars("chart-stores", topStores);

    renderExpiry(byId("chart-expiry"), {
      evergreen: evergreen, dated: withExpiry, soonCount: expiringSoon.length,
      total: total, updated: updated, soonest: soonest
    });

    hide("loading");
    show("stats-content");
  }

  // ---- renderers ----
  function renderBars(containerId, rows) {
    var container = byId(containerId);
    if (!container) return;
    var max = rows.reduce(function (m, r) { return Math.max(m, r.value); }, 0) || 1;
    rows.forEach(function (r) {
      var row = el("div", "bar-row");
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
        li.appendChild(el("span", "expiry-store", c.store));
        li.appendChild(el("span", "expiry-when", formatDate(c.expiry)));
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
