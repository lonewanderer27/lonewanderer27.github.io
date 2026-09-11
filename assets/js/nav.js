// Mobile navigation toggle. Replaces Bootstrap's collapse plugin.
// Visibility is driven by the `hidden` attribute rather than a class, so the
// menu leaves the accessibility tree and the tab order when it is closed.
(function () {
  "use strict";

  var toggle = document.querySelector("[data-nav-toggle]");
  var menu = document.getElementById("navigation");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    menu.hidden = open;
  });
})();
