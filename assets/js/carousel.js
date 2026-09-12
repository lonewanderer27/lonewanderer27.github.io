// Pagination dots for scroll-snap carousels. Replaces slick's dots, which
// were the only part of slick this site actually used besides the scrolling
// that CSS scroll-snap now handles on its own.
//
// Markup contract:
//   <div data-carousel>            scroll-snap container, direct children are slides
//   <div data-carousel-dots></div> dots are generated here
(function () {
  "use strict";

  var DOT = "h-1.5 w-3 m-0.5 rounded-[10px] bg-white/50 transition-all duration-200 ease-[ease] cursor-pointer";
  var DOT_ACTIVE = "w-6.25 bg-white";

  document.querySelectorAll("[data-carousel]").forEach(function (track) {
    var slides = Array.prototype.slice.call(track.children);
    var dotsHost = document.querySelector(
      '[data-carousel-dots="' + track.getAttribute("data-carousel") + '"]'
    ) || track.parentNode.querySelector("[data-carousel-dots]");
    if (!dotsHost || slides.length < 2) return;

    var dots = slides.map(function (slide, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = DOT;
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dot.addEventListener("click", function () {
        track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: "smooth" });
      });
      dotsHost.appendChild(dot);
      return dot;
    });

    function activate(index) {
      dots.forEach(function (dot, i) {
        dot.className = DOT + (i === index ? " " + DOT_ACTIVE : "");
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });
    }
    activate(0);

    if (!("IntersectionObserver" in window)) return;

    // One observer per slide, so the callback knows which slide it is about
    // without having to diff entry lists.
    slides.forEach(function (slide, i) {
      new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting) activate(i);
        },
        { root: track, threshold: 0.6 }
      ).observe(slide);
    });
  });
})();
