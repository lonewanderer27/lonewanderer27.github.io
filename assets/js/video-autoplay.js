// For posts that opted into autoplay="true" on ui/themed-video.html, strips
// autoplay from [data-video-autoplay] videos when the OS/browser requests
// reduced motion, and gives the reader native controls back so the video
// isn't left silently paused with no way to start it.
// Checked once at load, matching the point-of-use pattern used by
// certificate-modal.js and portfolio-filter.js -- no live change listener.
(function () {
  "use strict";

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelectorAll("[data-video-autoplay]").forEach(function (video) {
    video.removeAttribute("autoplay");
    video.pause();
    video.setAttribute("controls", "");
  });
})();
