(function ($) {
  "use strict";

  window.addEventListener("load", function () {
    // Register event handler for form
    const form = document.getElementById("contactForm");

    form.addEventListener("submit", (event) => {
      // hide button form alert
      $("#contactFormAlert")
        .addClass("hidden")
        .removeClass("flex justify-between");

      event.preventDefault();
      console.log(event);

      // Initialize emailJS
      emailjs.init("lXhUBOOBdtCvuRVwT");

      // Send email
      emailjs.sendForm("service_ianjms", "template_w28x35w", form).then(
        (response) => {
          console.log("SUCCESS", response.status, response.text);
          $("#contactFormAlert")
            .removeClass("hidden")
            .addClass("flex justify-between");
          $("#contactForm").trigger("reset");
        },
        (error) => {
          console.log("FAILED", error);
          alert("Inquiry failed to be sent. Check that all fields are filled.");
        }
      );
    });

    // Register event handler for button form alert
    const closeBtn = document.getElementById("contactFormAlertBtn")
    closeBtn.addEventListener('click', () => {
      $("#contactFormAlert").addClass("hidden").removeClass("flex justify-between")
    }) 
  });
})(jQuery);
