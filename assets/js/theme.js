/* ===== Shared light/dark theme toggle =====
   The initial theme is applied by the inline <head> script before paint;
   this just wires up the toggle button + its label on whichever page loads it. */
(function () {
  "use strict";
  function sync(btn) {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var icon = btn.querySelector(".theme-toggle-icon");
    var text = btn.querySelector(".theme-toggle-text");
    if (icon) icon.textContent = dark ? "☀️" : "🌙";
    if (text) text.textContent = dark ? "Light" : "Dark";
  }
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    sync(btn);
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("bd-theme", next); } catch (e) { /* ignore */ }
      sync(btn);
    });
  });
})();
