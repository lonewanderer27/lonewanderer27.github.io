// Mobile navigation toggle. Replaces Bootstrap's collapse plugin.
//
// Toggles the `hidden` utility class rather than the `hidden` attribute:
// Tailwind's Preflight declares [hidden]{display:none!important}, and for
// !important declarations the cascade-layer order is INVERTED, so a base-layer
// important rule beats an important utility. That made the desktop nav
// impossible to reveal with lg:flex!. `display:none` removes the menu from the
// accessibility tree and the tab order either way.
(function () {
  "use strict";

  var toggle = document.querySelector("[data-nav-toggle]");
  var menu = document.getElementById("navigation");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    menu.classList.toggle("hidden", open);
  });
})();
