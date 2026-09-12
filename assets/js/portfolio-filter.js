// Portfolio filtering with View Transitions.
// Replaces Shuffle.js, which was carried purely for this:
// the layout it also provided is now a plain CSS grid.
//
// Markup contract:
//   <div data-portfolio-grid>
//     <div data-groups='["api","webapp"]'> ... </div>
//   radio inputs named "portfolio-filter", value "all" or a group name
(function () {
  "use strict";

  var grid = document.querySelector("[data-portfolio-grid]");
  if (!grid) return;

  var statusEl = document.getElementById("portfolio-status");
  var items = Array.prototype.slice.call(grid.children).map(function (el) {
    var groups = [];
    try {
      groups = JSON.parse(el.getAttribute("data-groups") || "[]");
    } catch (e) {
      groups = [];
    }
    return { el: el, groups: groups };
  });

  function apply(value) {
    var visibleCount = 0;
    var activeEl = document.activeElement;
    items.forEach(function (item) {
      var show = value === "all" || item.groups.indexOf(value) !== -1;
      if (!show && activeEl && item.el.contains(activeEl)) {
        var activeRadio = document.querySelector('input[name="portfolio-filter"]:checked');
        if (activeRadio) activeRadio.focus();
      }
      item.el.classList.toggle("hidden", !show);
      if (show) visibleCount++;
    });

    if (statusEl) {
      statusEl.textContent = "Showing " + visibleCount + " project" + (visibleCount === 1 ? "" : "s");
    }
  }

  var activeTransition = null;

  function filterWithTransition(value) {
    if (!document.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(value);
      return;
    }

    if (activeTransition && activeTransition.skipTransition) {
      activeTransition.skipTransition();
    }

    document.documentElement.classList.add("is-filtering");

    var transition;
    try {
      transition = document.startViewTransition({
        update: function () {
          apply(value);
        },
        types: ["portfolio-filter"]
      });
    } catch (e) {
      // Fallback for older browsers accepting only a callback
      transition = document.startViewTransition(function () {
        apply(value);
      });
    }

    activeTransition = transition;

    transition.finished.finally(function () {
      if (activeTransition === transition) {
        activeTransition = null;
      }
      document.documentElement.classList.remove("is-filtering");
    });
  }

  document.querySelectorAll('input[name="portfolio-filter"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (input.checked) filterWithTransition(input.value);
    });
  });

  var checked = document.querySelector('input[name="portfolio-filter"]:checked');
  if (checked) apply(checked.value);
})();
