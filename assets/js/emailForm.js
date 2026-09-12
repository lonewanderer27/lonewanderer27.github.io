// Contact form submission via EmailJS. Previously a jQuery IIFE.
(function () {
  "use strict";

  var form = document.getElementById("contactForm");
  var alertBox = document.getElementById("contactFormAlert");
  var closeBtn = document.getElementById("contactFormAlertBtn");
  if (!form || !alertBox) return;

  function hideAlert() {
    alertBox.classList.add("hidden");
    alertBox.classList.remove("flex", "justify-between");
  }

  function showAlert() {
    alertBox.classList.remove("hidden");
    alertBox.classList.add("flex", "justify-between");
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    hideAlert();

    emailjs.init("lXhUBOOBdtCvuRVwT");
    emailjs.sendForm("service_ianjms", "template_w28x35w", form).then(
      function () {
        showAlert();
        form.reset();
      },
      function (error) {
        console.error("Inquiry failed to send", error);
        alert("Inquiry failed to be sent. Check that all fields are filled.");
      }
    );
  });

  if (closeBtn) closeBtn.addEventListener("click", hideAlert);
})();
