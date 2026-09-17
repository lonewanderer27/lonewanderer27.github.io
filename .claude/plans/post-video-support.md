# Video support in posts

> Status: draft plan, not yet started. Written 2026-09-17 against branch `main` at commit `8d83932`. Revised 2026-09-17: autoplay is opt-in, not the default. Revised again 2026-09-17: `ui/themed-video.html` supports a light/dark pair, matching `ui/themed-image.html`.

Lets a post embed a self-hosted video clip, styled the same way the header `<img>` in [_layouts/post.html](../../_layouts/post.html) is — via a new `ui/themed-video.html` include, the same pattern as [ui/button.html](../../_includes/ui/button.html). By default the clip renders paused with native controls, like a normal embedded video; a post can opt into muted, looping autoplay per-embed, and can optionally give the clip a dark-mode variant the same way a post's header/card image already can via [ui/themed-image.html](../../_includes/ui/themed-image.html). No plugin or `_config.yml` change is needed: posts are Liquid-rendered before kramdown converts them, so `{% include ui/themed-video.html %}` already works inside a post body today.

## Decisions

- **Autoplay is opt-in (`autoplay="true"`), not the include's default.** Default behaviour is a normal paused `<video controls>` — the reader presses play. This avoids the accessibility and bandwidth issues of unsolicited moving content (WCAG 2.2.2) and matches how every existing image in a post already behaves: nothing on the page moves on its own unless the post explicitly asks for it.
- **Self-hosted `<video>`, not a YouTube/Vimeo embed.** Consistent with how images already work in this repo (`assets/images/blog/<slug>/...`, committed to git). Caveat: video files are far larger than the photos currently in the repo and GitHub hard-caps a single committed file at 100MB. This plan assumes short, already-compressed clips (a few MB, the same weight class as the animated GIFs already embedded in some posts — see [_posts/2022-06-09-making-camp-buddy-toolbox-using-pysimplegui.md](../../_posts/2022-06-09-making-camp-buddy-toolbox-using-pysimplegui.md)). If a future post needs a longer/heavier video, revisit with Git LFS or an external host — out of scope here.
- **When autoplay is requested, it forces `muted` + `playsinline`.** Chrome/Safari refuse unmuted autoplay outright, and iOS Safari refuses inline autoplay at all without `playsinline`. The include hard-codes both whenever `autoplay="true"` rather than exposing them as togglable params, so a post author can't accidentally ship a video that silently fails to play.
- **`prefers-reduced-motion: reduce` overrides an autoplay opt-in.** Autoplaying video is exactly the kind of automatically-moving content the site already treats carefully elsewhere ([assets/js/certificate-modal.js](../../assets/js/certificate-modal.js), [assets/js/portfolio-filter.js](../../assets/js/portfolio-filter.js) both gate on `matchMedia("(prefers-reduced-motion: reduce)")`). A new small script applies the same check once at load: for any post that did opt in, matching videos get `autoplay` stripped and stay paused with the controls they'd already have.
- **Styling lives in the include, not in typography defaults.** `@tailwindcss/typography` (loaded in [_tailwind/main.css](../../_tailwind/main.css)) has no guaranteed built-in treatment for a bare `<video>` the way it does for `<img>`, so the include applies `max-w-full h-auto rounded-card` itself rather than relying on `prose`.
- **The dark variant reuses the existing light/dark image-pair infrastructure, unchanged.** [_tailwind/main.css](../../_tailwind/main.css)'s `.themed-image-dark` opacity rules and the `[data-scheme]` attribute set by the inline script in [_includes/head.html](../../_includes/head.html) are not scoped to `<img>` — stacking a `<video>` layer with the same class picks up the exact same reveal mechanism `ui/themed-image.html` already uses for a post's header/card image, with zero CSS changes.
- **The inactive video layer is paused, not just hidden.** Two stacked `<img>`s cost nothing once loaded; two stacked autoplaying `<video>`s would double the decode/bandwidth cost, since `opacity: 0` doesn't stop playback. [assets/js/themed-media-pairs.js](../../assets/js/themed-media-pairs.js) — already the single owner of scheme-driven swaps — is extended to pause whichever layer `[data-scheme]` says is currently hidden, both at load and on a live OS scheme change.
- **No build-time dimension check for the video pair, unlike the image one.** [_plugins/themed_image_pairs.rb](../../_plugins/themed_image_pairs.rb) enforces matching pixel dimensions between `image`/`image_dark` using FastImage; the equivalent for two video files needs a video-specific probe (e.g. shelling out to `ffprobe`), which this repo doesn't have wired up anywhere yet. Deliberately out of scope here — a mismatched aspect ratio on the dark clip is a smaller, later problem than the JS/CSS side, and can be layered on top later without changing the include's public shape.

## Technical Architecture & Design Decisions

### 1. Include params mirror `ui/button.html`

```
Params:
  src      - video file path (required), passed through relative_url
  poster   - still image shown before playback starts (optional)
  autoplay - false (default) | true -- forces muted + playsinline when true
  loop     - false (default) | true -- forced true regardless while autoplay is true
  controls - true (default) | false -- defaults to false instead when autoplay is true,
             so an opted-in background-style clip isn't cluttered with a scrubber
             unless controls is also explicitly requested
  extra    - extra classes appended verbatim
  style    - inline style attribute (e.g. view-transition-name)
```

When `autoplay` is true, `muted` and `playsinline` are always emitted regardless of other params — there's no browser-compliant way to autoplay with sound, so it isn't offered as an option.

### 2. Reduced-motion fallback follows the existing point-of-use pattern

Other scripts in this repo (`certificate-modal.js`, `portfolio-filter.js`) check `matchMedia(...).matches` once, at the moment it matters, rather than keeping a persistent `change` listener. The new script does the same on `DOMContentLoaded`: no listener for a live OS-setting flip mid-session, consistent with how the rest of the codebase handles this.

### 3. Light/dark video pairs mirror `ui/themed-image.html` exactly

When `src_dark` is set, the include stacks two `<video>`s in one wrapper `<span>` — the light one in flow, the dark one `absolute inset-0 size-full themed-image-dark` over it — the identical shape `ui/themed-image.html` already uses for a post's header and card image. Both layers get `aria-hidden`/`tabindex="-1"` on the dark one so an invisible layer's native controls (when `controls` is on) can't be tabbed into.

What's new relative to the image case: each layer also gets `data-video-pair`, a hook `assets/js/themed-media-pairs.js` reads to decide which one to actually play. The script already owns reacting to `[data-scheme]`/OS scheme changes for the opacity swap; it's extended to, in the same pass, `pause()` whichever `[data-video-pair]` layer just became hidden and resume the one that became visible (only if that layer opted into autoplay via `data-video-autoplay`). This runs once at script load too, not only on a live `change` event, since both layers already started autoplaying natively the moment they parsed — the sync call just catches up and pauses the wrong one a beat later.

---

## Implementation commits

Three commits, in order. `1` adds the include with light/dark pair support already built in, mirroring `ui/themed-image.html`. `2` adds both pieces of new JS behaviour — the reduced-motion opt-out for autoplay, and syncing a themed video pair's playback with its visible layer; the first half has no author-visible effect until `3` wires it up, while the second half takes effect immediately, since `themed-media-pairs.js` is already loaded on any page with a themed pair. `3` loads `video-autoplay.js` so commit 2's reduced-motion behaviour actually takes effect, so the site is never left half-wired between commits.

### 1. `feat(includes): add ui/themed-video.html`

**Files**

- [NEW] `_includes/ui/themed-video.html`

**Changes**

- Add the include below, unreferenced by any page or post yet. Nothing on the site changes. Supports an optional `src_dark`/`poster_dark` light/dark pair from the start, mirroring `ui/themed-image.html` — no separate commit needed to layer that on later.

```liquid
{%- comment -%}
  Video. Same params shape as ui/button.html. Paused with native controls
  by default -- autoplay is an explicit per-embed opt-in, not the default.
  Supports an optional light/dark pair, mirroring ui/themed-image.html.

  Params:
    src         - video file path (required), passed through relative_url
    src_dark    - optional. Dark variant of the same clip. When set, both
                  videos are stacked in one wrapper exactly like
                  ui/themed-image.html's light/dark image pair, reusing its
                  .themed-image-dark class and [data-scheme] signal -- no
                  separate CSS or scheme-detection needed for video.
    poster      - still image shown before playback starts (optional)
    poster_dark - optional. Dark variant of poster; falls back to poster
                  when src_dark is set but poster_dark isn't.
    autoplay    - false (default) | true -- forces muted + playsinline when
                  true, on both layers of a pair
    loop        - false (default) | true -- forced true regardless while
                  autoplay is true
    controls    - true (default) | false -- defaults to false instead when
                  autoplay is true, unless controls is also explicitly
                  requested
    extra       - extra classes appended verbatim -- on the wrapper <span>
                  when src_dark is set, on the <video> itself otherwise
    style       - inline style attribute (e.g. view-transition-name) -- on
                  the wrapper <span> when src_dark is set, on the <video>
                  itself otherwise

  autoplay always forces muted + playsinline: browsers refuse unmuted
  autoplay outright, and iOS Safari refuses inline autoplay without
  playsinline, so neither is exposed as a separate toggle.

  To imitate an animated GIF (silent, looping, no chrome, plays the instant
  it's on screen) pass ONLY `autoplay="true"` and nothing else: loop is
  already forced true and controls already default to hidden in that case,
  which is the same muted/loop/no-controls combination a GIF has by
  construction -- there's no separate "gif mode", this already is one, at a
  fraction of a GIF's file size for the same clip.

  [data-video-autoplay] is the hook assets/js/video-autoplay.js reads to
  strip autoplay under prefers-reduced-motion, for posts that opted in.

  [data-video-pair] marks BOTH layers of a light/dark pair so
  assets/js/themed-media-pairs.js can pause whichever one [data-scheme]
  says is currently hidden -- unlike a stacked <img> pair, an unseen
  autoplaying <video> keeps decoding at opacity: 0, so leaving both playing
  would double the CPU/bandwidth cost of the visible one alone.
{%- endcomment -%}

{%- assign autoplay = false -%}
{%- if include.autoplay == true -%}{%- assign autoplay = true -%}{%- endif -%}
{%- assign loop = false -%}
{%- if include.loop == true or autoplay -%}{%- assign loop = true -%}{%- endif -%}

{%- assign controls = true -%}
{%- if include.controls == false -%}{%- assign controls = false -%}{%- endif -%}
{%- if include.controls == nil and autoplay -%}{%- assign controls = false -%}{%- endif -%}

{%- assign video_classes = "max-w-full h-auto rounded-card" -%}

{%- if include.src_dark and include.src_dark != "" -%}
  {%- assign outer_classes = "relative block" -%}
  {%- if include.extra -%}{%- assign outer_classes = outer_classes | append: " " | append: include.extra -%}{%- endif -%}
  {%- assign poster_dark = include.poster_dark | default: include.poster -%}
<span class="{{ outer_classes }}"{% if include.style %} style="{{ include.style }}"{% endif %}>
  <video
    class="block {{ video_classes }}"
    src="{{ include.src | relative_url }}"
    {% if include.poster %}poster="{{ include.poster | relative_url }}"{% endif %}
    {% if autoplay %}autoplay muted playsinline data-video-autoplay{% endif %}
    {% if loop %}loop{% endif %}
    {% if controls %}controls{% endif %}
    preload="metadata"
    data-video-pair
  ></video>
  <video
    class="themed-image-dark absolute inset-0 block size-full {{ video_classes }}"
    src="{{ include.src_dark | relative_url }}"
    {% if poster_dark %}poster="{{ poster_dark | relative_url }}"{% endif %}
    {% if autoplay %}autoplay muted playsinline data-video-autoplay{% endif %}
    {% if loop %}loop{% endif %}
    {% if controls %}controls{% endif %}
    preload="metadata"
    aria-hidden="true"
    tabindex="-1"
    data-video-pair
  ></video>
</span>
{%- else -%}
  {%- if include.extra -%}{%- assign video_classes = video_classes | append: " " | append: include.extra -%}{%- endif -%}
<video
  class="{{ video_classes }}"
  {% if include.style %}style="{{ include.style }}"{% endif %}
  src="{{ include.src | relative_url }}"
  {% if include.poster %}poster="{{ include.poster | relative_url }}"{% endif %}
  {% if autoplay %}autoplay muted playsinline data-video-autoplay{% endif %}
  {% if loop %}loop{% endif %}
  {% if controls %}controls{% endif %}
  preload="metadata"
></video>
{%- endif -%}
```

---

### 2. `feat(scripts): honor prefers-reduced-motion and sync themed video pair playback`

**Files**

- [NEW] `assets/js/video-autoplay.js`
- [MODIFY] `assets/js/themed-media-pairs.js`

**Changes**

- Add `video-autoplay.js` below. Not yet loaded anywhere, so it has no effect until commit 3.

```javascript
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
```

- Add a `syncVideoPairs()` helper to `themed-media-pairs.js` that pauses whichever `[data-video-pair]` layer `root.dataset.scheme` says is currently hidden, and resumes the newly-visible one only if it opted into autoplay (`[data-video-autoplay]`) *and* the visitor isn't in reduced motion — checked directly via the same `reduce` `matchMedia` this file already has, rather than trusting that the `video-autoplay.js` script added above already stripped the attribute first, which would make the two files' relative `<script>` order in `footer.html` silently load-bearing. Call `syncVideoPairs()` once at script init (both layers already started playing natively by the time this runs) and again inside the existing `swap` function, so a live OS scheme change re-syncs playback the same moment it flips the opacity. Full replacement content below (supersedes the file's current version on `main`).

```javascript
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
```

---

### 3. `build(includes): load video-autoplay.js`

**Files**

- [MODIFY] `_includes/footer.html`

**Changes**

- Append the new `<script>` after the existing site scripts (same order rule as the rest of the file — vendor first, then site scripts). This is the commit that makes commits 1 and 2 actually take effect end-to-end.

```html
<script src="{{ '/assets/js/nav.js' | relative_url }}"></script>
<script src="{{ '/assets/js/parallax.js' | relative_url }}"></script>
<script src="{{ '/assets/js/carousel.js' | relative_url }}"></script>
<script src="{{ '/assets/js/portfolio-filter.js' | relative_url }}"></script>
<script src="{{ '/assets/js/emailForm.js' | relative_url }}"></script>
<script src="{{ '/assets/js/video-autoplay.js' | relative_url }}"></script>
```

---

## Usage in a post

Asset convention mirrors images: `assets/videos/blog/<post-slug>/clip.mp4`. Dropped straight into a post's markdown body.

Default — paused, native controls, styled like the header image:

```liquid
{% include ui/themed-video.html src="/assets/videos/blog/2026-example-post/clip.mp4" poster="/assets/images/blog/2026-example-post/clip-poster.jpg" %}
```

Opt into autoplay per-embed — this same call is also the GIF-replacement recipe (silent, looping, no controls, plays immediately):

```liquid
{% include ui/themed-video.html src="/assets/videos/blog/2026-example-post/clip.mp4" autoplay="true" %}
```

The autoplay version renders muted, looping, inline autoplay with no controls (unless `controls="true"` is also passed), and falls back to a controls-visible, paused clip for readers with `prefers-reduced-motion: reduce`.

Give the clip a dark-mode variant, same idea as a post's `image`/`image_dark` front matter:

```liquid
{% include ui/themed-video.html src="/assets/videos/blog/2026-example-post/clip.mp4" src_dark="/assets/videos/blog/2026-example-post/clip-dark.mp4" autoplay="true" %}
```

Whichever clip matches the reader's current colour scheme plays; the other stays paused underneath until the scheme changes.

---

## Verification Plan

1. **Default**: insert the include with no `autoplay` param, `pnpm dev` running → clip renders paused with native controls, styled with rounded corners matching the existing header-image treatment; nothing plays until the reader presses play.
2. **`autoplay="true"`**: clip autoplays muted, loops, no visible controls.
3. **`autoplay="true" controls="true"`**: native scrubber/play-pause appears; clip still autoplays muted underneath.
4. **Reduced motion**: enable "reduce motion" in the OS → reload a post with `autoplay="true"` → clip is paused with `controls` visible instead of silently autoplaying.
5. **Missing `src`**: confirm there's no silent broken state — an empty `src` should be treated as author error, not defended against (no post today has this problem for images either).
6. **Build guard**: `pnpm css:build` still passes the 20,000-byte floor in [pages.yml](../../.github/workflows/pages.yml) — the new include adds no new utility classes beyond ones already scanned (`max-w-full`, `h-auto`, `rounded-card`), so this should be a no-op check.
7. **Dark pair, static**: load a post with `src_dark` set while the OS is in dark mode → the dark clip is the one visibly playing (or shown, if not autoplaying), not the light one; open devtools' Media panel and confirm the light layer is paused, not also decoding.
8. **Dark pair, live switch**: with the post open, flip the OS colour scheme → the visible layer cross-fades via `.themed-image-dark`'s existing opacity transition (or a View Transition, where supported) at the same time the correct layer starts playing and the other pauses.
9. **Dark pair + reduced motion**: combine `src_dark` with `autoplay="true"` and OS reduced-motion on → both layers land paused with controls (commit 2's behaviour), and the scheme swap still picks the right layer without forcing playback.
10. **`poster_dark` fallback**: omit `poster_dark` while setting both `poster` and `src_dark` → the dark layer shows the light poster until it loads, instead of a blank frame.
