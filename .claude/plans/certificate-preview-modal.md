# Certificate Preview Modal

When a certificate name is clicked in the Certifications section (on the About page), a modal opens showing a preview image of the certificate. Clicking the preview image redirects to the original certificate URL.

## Behavior Rules

Four states based on available data in `_data/settings.yml`:

| `image` | `certificate` (URL) | Behavior |
|---|---|---|
| ✅ yes | ✅ yes | Click name → **modal with preview**; click image → **redirects to URL** |
| ❌ no | ✅ yes | Click name → **direct redirect** to certificate URL (no modal) |
| ✅ yes | ❌ no | Click name → **modal with preview**; clicking image does nothing |
| ❌ no | ❌ no | Name is **plain text**, not clickable |

---

## Technical Architecture & Design Decisions

### 1. Viewport Centering & Reset Overrides
Tailwind v4's base layer resets all elements with `*, ::after, ::before, ::backdrop { margin: 0; }`.
This strips the browser User Agent's default `margin: auto` on `<dialog>`, which caused the modal to align to the top/corner.
To guarantee perfect viewport centering across all screen sizes, `#cert-modal` explicitly sets:
```css
#cert-modal {
  position: fixed;
  inset: 0;
  margin: auto;
  width: fit-content;
  height: fit-content;
  max-width: min(90vw, 56rem);
  max-height: 90dvh;
  background: transparent;
  border: none;
  padding: 0;
  overflow: visible;
}
```

### 2. Smooth Animations Without Root Page Jitter
Using the experimental `document.startViewTransition()` on same-document modals was capturing the document `root` and inadvertently triggering the cross-document `view-transition-rise` keyframe, causing the entire background webpage to jump by 12px on every modal open/close. Furthermore, View Transitions cannot capture `::backdrop` pseudo-elements.

The animation is implemented cleanly via scoped CSS keyframes:
- **Card enter**: `cert-modal-enter` (scale from `0.92` to `1`, translateY `12px` to `0`, opacity `0` to `1` over `260ms` with `cubic-bezier(0.16, 1, 0.3, 1)`).
- **Backdrop enter**: `cert-backdrop-enter` (opacity `0` to `1` over `240ms` with blurred backdrop).
- **Coordinated exit**: `.is-closing` class drives `cert-modal-exit` and `cert-backdrop-exit` over `180ms`.
- **Keyboard & gesture accessibility**: Intercepts the native `cancel` event (`Escape` key) to play the smooth exit animation before `dialog.close()` is called. Supports `prefers-reduced-motion: reduce`.

---

## Phases & Conventional Commits

### Phase 1 — `feat: add certificate image paths to settings data`

#### [MODIFY] `_data/settings.yml`
Add optional `image` field to each certificate entry pointing to the local screenshot file in `assets/images/certificates/`:
```yaml
certificates-title: Certifications
certificates:
  - {
      name: "Claude Code: AI-Assisted Development",
      date: "March 2026",
      organization: "Stratpoint Technologies",
      icon: sparkles,
    }
  - {
      name: "Next.JS",
      date: "April 2025",
      organization: "Udemy",
      icon: brand-nextjs,
      certificate: "https://www.udemy.com/certificate/UC-c456c804-6798-4614-aa62-20a46e633cf1",
      image: "assets/images/certificates/cert-nextjs.jpg",
    }
  - {
      name: "React Native",
      date: "April 2025",
      organization: "Udemy",
      icon: device-mobile,
      certificate: "https://www.udemy.com/certificate/UC-dde761c4-f890-4ab5-9b48-84f512df3805",
      image: "assets/images/certificates/cert-react-native.jpg",
    }
  - {
      name: "Flutter & Dart",
      date: "March 2025",
      organization: "Udemy",
      icon: brand-flutter,
      certificate: "https://www.udemy.com/certificate/UC-0abdfacd-f632-45da-9926-d82c449379e7",
      image: "assets/images/certificates/cert-flutter-dart.jpg",
    }
  - {
      name: "React",
      date: "September 2024",
      organization: "Scrimba",
      icon: brand-react,
      certificate: "https://v2.scrimba.com/certificate-cert2CsEjr6BTPCjR2r6GqCgcfc4y5MpTb6twi",
      image: "assets/images/certificates/cert-react.png",
    }
  - {
      name: "JavaScript",
      date: "November 2024",
      organization: "Scrimba",
      icon: brand-javascript,
      certificate: "https://scrimba.com/certificate/u2Nz6eAV/gjavascript",
      image: "assets/images/certificates/cert-javascript.png",
    }
```

---

### Phase 2 — `feat(styles): add certificate modal, centering, and backdrop animations`

#### [MODIFY] `_tailwind/main.css`
Add centering rules, backdrop styling, and scoped keyframe animations:
```css
/* ---------------------------------------------------------------------------
   Certificate preview modal
   --------------------------------------------------------------------------- */
#cert-modal {
  position: fixed;
  inset: 0;
  margin: auto;
  width: fit-content;
  height: fit-content;
  max-width: min(90vw, 56rem);
  max-height: 90dvh;
  background: transparent;
  border: none;
  padding: 0;
  overflow: visible;
}

#cert-modal::backdrop {
  background: rgb(0 0 0 / 0.6);
  backdrop-filter: blur(8px);
}

@keyframes cert-modal-enter {
  from {
    opacity: 0;
    transform: scale(0.92) translateY(12px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes cert-modal-exit {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.94) translateY(8px);
  }
}

@keyframes cert-backdrop-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes cert-backdrop-exit {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

#cert-modal[open]::backdrop {
  animation: cert-backdrop-enter 240ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

#cert-modal[open] #cert-modal-content {
  animation: cert-modal-enter 260ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

#cert-modal.is-closing::backdrop {
  animation: cert-backdrop-exit 180ms cubic-bezier(0.4, 0, 1, 1) both;
}

#cert-modal.is-closing #cert-modal-content {
  animation: cert-modal-exit 180ms cubic-bezier(0.4, 0, 1, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  #cert-modal[open]::backdrop,
  #cert-modal[open] #cert-modal-content,
  #cert-modal.is-closing::backdrop,
  #cert-modal.is-closing #cert-modal-content {
    animation: none;
  }
}
```

---

### Phase 3 — `feat(includes): add certificate preview dialog and conditional triggers`

#### [MODIFY] `_includes/certificates-section.html`
Replace unconditional `<a>` links with the four-state conditional triggers and append the shared `<dialog>` markup:
```liquid
{% if site.data.settings.certificates %}
<!-- certificates -->
<section class="py-5 sm:py-20 relative dots">
  <div class="container-page">
    <div class="flex flex-wrap -mx-3.75">
      <div class="relative w-full px-3.75 text-center">
        <h2 class="text-h2 font-secondary mb-20">{{ site.data.settings.certificates-title }}</h2>
      </div>
      {% for item in site.data.settings.certificates %}
      <div class="@container relative w-full px-3.75 mb-20 md:w-1/2">
        <div class="flex flex-col items-center text-center @min-[22rem]:flex-row @min-[22rem]:items-start @min-[22rem]:text-start">
          <div class="mb-4 @min-[22rem]:mb-0 @min-[22rem]:me-4 @min-[32rem]:me-12">
            <span class="size-25 grid place-items-center material rounded-full">
              {% include ui/icon.html name=item.icon class="size-11 text-icon-soft" %}
            </span>
          </div>
          <div>
            <p class="text-heading mb-1">{{ item.date }}</p>
            <h4 class="text-h4 font-secondary">
              {% if item.image %}
              {%- comment -%} Has image → open modal {%- endcomment -%}
              <button type="button"
                data-cert-image="{{ item.image | relative_url }}"
                {% if item.certificate %}data-cert-url="{{ item.certificate }}"{% endif %}
                class="underline text-accent cursor-pointer bg-transparent border-none p-0 font-inherit text-inherit text-start"
                title="View certificate">{{ item.name }}</button>
              {% elsif item.certificate %}
              {%- comment -%} URL only → direct link {%- endcomment -%}
              <a href="{{ item.certificate }}" class="underline text-accent" title="View certificate">{{ item.name }}</a>
              {% else %}
              {%- comment -%} Neither → plain text {%- endcomment -%}
              {{ item.name }}
              {% endif %}
            </h4>
            <p class="mb-0">{{ item.organization }}</p>
          </div>
        </div>
      </div>
      {% endfor %}
    </div>
  </div>

  <!-- Certificate preview modal (shared, populated by JS) -->
  <dialog id="cert-modal">
    <div id="cert-modal-content" class="material-thick rounded-card p-4 sm:p-6 relative">
      <button type="button" data-cert-close aria-label="Close"
              class="absolute top-3 right-3 size-8 grid place-items-center rounded-full
                     material text-heading cursor-pointer border-none bg-transparent
                     hover:bg-material-thin transition-colors duration-150">
        {% include ui/icon.html name="x" class="size-5" %}
      </button>
      <a id="cert-link" target="_blank" rel="noopener noreferrer" class="block">
        <img id="cert-image" src="" alt=""
             class="rounded-control max-h-[75dvh] w-auto max-w-full mx-auto block" />
      </a>
      <p id="cert-hint" class="text-muted text-center text-h6 mt-3 mb-0">
        Click the image to view the original certificate ↗
      </p>
    </div>
  </dialog>
</section>
<!-- /certificates -->
{% endif %}
```

---

### Phase 4 — `feat(scripts): add certificate modal open and close logic`

#### [NEW] `assets/js/certificate-modal.js`
A self-contained IIFE that handles open/close, smooth exit animations, backdrop clicks, and keyboard cancellation:
```javascript
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
```

---

### Phase 5 — `build(includes): load certificate-modal script`

#### [MODIFY] `_includes/footer.html`
Load the script tag after the existing site scripts:
```html
<!-- Site scripts -->
<script src="{{ '/assets/js/nav.js' | relative_url }}"></script>
<script src="{{ '/assets/js/carousel.js' | relative_url }}"></script>
<script src="{{ '/assets/js/portfolio-filter.js' | relative_url }}"></script>
<script src="{{ '/assets/js/emailForm.js' | relative_url }}"></script>
<script src="{{ '/assets/js/certificate-modal.js' | relative_url }}"></script>
```

---

## Verification Plan

1. **Image + URL**: Click a Udemy / Scrimba certificate → centered modal opens with smooth scale & backdrop fade → click image → redirects to certificate URL in a new tab.
2. **Image only**: Modal opens → image is displayed without link / cursor pointer → helper hint text is hidden.
3. **URL only**: Click certificate → navigates directly to URL without opening modal.
4. **Neither**: Plain text, non-clickable (e.g. "Claude Code" entry in `_data/settings.yml`).
5. **Dismissal**:
   - Close button click (`[data-cert-close]`) → smooth scale-down & fade-out.
   - Backdrop click outside modal card → smooth exit.
   - `Escape` key press → intercepted and exits with smooth animation.
6. **Background Stability**: Background webpage remains completely still (zero jitter or jump).
7. **Accessibility**: `prefers-reduced-motion: reduce` turns off animations.
