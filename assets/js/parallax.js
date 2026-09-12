// Hero pointer parallax. Was a jQuery IIFE in script.js that never ran,
// because emailForm.js assigned window.onload after it and replaced it.
(function () {
  "use strict";

  var LAYERS = [
    ["l2", 25], ["l3", 20], ["l4", 35], ["l5", 30],
    ["l6", 45], ["l7", 30], ["l8", 25], ["l9", 40]
  ];

  var box = document.getElementById("parallax");
  if (!box) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var layers = LAYERS
    .map(function (pair) {
      var el = document.getElementById(pair[0]);
      return el && { el: el, speed: pair[1], left: el.offsetLeft, top: el.offsetTop };
    })
    .filter(Boolean);
  if (!layers.length) return;

  box.addEventListener("mousemove", function (event) {
    var x = event.clientX - box.offsetLeft;
    var y = event.clientY - box.offsetTop;
    var w = box.offsetWidth;
    var h = box.offsetHeight;

    layers.forEach(function (layer) {
      var el = layer.el;
      el.style.left =
        layer.left - ((x - (el.offsetWidth / 2 + layer.left)) / w) * layer.speed + "px";
      el.style.top =
        layer.top - ((y - (el.offsetHeight / 2 + layer.top)) / h) * layer.speed + "px";
    });
  });
})();
