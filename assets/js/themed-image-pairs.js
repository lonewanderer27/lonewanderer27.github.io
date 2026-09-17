// Cross-fades a post's light/dark header image pair
// (_includes/ui/themed-image.html) when the OS colour scheme changes live,
// wrapped in a View Transition where the browser supports one.
//
// The head.html inline snippet already set the initial state before paint;
// this script only reacts to later changes, and never sets .scheme-js or
// .scheme-vt itself -- those are markers it reads to decide how to act.
(function () {
  "use strict";

  var root = document.documentElement;
  if (!root.classList.contains("scheme-js")) return;
  // Nothing to swap on this page -- bail out silently, like every other
  // script here.
  if (!document.querySelector(".themed-image-dark")) return;

  var scheme = window.matchMedia("(prefers-color-scheme: dark)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  scheme.addEventListener("change", function (event) {
    var next = event.matches ? "dark" : "light";
    if (root.dataset.scheme === next) return; // already there; nothing to do

    var swap = function () {
      root.dataset.scheme = next;
    };

    // No View Transition support, or the visitor asked for reduced motion:
    // flip the attribute directly. The CSS opacity transition in main.css
    // still runs, unless reduced motion strips that too.
    if (!root.classList.contains("scheme-vt") || reduce.matches) {
      swap();
      return;
    }

    // Marks the document while the transition is in flight so main.css can
    // hold the root/header groups still -- same shape as .is-filtering in
    // portfolio-filter.js.
    root.classList.add("is-scheme-swapping");
    var transition = document.startViewTransition({ update: swap, types: ["scheme-swap"] });
    transition.finished.finally(function () {
      root.classList.remove("is-scheme-swapping");
    });
  });
})();
