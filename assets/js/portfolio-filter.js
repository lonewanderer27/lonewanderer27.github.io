// Portfolio filtering. Replaces Shuffle.js, which was carried purely for
// this: the layout it also provided is now a plain CSS grid.
//
// Markup contract:
//   <div data-portfolio-grid>
//     <div data-groups='["api","webapp"]'> ... </div>
//   radio inputs named "portfolio-filter", value "all" or a group name
(function () {
  "use strict";

  var grid = document.querySelector("[data-portfolio-grid]");
  if (!grid) return;

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
    items.forEach(function (item) {
      var show = value === "all" || item.groups.indexOf(value) !== -1;
      item.el.classList.toggle("hidden", !show);
    });
  }

  document.querySelectorAll('input[name="portfolio-filter"]').forEach(function (input) {
    input.addEventListener("change", function () {
      if (input.checked) apply(input.value);
    });
  });

  var checked = document.querySelector('input[name="portfolio-filter"]:checked');
  if (checked) apply(checked.value);
})();
