/* ===== Reusable drawer controller (backdrop, ESC, focus trap) ===== */
(function () {
  "use strict";
  var openPanel = null, lastFocus = null;

  function backdrop() { return document.querySelector(".drawer-backdrop"); }

  function open(panel, trigger) {
    if (!panel) return;
    if (openPanel) closeNow();
    openPanel = panel;
    lastFocus = trigger || document.activeElement;
    var bd = backdrop();
    if (bd) { bd.classList.add("is-open"); bd.setAttribute("aria-hidden", "false"); }
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    var f = panel.querySelector("[data-autofocus]") ||
            panel.querySelector("[data-drawer-close]") ||
            panel.querySelector('a[href],button,input,select,textarea');
    if (f) { try { f.focus(); } catch (e) { /* ignore */ } }
    document.addEventListener("keydown", onKey, true);
  }

  function closeNow() {
    if (!openPanel) return;
    var bd = backdrop();
    if (bd) { bd.classList.remove("is-open"); bd.setAttribute("aria-hidden", "true"); }
    openPanel.classList.remove("is-open");
    openPanel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
    document.removeEventListener("keydown", onKey, true);
    var lf = lastFocus;
    openPanel = null; lastFocus = null;
    if (lf && lf.focus) { try { lf.focus(); } catch (e) { /* ignore */ } }
  }

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); closeNow(); return; }
    if (e.key === "Tab" && openPanel) {
      var nodes = openPanel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
      var foc = Array.prototype.filter.call(nodes, function (n) { return n.offsetParent !== null; });
      if (!foc.length) return;
      var first = foc[0], last = foc[foc.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-drawer-close]")) { closeNow(); return; }
    if (e.target.classList && e.target.classList.contains("drawer-backdrop")) { closeNow(); }
  });

  window.BDDrawer = { open: open, close: closeNow };
})();
