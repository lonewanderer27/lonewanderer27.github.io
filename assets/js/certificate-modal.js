// Certificate preview modal. Opens a <dialog> showing a certificate image
// when a trigger is clicked, with an optional link to the certificate URL.
// Smoothly animates both the modal card and backdrop on open and close.
//
// Markup contract:
//   <button data-cert-image="/path/to/img"           trigger (required)
//           data-cert-url="https://...">              link target (optional)
//   <dialog id="cert-modal">                          the shared dialog
//     <div id="cert-modal-content">                   modal content panel
//       <button data-cert-close>                      close button
//       <a id="cert-link"><img id="cert-image"></a>   image + link
//       <p id="cert-hint">                            "click to view" hint
(function () {
  "use strict";

  var dialog = document.getElementById("cert-modal");
  if (!dialog) return;

  var content = document.getElementById("cert-modal-content");
  var image = document.getElementById("cert-image");
  var link = document.getElementById("cert-link");
  var hint = document.getElementById("cert-hint");
  var isClosing = false;

  // ---- Open ----
  document.querySelectorAll("[data-cert-image]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (isClosing) return;

      image.src = btn.getAttribute("data-cert-image");
      image.alt = btn.textContent.trim();

      var url = btn.getAttribute("data-cert-url");
      if (url) {
        link.href = url;
        link.style.cursor = "pointer";
        hint.classList.remove("hidden");
      } else {
        link.removeAttribute("href");
        link.style.cursor = "default";
        hint.classList.add("hidden");
      }

      dialog.showModal();
    });
  });

  // ---- Close ----
  function closeModal() {
    if (isClosing || !dialog.open) return;
    isClosing = true;

    var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      dialog.close();
      isClosing = false;
      return;
    }

    dialog.classList.add("is-closing");

    var finishClose = function () {
      dialog.classList.remove("is-closing");
      dialog.close();
      isClosing = false;
    };

    content.addEventListener("animationend", finishClose, { once: true });

    // Fallback timeout in case animationend does not fire
    setTimeout(function () {
      if (isClosing) {
        content.removeEventListener("animationend", finishClose);
        finishClose();
      }
    }, 220);
  }

  // Close button click
  var closeBtn = dialog.querySelector("[data-cert-close]");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  // Backdrop click — clicking the backdrop targets <dialog> itself
  dialog.addEventListener("click", function (e) {
    if (e.target === dialog) closeModal();
  });

  // Native Escape key cancellation — animate out instead of abrupt exit
  dialog.addEventListener("cancel", function (e) {
    e.preventDefault();
    closeModal();
  });
})();
