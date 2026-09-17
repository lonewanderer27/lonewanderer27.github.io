// Cross-fades a post's light/dark header image pair
// (_includes/ui/themed-image.html) when the OS colour scheme changes live,
// wrapped in a View Transition where the browser supports one.
//
// The head.html inline snippet already set the initial state before paint;
// this script only reacts to later changes, and never sets .scheme-js or
// .scheme-vt itself -- those are markers it reads to decide how to act.
//
// Also owns keeping a themed VIDEO pair's playback in sync with the same
// signal: opacity: 0 doesn't stop a <video> from decoding, so leaving both
// layers of an autoplaying pair running would double the cost of the one
// actually on screen. syncVideoPairs() pauses whichever [data-video-pair]
// layer is hidden and resumes the one that just became visible.
//
// Layout of this file: shared setup, then a VIDEO section (syncVideoPairs,
// video-only), then an IMAGE section (the scheme change listener, which
// drives the cross-fade for both -- images via CSS opacity alone, video by
// also calling into the VIDEO section above).
(function () {
  "use strict";

  // ---- Shared setup -------------------------------------------------------

  var root = document.documentElement;
  if (!root.classList.contains("scheme-js")) return;
  // Nothing to swap on this page -- bail out silently, like every other
  // script here.
  if (!document.querySelector(".themed-image-dark")) return;

  var scheme = window.matchMedia("(prefers-color-scheme: dark)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---- VIDEO: pause the hidden layer, resume the visible one --------------
  // Images need no equivalent -- an [hidden]/opacity: 0 <img> costs nothing,
  // so there's nothing for image pairs to pause or resume.

  function syncVideoPairs() {
    document.querySelectorAll("[data-video-pair]").forEach(function (video) {
      var isDarkLayer = video.classList.contains("themed-image-dark");
      var isActive = isDarkLayer
        ? root.dataset.scheme === "dark"
        : root.dataset.scheme !== "dark";
      if (isActive) {
        // reduce.matches is checked directly here rather than relying on
        // video-autoplay.js having already stripped the autoplay attribute
        // first -- script order between the two files is otherwise load-bearing.
        if (video.hasAttribute("data-video-autoplay") && !reduce.matches) video.play();
      } else {
        video.pause();
      }
    });
  }
  syncVideoPairs(); // catch up now -- both layers already started playing
                     // natively the moment they parsed, before this script ran.

  // ---- IMAGE: cross-fade on a live OS scheme change ------------------------
  // This listener is what actually swaps [data-scheme], for BOTH media types:
  // the opacity cross-fade it triggers is pure CSS off that attribute (image
  // pairs need nothing else), while syncVideoPairs() above is called again
  // here so video pairs stay in sync with the same flip.

  scheme.addEventListener("change", function (event) {
    var next = event.matches ? "dark" : "light";
    if (root.dataset.scheme === next) return; // already there; nothing to do

    var swap = function () {
      root.dataset.scheme = next;
      syncVideoPairs(); // no-op on an image-only page (no [data-video-pair] elements)
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
