# Post Header Image — Dark Variant

Let a post declare a second header image for dark mode, render both stacked, and
cross-fade between them when the OS colour scheme changes. A View Transition
does the fade where it is available; a CSS `opacity` transition on the stacked
pair does it everywhere else. The two files must be pixel-identical in size, and
the build fails if they are not.

Scope: the post header image in `_layouts/post.html`, the equivalent
thumbnail in the blog card, `_includes/post.html` (Phase 5), and — via a
different mechanism, since Markdown body content doesn't go through Liquid
includes — any image inside a post's body (Phase 6). All three share one
enforcement rule (dimensions must match, checked at build time) and one
rendering signal (`.themed-image-dark` + `[data-scheme]`), so a post's dark
treatment is never something you have to remember to redo per image.

---

## Behaviour rules

| State / event | Visual behaviour | Mechanism |
|---|---|---|
| Post has no `image_dark` | Single `<img>`, exactly as today | include falls through to its current markup |
| Post has no `image` | **Build error** — `image` is required, `image_dark` is not | `_plugins/themed_image_pairs.rb` raises during `:site, :post_read` |
| First paint, light OS | Light layer visible, dark layer `opacity: 0` | default state in CSS |
| First paint, dark OS | Dark layer visible | inline head script stamps `data-scheme` before paint |
| OS scheme flips, VT-capable browser + JS | Two snapshots cross-fade over 420ms; rest of page held still | `document.startViewTransition` + `view-transition-name` on the wrapper |
| OS scheme flips, no VT / no JS | Dark layer fades in over the light layer, 320ms | `transition: opacity` on the dark layer, driven by the media query |
| `prefers-reduced-motion: reduce` | Instant swap, no transition and no VT | JS skips `startViewTransition`; CSS drops the transition |
| Dark variant dimensions ≠ light | **Build error**, no output | `_plugins/themed_image_pairs.rb` raises during `:site, :post_read` |
| Dark variant file missing, or `image_dark` without `image` | **Build error** | same plugin |

---

## Conventions

- **`image` is required on every post.** It already carries the layout's
  header and the blog card's thumbnail, so this plan makes that implicit
  expectation an enforced one rather than adding new obligation.
- Front-matter key: **`image_dark`**, a site-absolute path, matching `image`
  in dimensions. Sits alongside the existing `image_source` / `image_source_url`
  keys. **Optional** — most posts will not set it.
  ```yaml
  image:      /assets/images/blog/<post>/header.webp
  image_dark: /assets/images/blog/<post>/header-dark.webp
  ```
- No convention-based `-dark` auto-discovery: an explicit key makes the error
  condition unambiguous ("declared ⇒ must match") and keeps the plugin from
  guessing at eight extensions.
- Formats may differ (`.webp` light, `.png` dark). **Pixel dimensions may not.**
- Note: the site-wide `defaults:` block that sets `image: /assets/images/banner.png`
  is dead (`_config.yml` declares `defaults:` twice — see *Known inconsistencies*
  in CLAUDE.md), so no post inherits an `image` today. The plugin must not
  assume one — it has to read `doc.data["image"]` itself, not lean on a default.

**Prerequisite, not part of this feature:** `_posts/2026-09-13-reimagining-my-portfolio-with-translucent-effects.md`
currently has no `image` key. Once Phase 1 lands, that post fails the build
until it gets one. This plan does not choose that image — flagging it so it
is not a surprise mid-implementation.

---

## Why the dimensions must match

The two images are laid on top of each other: the light one is in flow and sets
the wrapper's box, the dark one is `absolute inset-0 size-full`. If the dark file
has a different intrinsic size it gets stretched into the light one's box, so the
"same image, dark treatment" promise silently becomes a distorted image. Nothing
about that is visible in the HTML, so it has to be a build-time assertion.

It also matters for the View Transition: `::view-transition-image-pair` cross-fades
two snapshots of the same group box. Equal dimensions are what make that a pure
opacity blend rather than a scale.

---

## Phase 1 — build-time checks: `image` required, `image_dark` validated if present

New file `_plugins/themed_image_pairs.rb`. Custom plugins are viable here because
CI runs `bundle exec jekyll build` with this repo's own Gemfile (the
`github-pages` gem, which ignores `_plugins/`, is not in play). The hook runs for
`jekyll build` *and* `jekyll serve`, so the check fires locally too.

Scoped to `site.posts.docs` only — `image` being required is a property of
`_layouts/post.html`, not of pages in general, so a page with no `image` is
untouched.

```ruby
# Validates post header images at build time. Not a generator -- it never
# writes anything, only raises to fail the build.
#
# Two rules, enforced on every entry in site.posts:
#   1. `image` is required.
#   2. `image_dark`, if set, must match `image`'s pixel dimensions exactly.
#      The two are rendered stacked (_includes/ui/themed-image.html), with the
#      dark layer sized to the light layer's box, so a mismatch renders
#      stretched -- silently, with nothing in the HTML to show it. That is
#      why this is a build assertion and not a lint warning.
#
# Runs on both `jekyll build` and `jekyll serve` via the :post_read hook, so
# the check fires locally, not just in CI.
require "fastimage"

module ThemedImagePairs
  def self.check(site)
    site.posts.docs.each { |doc| check_doc(site, doc) }
  end

  def self.check_doc(site, doc)
    light = doc.data["image"]
    fail_with(doc, "missing required `image`") if light.nil? || light.to_s.empty?

    light_path = resolve(site, light)
    fail_with(doc, "image not found: #{light}") unless File.file?(light_path)

    # image_dark is optional -- most posts stop here.
    dark = doc.data["image_dark"]
    return if dark.nil? || dark.to_s.empty?

    dark_path = resolve(site, dark)
    fail_with(doc, "image_dark not found: #{dark}") unless File.file?(dark_path)

    # FastImage reads only the file header, so this is cheap even for large
    # source images -- no full decode.
    light_size = FastImage.size(light_path)
    dark_size  = FastImage.size(dark_path)
    fail_with(doc, "could not read dimensions of #{light}") if light_size.nil?
    fail_with(doc, "could not read dimensions of #{dark}") if dark_size.nil?

    return if light_size == dark_size

    # Names both files and both sizes -- this is the one error an author
    # actually has to act on, so the message has to be enough to fix it
    # without re-running a separate checker.
    fail_with(doc, <<~MSG)
      image_dark dimensions do not match image.
        image:      #{light} (#{light_size[0]}x#{light_size[1]})
        image_dark: #{dark} (#{dark_size[0]}x#{dark_size[1]})
      The two files are stacked and the dark one is sized to the light one's box,
      so a mismatch renders stretched. Re-export the dark variant at
      #{light_size[0]}x#{light_size[1]}.
    MSG
  end

  # Front-matter image paths are site-absolute ("/assets/images/..."); resolve
  # against site.source the same way Jekyll resolves a static file.
  def self.resolve(site, url)
    File.join(site.source, url.to_s.sub(%r{\A/}, ""))
  end

  # FatalException is what Jekyll's own build-breaking errors raise -- it
  # prints the message and exits nonzero, same as a Liquid syntax error would.
  def self.fail_with(doc, message)
    raise Jekyll::Errors::FatalException, "#{doc.relative_path}: #{message}"
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  ThemedImagePairs.check(site)
end
```

Gemfile gains one line:

```ruby
gem "fastimage", "~> 2.4"
```

`fastimage` is pure Ruby, MIT, no native extension, and reads only the file
header — it covers the formats in `assets/images/blog/` (jpg, webp) plus png,
gif, avif, svg. CI's `bundler-cache: true` installs it from the updated
`Gemfile.lock` with no workflow change.

Rejected: hand-rolling a header parser to avoid the dependency. Three formats ×
their variants (WebP alone needs VP8/VP8L/VP8X branches) is more code than the
gem and more to get wrong.

Verify during implementation: what `jekyll serve` does with the raise on an
*incremental* rebuild (the initial build aborts; a watch-triggered rebuild is
expected to print the error and keep the last good output). If the watcher
swallows it, add a `pnpm run images:check` script as the loud path and keep the
plugin as the CI gate.

---

## Phase 2 — markup

New include `_includes/ui/themed-image.html`, following `ui/button.html`'s
pattern (comment block documenting params, then one output).

Params: `src`, `src_dark`, `alt`, `transition`, `class` (wrapper/float/margin),
`img_class` (shared by both layers).

```html
{%- if include.src_dark and include.src_dark != "" -%}
<span class="relative block {{ include.class }}"{% if include.transition %} style="view-transition-name: {{ include.transition }};"{% endif %}>
  <img class="block {{ include.img_class }}" src="{{ include.src | relative_url }}" alt="{{ include.alt }}">
  <img class="themed-image-dark absolute inset-0 block size-full {{ include.img_class }}" src="{{ include.src_dark | relative_url }}" alt="" aria-hidden="true">
</span>
{%- else -%}
<img class="{{ include.class }} {{ include.img_class }}" src="{{ include.src | relative_url }}" alt="{{ include.alt }}"{% if include.transition %} style="view-transition-name: {{ include.transition }};"{% endif %}>
{%- endif -%}
```

`_layouts/post.html` line 18 becomes:

```liquid
{% include ui/themed-image.html
     src=page.image
     src_dark=page.image_dark
     alt=page.title
     transition=post_image_transition
     class="float-left me-12 mb-6 max-w-full"
     img_class="max-w-full h-auto rounded-card" %}
```

No `{% if page.image %}` guard: Phase 1 makes `image` a build-time guarantee
for every post, so the layout can call the include unconditionally. `src_dark`
is the only thing that stays conditional, inside the include itself.

Four notes:

- **The `view-transition-name` moves from the `<img>` to the wrapper.** The
  cross-document pair with the blog card still holds — a card's `<img>` box and
  the post's wrapper box are the same rectangle — but the name must be on the
  wrapper, because the wrapper is what contains both layers and therefore what
  the in-page swap needs to snapshot. Assign
  `post_image_transition = page.slug | prepend: "post-image-"` next to the
  existing `post_title_transition` rather than interpolating in the call.
- The float moves to the wrapper so body copy still wraps around the image.
  A floated `span` with a block child shrinks to fit, so the box is unchanged.
- The dark layer is decorative duplication: `alt=""` + `aria-hidden="true"`.
- The include still checks `include.src` truthiness nowhere — it trusts the
  caller. `_layouts/post.html` is the only caller and Phase 1 guarantees
  `page.image`, so there is no second place that needs the same guard.

---

## Phase 3 — CSS

New block at the bottom of `_tailwind/main.css`, joining the cert-modal and
view-transition blocks as hand-written CSS. It cannot be call-site utilities:
the repo bans `dark:` variants at call sites (dark mode is token re-pointing),
and the state here depends on markers on `:root`, not on the element.

```css
/* ---------------------------------------------------------------------------
   Light/dark image pairs (_includes/ui/themed-image.html)

   Two <img>s stacked in one wrapper; the dark one is revealed by opacity. The
   signal is deliberately split: with JS the scheme lives in [data-scheme] on
   <html>, because a View Transition needs a style change it can wrap in its
   own callback -- a media query flips underneath it and there is nothing left
   to capture. Without JS the media query is the only signal. `.scheme-js`
   marks which regime is in force, so exactly one of them ever applies.
--------------------------------------------------------------------------- */
.themed-image-dark {
  opacity: 0;
}

@media (prefers-color-scheme: dark) {
  :root:not(.scheme-js) .themed-image-dark {
    opacity: 1;
  }
}

:root[data-scheme="dark"] .themed-image-dark {
  opacity: 1;
}

/* Fallback cross-fade, for browsers with no View Transition support and for
   JS-off. Where a VT does run, the snapshot pair does the fade and a CSS
   transition underneath it would double-animate -- so `.scheme-vt` removes it. */
:root:not(.scheme-vt) .themed-image-dark {
  transition: opacity 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  .themed-image-dark {
    transition: none;
  }
}

/* The swap is in-page, so hold the rest of the document still -- same shape as
   the portfolio filter block above, including the class fallback for browsers
   that take startViewTransition's callback form but not its options object. */
html:active-view-transition-type(scheme-swap)::view-transition-old(root),
html:active-view-transition-type(scheme-swap)::view-transition-new(root),
html:active-view-transition-type(scheme-swap)::view-transition-group(root),
html.is-scheme-swapping::view-transition-old(root),
html.is-scheme-swapping::view-transition-new(root),
html.is-scheme-swapping::view-transition-group(root),
html:active-view-transition-type(scheme-swap)::view-transition-group(site-header),
html.is-scheme-swapping::view-transition-group(site-header) {
  animation: none !important;
}
```

---

## Phase 4 — JS

**Inline snippet in `_includes/head.html`** (after the stylesheet link). A
deviation from the "plain IIFEs at the bottom of footer.html" convention, and it
has to be: the marker and the initial `data-scheme` must land before first paint,
or a dark-mode visitor gets a frame of the light image.

```html
<!-- Scheme markers, inline and before first paint -- not a footer IIFE like
     the rest of the site's JS, because [data-scheme] has to already be
     correct by the time the browser paints, or a dark-mode visitor sees a
     frame of the light header image.

     .scheme-js gates the CSS fallback transition in _tailwind/main.css: it
     only applies when JS is off, so it needs to know JS is on to stay out of
     the way. .scheme-vt marks View Transition support the same way, for
     assets/js/themed-image-pairs.js to read without re-testing the API. -->
<script>
  (function () {
    var root = document.documentElement;
    root.classList.add("scheme-js");
    if (typeof document.startViewTransition === "function") {
      root.classList.add("scheme-vt");
    }
    // Source of truth for the dark image layer once JS is present -- see the
    // :root[data-scheme="dark"] rule in _tailwind/main.css.
    root.dataset.scheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  })();
</script>
```

**New `assets/js/themed-image-pairs.js`**, loaded in `footer.html` after `nav.js`. Bails out
silently when there is nothing to swap, like every other script here.

```js
// Cross-fades a post's light/dark header image pair
// (_includes/ui/themed-image.html) when the OS colour scheme changes live,
// wrapped in a View Transition where the browser supports one.
//
// The head.html inline snippet already set the initial state before paint;
// this script only reacts to later changes, and never sets .scheme-js or
// .scheme-vt itself -- those are markers it reads to decide how to act.
(function () {
  "use strict";

  var root = document.documentElement;
  if (!root.classList.contains("scheme-js")) return;
  // Nothing to swap on this page -- bail out silently, like every other
  // script here.
  if (!document.querySelector(".themed-image-dark")) return;

  var scheme = window.matchMedia("(prefers-color-scheme: dark)");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  scheme.addEventListener("change", function (event) {
    var next = event.matches ? "dark" : "light";
    if (root.dataset.scheme === next) return; // already there; nothing to do

    var swap = function () {
      root.dataset.scheme = next;
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

Two details carried from `portfolio-filter.js`: the `is-scheme-swapping` class
exists because not every browser that has `startViewTransition` accepts the
options object, and `types` is passed anyway for the ones that do. If the object
form needs guarding, feature-detect it and fall back to
`document.startViewTransition(swap)` — the class still carries the CSS.

**Out of scope:** the *page's* dark theme stays media-query driven, so the token
flip is not coordinated with this transition — only the image layer is. Both root
snapshots therefore agree on colour and holding them still is safe. Moving the
whole theme onto `[data-scheme]` (and with it a real theme toggle) is a separate,
larger change.

---

## Phase 5 — blog card (`_includes/post.html`)

Not optional: the card is the *other* place a post's header image appears
(home page, `/blog`, "Similar Stories"), and without this a post that
declares `image_dark` would render its dark variant on its own page but only
the light image everywhere it's linked from — exactly the "looks fine until
you're in dark mode, somewhere else" gap this plan exists to close.

The card's `<img>` today carries the box directly — it's a flex item in
`article.flex ... @min-[24rem]:flex-row`, not floated — which is a different
sizing regime from Phase 2's post header, where the wrapper shrinks to fit
an in-flow, intrinsically-sized image. Passing the card's existing classes
straight through as `class`/`img_class` unchanged would still merge onto one
element correctly when there's no `image_dark`, but in the paired case the
light layer would sit at its native pixel size with no box for `object-cover`
to fill — only the dark layer gets one for free (hardcoded
`absolute inset-0 size-full`).

So `_includes/ui/themed-image.html` (shipped in Phase 2) gains one more
optional param:

```
fill - optional boolean. false/omitted (default, Phase 2's post-header
       behaviour): the light image sits in flow and its own size sets the
       wrapper's box; `class` carries positioning only (float, margin).
       true: both layers are absolutely positioned to fill the wrapper,
       and `class` must give the wrapper an explicit size itself (e.g. a
       flex item with w-*/h-* classes) -- for a call site like the blog
       card, where the box comes from the surrounding layout, not from
       the image's own aspect ratio.
```

```liquid
{%- if include.src_dark and include.src_dark != "" -%}
<span class="relative block {{ include.class }}"{% if include.transition %} style="view-transition-name: {{ include.transition }};"{% endif %}>
  {%- if include.fill -%}
  <img class="absolute inset-0 block size-full {{ include.img_class }}" src="{{ include.src | relative_url }}" alt="{{ include.alt }}">
  {%- else -%}
  <img class="block {{ include.img_class }}" src="{{ include.src | relative_url }}" alt="{{ include.alt }}">
  {%- endif -%}
  <img class="themed-image-dark absolute inset-0 block size-full {{ include.img_class }}" src="{{ include.src_dark | relative_url }}" alt="" aria-hidden="true">
</span>
{%- else -%}
<img class="{{ include.class }} {{ include.img_class }}" src="{{ include.src | relative_url }}" alt="{{ include.alt }}"{% if include.transition %} style="view-transition-name: {{ include.transition }};"{% endif %}>
{%- endif -%}
```

Only the paired branch's light layer changes shape. The no-`image_dark`
fallback and Phase 2's post-header call (which never passes `fill`, so
`include.fill` is `nil` there) are byte-for-byte unaffected.

`_includes/post.html`'s img becomes:

```liquid
{%- assign named = true -%}
{%- if post.url == page.url -%}{%- assign named = false -%}{%- endif -%}
{%- assign card_image_transition = nil -%}
{%- if named -%}{%- assign card_image_transition = post.slug | prepend: "post-image-" -%}{%- endif -%}
...
    {% include ui/themed-image.html
         src=post.image
         src_dark=post.image_dark
         alt=post.title
         transition=card_image_transition
         fill=true
         class="w-full h-50 @min-[24rem]:w-[42%] @min-[24rem]:h-auto @min-[24rem]:self-stretch"
         img_class="object-cover rounded-t-card @min-[24rem]:rounded-t-none @min-[24rem]:rounded-s-card" %}
```

Three notes:

- **Box-sizing classes move from the img to `class` (the wrapper); only
  visual classes (`object-cover`, the rounding) stay in `img_class`.** In the
  no-`image_dark` case those two strings still just concatenate onto the
  lone `<img>`, reproducing today's exact class list. In the paired case the
  wrapper becomes the real, explicitly-sized flex item — safe, because
  `w-full`/`h-50`/`w-[42%]` etc. are ordinary percentage/fixed values
  resolved against the flex *container*, not against the wrapper's own
  content, so there's no shrink-to-fit circularity — and `fill=true` makes
  both images fill that box identically.
- **`card_image_transition` must be assigned `nil`, not `""`.** Liquid's
  `{% if %}` treats an empty string as truthy (only `nil`/`false` are
  falsy), so `assign card_image_transition = ""` would still emit
  `style="view-transition-name: ;"` on every unnamed card.
- The cross-document pair with the post header still holds: both call sites
  derive the same `post-image-<slug>` name from the same slug.

No changes needed to Phase 3 (CSS) or Phase 4 (JS) — `.themed-image-dark`,
`[data-scheme]`, and `assets/js/themed-image-pairs.js`'s
`document.querySelector(".themed-image-dark")` check are page-wide, not
scoped to the post layout, so the card gets the cross-fade and the View
Transition swap for free.

## Phase 6 — body images (post content)

So far this only covers the header image and its card thumbnail — both
front-matter-declared, both rendered through one Liquid include. A post's
*body* can carry any number of images via ordinary Markdown, and those go
through a different pipeline stage (kramdown → raw HTML, before Jekyll ever
hands the layout a `content` string), so neither the include nor the
front-matter check reaches them. Four ways to close that gap, in the order
they were considered:

**A. Filename convention** (`diagram.png` next to an auto-discovered
`diagram-dark.png`). Rejected for the same reason auto-discovery was already
rejected for the header image (*Conventions*, above): it turns "forgot the
dark file" into silence instead of a build error, and "found a `-dark` file
that wasn't meant to pair with anything" into an accidental pairing.

**B. A custom Liquid tag or `{% include ui/themed-image.html ... %}` call
inline in the Markdown body**, reusing Phase 2's include directly — the
least new code. Rejected because Jekyll runs Liquid *before* kramdown, so
the include's HTML output becomes raw text kramdown then has to parse back
out — correctly, only if the call sits alone with a blank line on each
side, one of Jekyll's best-known footguns (get the blank lines wrong and
kramdown wraps or mangles the output with no warning). That fragility is
exactly what this whole plan exists to avoid.

**C. Manual raw HTML** (an author pastes the `<span class="relative
block">…</span>` structure straight into the Markdown body). Already works
today, zero new code — kramdown passes a block-level raw HTML chunk
through untouched. Rejected as *the* answer, kept as the fallback: no
dimension validation, and a typo'd `themed-image-dark` class silently
produces no dark layer at all.

**D. Kramdown IAL + a build-time rewrite (recommended).** Kramdown already
supports attaching attributes to an inline element with `{:...}` immediately
after it — no plugin needed for the syntax itself:

```markdown
![Diagram of the request flow](/assets/images/blog/<post>/diagram.png){:data-src-dark="/assets/images/blog/<post>/diagram-dark.png"}
```

kramdown renders that straight through to the `<img>` tag as a normal
`data-src-dark` attribute (verified against this repo's actual kramdown
config, not assumed):

```
$ bundle exec ruby -e '
require "kramdown"
puts Kramdown::Document.new(%q{![Diagram](/x.png){:data-src-dark="/y.png"}}).to_html
'
<p><img src="/x.png" alt="Diagram" data-src-dark="/y.png" /></p>
```

Two build-time steps, both extending the already-shipped
`_plugins/themed_image_pairs.rb` rather than a new file:

1. **Validation, in the existing `check_doc`, at the existing `:site,
   :post_read` hook.** `doc.content` at this point is still raw Markdown, so
   a regex over the source finds every `data-src-dark` IAL before kramdown
   ever runs, and each pair goes through the exact same dimension check as
   `image`/`image_dark` — same `fail_with`, same message shape, so a body
   image mismatch fails the build exactly like a header mismatch does.

   ```ruby
   # Matches kramdown's inline-attribute-list syntax: an image immediately
   # followed (no space -- kramdown's own rule) by {:...data-src-dark="...".}
   BODY_IMAGE_IAL = /!\[[^\]]*\]\(([^)\s]+)\)\{:[^}]*\bdata-src-dark="([^"]+)"[^}]*\}/

   def self.check_doc(site, doc)
     # ...existing image/image_dark checks above are unchanged...

     doc.content.to_s.scan(BODY_IMAGE_IAL).each do |light, dark|
       check_pair(site, doc, light, dark, label: "body image")
     end
   end
   ```

   (`check_pair` is the existing dimension-comparison logic, factored out of
   `check_doc` so both the front-matter pair and every body-image pair call
   the same code — the “names both files and both sizes” message stays
   identical either way, just prefixed with which image it's about.)

2. **Rewrite, in a new `:documents, :post_render` hook**, after kramdown has
   turned the Markdown into `doc.output`. Regex over the rendered HTML,
   order-independent on attributes (kramdown's own attribute order is
   stable, but nothing here depends on it):

   ```ruby
   Jekyll::Hooks.register :documents, :post_render do |doc|
     next unless doc.collection&.label == "posts"

     doc.output = doc.output.gsub(/<img\s+[^>]*data-src-dark="[^"]*"[^>]*\/?>/) do |tag|
       src  = tag[/\bsrc="([^"]*)"/, 1]
       alt  = tag[/\balt="([^"]*)"/, 1] || ""
       dark = tag[/\bdata-src-dark="([^"]*)"/, 1]
       %(<span class="relative block"><img class="block" src="#{src}" alt="#{alt}">) +
       %(<img class="themed-image-dark absolute inset-0 block size-full" src="#{dark}" alt="" aria-hidden="true"></span>)
     end
   end
   ```

Both regexes and the end-to-end rewrite were run against this repo's real
`bundle exec jekyll build` (a scratch post, reverted after) before writing
this — including the edge case of an image sitting mid-sentence rather than
on its own line, which kramdown still wraps individually. That case is
called out below as a real caveat, not a hidden one.

**Why this needs no changes to Phase 3 (CSS) or Phase 4 (JS) — again.**
`.themed-image-dark`'s opacity rules and `themed-image-pairs.js`'s
`[data-scheme]` flip are already page-wide and count-agnostic: the page has
one scheme, one attribute, and every `.themed-image-dark` element (header,
card, now any number of body images) reads the same signal. Adding body
images doesn't add a second thing to keep in sync — it adds more elements
matching a selector that already exists.

Three deliberate limits of this design, worth stating plainly rather than
discovering them later:

- **No `view-transition-name`.** A body image has no natural page-to-page
  pairing the way the header/card do, so the rewrite doesn't emit one —
  there is nothing on another page for it to morph into or from.
- **No `fill`.** A body image is ordinary flowing content (subject to the
  `.prose img` typography styles), the same regime as Phase 2's header, not
  Phase 5's card — so the light layer stays in flow and the wrapper shrinks
  to fit it, unmodified.
- **Only `src`, `alt`, and `data-src-dark` survive the rewrite.** Any other
  IAL attribute on the image (a caption class, an explicit `width`) is
  dropped, because the regex only extracts those three. Fine for a v1; if
  it turns out authors want e.g. a caption class preserved too, extend the
  extraction rather than special-casing it.

## Phase 7 — optional follow-ups

- **Hero / about portrait**: same include, if a dark variant is ever drawn.

---

## Implementation sequence (Conventional Commits)

Each commit builds and, where the phase reaches it, passes `bundle exec jekyll
build` on its own — so a bisect or a partial-review checkpoint never lands on
broken output. Scopes match the set already in use (see CLAUDE.md
*Conventions*): `gemfile`, `includes`, `styles`, `scripts`, plus bare `build`/
`docs` types.

1. **`build(gemfile): add fastimage for header image dimension checks`**
   `Gemfile` + `Gemfile.lock` (`bundle install`) only. No behaviour change yet.

2. **`build: require a header image and validate optional dark variant dimensions`**
   `_plugins/themed_image_pairs.rb`. This is the commit that starts enforcing
   `image` — it will fail CI on any post missing one. Land it only once the
   *Prerequisite* above is resolved (or in the same PR as the fix), since
   `main` must keep building green.

3. **`feat(includes): render optional dark variant of the post header image`**
   `_includes/ui/themed-image.html` (new) + `_layouts/post.html` (wired in,
   guard removed, `view-transition-name` moved to the wrapper). Behind the
   build check from commit 2, so every post either has no `image_dark` (old
   single-`<img>` path, no visible change) or a validated matching pair.

4. **`feat(styles): cross-fade the light/dark header image pair`**
   `_tailwind/main.css` additions: opacity states, the fallback `transition`,
   reduced-motion opt-out, and the `scheme-swap` root/header suppression
   rules. Re-run the CI byte-floor check mentally — this only adds bytes.

5. **`feat(scripts): swap the header image on colour-scheme change via view transitions`**
   `_includes/head.html` (inline pre-paint marker script) + `assets/js/themed-image-pairs.js`
   (new) + its `<script>` tag in `_includes/footer.html`. This is the commit
   that makes the swap animate; without it the dark layer already renders
   correctly (media-query path) but never transitions on a live scheme change.

6. **`docs: document image_dark and the header-image build check`**
   CLAUDE.md additions below, plus dropping the stale `parallax.js` row from
   *JavaScript* while touching that section (the file does not exist).

   Under **Architecture**, a new subsection after *Content/config split*:

   ```markdown
   ### Custom Jekyll plugins

   `_plugins/themed_image_pairs.rb` is a `Jekyll::Hooks.register :site, :post_read`
   check, not a generator — it validates front matter and raises to fail the
   build; it writes nothing. It runs on both `jekyll build` and `jekyll serve`,
   and is the first file in `_plugins/`: viable because CI's
   `bundle exec jekyll build` uses this repo's own Gemfile, not the
   `github-pages` gem, which ignores `_plugins/`.

   It enforces two rules on every entry in `site.posts`:
   - `image` is required. A post with no `image` fails the build.
   - `image_dark`, if set, must be a file with the exact same pixel width and
     height as `image`. A mismatch fails the build naming both files'
     dimensions — the two are stacked with the dark one sized to the light
     one's box, so a mismatched dark file renders stretched with nothing in
     the HTML to show it.

   Dimension reads go through the `fastimage` gem (pure Ruby, no native
   extension) rather than a hand-rolled header parser.
   ```

   Under **JavaScript**, the load-order sentence gains `themed-image-pairs.js`
   (and drops `parallax.js`), a new paragraph documents the one script that
   isn't a footer IIFE, and the DOM-contracts table gains a row:

   ```markdown
   Plain IIFEs, no jQuery, no framework, loaded at the bottom of
   [_includes/footer.html](_includes/footer.html) in this order: vendor (from
   `plugins.yml`), then `nav.js`, `carousel.js`, `portfolio-filter.js`,
   `emailForm.js`, `themed-image-pairs.js`. Each script bails out silently
   when its hooks are absent, so all of them load on every page.

   One exception: the pre-paint scheme marker (`.scheme-js` / `.scheme-vt` /
   `data-scheme` on `<html>`) is an inline `<script>` in
   [_includes/head.html](_includes/head.html), not a footer IIFE — it has to
   run before first paint, or a dark-mode visitor sees a frame of the light
   header image before `themed-image-pairs.js` can react. That script only
   reads the markers; it never sets them.

   | Script | Contract |
   |---|---|
   | [themed-image-pairs.js](assets/js/themed-image-pairs.js) | `[data-scheme]` + `.scheme-js`/`.scheme-vt` on `<html>` (set by the head.html snippet above) and a `.themed-image-dark` layer somewhere on the page; flips `data-scheme` on a live `prefers-color-scheme` change, wrapped in `document.startViewTransition({ types: ["scheme-swap"] })` when available |
   ```

   (Insert that row alongside the existing `nav.js` / `portfolio-filter.js` /
   `carousel.js` rows, same table.)

7. **`feat(includes): render the themed image pair in the blog card`**
   `_includes/ui/themed-image.html` (adds the `fill` param) +
   `_includes/post.html` (calls it with `fill=true`, box-sizing classes
   moved to `class`). Lands after commits 1–6 rather than slotted next to
   commit 3, since 1–6 already shipped by the time this was scoped in — but
   it needs nothing from 4–6 beyond what they already did: the CSS and JS
   are page-wide, not post-layout-specific, so the card gets the cross-fade
   and the View Transition swap without any change to either.

8. **`feat(build): validate and render themed image pairs inside post bodies`**
   `_plugins/themed_image_pairs.rb` gains the `BODY_IMAGE_IAL` scan in
   `check_doc` (factoring the dimension check into a shared `check_pair`)
   and the new `:documents, :post_render` rewrite hook. No CSS/JS changes —
   same reasoning as commit 7. Should land with (or after) a CLAUDE.md note
   documenting the `{:data-src-dark="..."}` authoring syntax, alongside the
   *Custom Jekyll plugins* section commit 6 already added.

Not a commit in this sequence: fixing
`2026-09-13-reimagining-my-portfolio-with-translucent-effects.md`'s missing
`image`. That is content, not this feature — call it out to the user as a
blocking prerequisite for commit 2 rather than deciding the image for them.

---

## Testing

0. **Missing required `image`.** Build a post with no `image` key →
   `bundle exec jekyll build` raises `missing required \`image\`` naming the
   post. This is expected to currently fail on the 2026-09-13 draft until the
   *Prerequisite* is resolved.
1. **Mismatch fails.** `sips -Z 400 --out /tmp/h-dark.webp <light>`, copy it in,
   declare `image_dark`, run `bundle exec jekyll build` → expect the raise naming
   both sizes and the post path. Then re-export at the light image's exact size →
   expect a clean build.
2. **Missing `image_dark` file** (declared but absent) → expected failure,
   distinct from case 0.
3. **Cross-fade, VT path.** `pnpm dev`, open the post, flip the OS appearance
   (`osascript -e 'tell app "System Events" to tell appearance preferences to set dark mode to not dark mode'`).
   Expect one 420ms cross-fade of the image with the rest of the page static.
4. **Fallback path.** Disable JS in devtools, flip appearance → 320ms opacity
   fade from the media query alone. Confirm in Firefox as well as Chrome/Safari.
5. **Reduced motion.** Emulate `prefers-reduced-motion: reduce` → instant swap,
   no fade, no snapshot.
6. **No-variant regression.** The three older posts (all of which already set
   `image`) keep a single `<img>` with the `view-transition-name` intact;
   card → post morph still works.
7. `wc -c assets/css/main.css` still clears the 20,000-byte CI floor.
8. **Card, no `image_dark`.** Any post without a dark variant still renders
   the card's original single `<img>` with the original class list, byte for
   byte — confirms `fill=true` changes nothing when there's nothing to fill.
9. **Card, paired.** On `/blog` or the home page, a post with `image_dark`
   (the 2026-09-13 post once its *Prerequisite* is resolved) shows both
   layers correctly sized and cropped at every breakpoint — mobile
   (`w-full`/`h-50`) and desktop (`w-[42%]`/`self-stretch`) — and flipping
   the OS appearance cross-fades the card exactly like the post header,
   with no separate CSS/JS change needed to make that happen.
10. **Body image, mismatch fails.** A post-body `{:data-src-dark="..."}` IAL
    pointing at a wrong-sized file → `bundle exec jekyll build` raises,
    same message shape as the header check, naming the body image's path.
11. **Body image, paired.** A standalone body image with a valid
    `data-src-dark` renders as the stacked pair and cross-fades on a live
    scheme change, with no separate CSS/JS change — confirms Phase 6's "no
    changes to Phase 3/4" claim, not just Phase 5's.
12. **Body image, inline-in-text.** An image mid-sentence with
    `data-src-dark` still rewrites correctly but visibly breaks onto its own
    line (the wrapper is `display:block`) — confirms this is a real,
    documented limitation rather than an unnoticed one.

---

## Costs and caveats

- **Both images always download.** A cross-fade needs both in the DOM, so a
  `<picture>` + `media` source (one request) is not an option. Neither layer can
  take `loading="lazy"` or `fetchpriority="low"` either, since either one may be
  the visible one at first paint. Keep dark variants to the same byte budget as
  the light file, and only declare `image_dark` where the dark treatment is worth
  the second request.
- **The dark variant must be fully opaque.** A transparent PNG lets the light
  layer show through underneath. The dimension check cannot catch this; it is a
  documented rule.
- **Rejected alternatives.** `light-dark()` is a colour-value function in
  practice, not an image one. `image-set()` has no colour-scheme selector.
  Swapping a single `<img>`'s `src` inside `startViewTransition` has no fallback
  cross-fade and can flash while the new file decodes.
