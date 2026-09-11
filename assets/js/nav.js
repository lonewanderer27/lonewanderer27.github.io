// Navigation: mobile menu toggle and the sticky background state.
//
// The menu toggles the `hidden` utility class rather than the `hidden`
// attribute: Tailwind's Preflight declares [hidden]{display:none!important},
// and for !important declarations the cascade-layer order is INVERTED, so a
// base-layer rule beats an important utility. `display:none` removes the menu
// from the accessibility tree and the tab order either way.
(function () {
  "use strict";

  var toggle = document.querySelector("[data-nav-toggle]");
  var menu = document.getElementById("navigation");

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("hidden", open);
    });
  }

  // Sticky header background. A sentinel at the top of the document is
  // cheaper than a scroll handler: no work happens while scrolling, and
  // there is no layout read per frame.
  var header = document.querySelector(".navigation");
  if (!header || !("IntersectionObserver" in window)) return;

  var sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;left:0;height:100px;width:1px;pointer-events:none";
  document.body.prepend(sentinel);

  new IntersectionObserver(
    function (entries) {
      header.classList.toggle("nav-bg", !entries[0].isIntersecting);
    },
    { threshold: 0 }
  ).observe(sentinel);
})();
