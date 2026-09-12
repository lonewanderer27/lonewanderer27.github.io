# Redesign: an iOS-style flat translucent system

> Status: **implemented in the working tree, uncommitted.** Written 2026-09-12 against `main` at `30e1c54`; revised 2026-09-12 after implementation, and again after a second agent added the cross-document view-transition system (§4.12). Supersedes `liquid-glass.md` (deleted).
>
> Scope as built: the Kross visual language is replaced by an iOS-style material system — ambient ground, four-step translucent surfaces, a section dot grid, hairline separators, flat neutral depth, softer corners, a two-column hero with a cutout portrait — plus paired cross-document view transitions. **28 files modified, 2 includes added, 22 images and 1 script deleted.**
>
> §5 is the commit sequence for the current diff. §7 is the measured verification. §8 is what remains.

## 1. Which "iOS translucent" this is

| | What it is | This plan |
|---|---|---|
| **iOS 7–18 vibrancy** | Flat blurred *materials* in a thin→thick scale, hairline separators, no ornament, content on floating panels over a wallpaper | **this** |
| **iOS 26 Liquid Glass** | The above plus specular edge lighting and true refraction at panel rims | no — §9.3 |

**CSS has no equivalent of iOS vibrancy.** On iOS, text on a material is composited with blend modes that pull colour from the backdrop, which is what keeps it legible over anything. The web has `backdrop-filter` and nothing else, so the alphas here run heavier than Apple's (§4.1) and every text-on-material pair had to be measured (§7.1).

## 2. Decisions taken

Four chosen directly on 2026-09-12:

1. **Ambient wallpaper; drop the clip-art.** The load-bearing decision: a blurred panel over a flat colour is invisible, because the blur output equals its input. Materials only read as translucent with something textured behind them.
2. **Typography unchanged.** Roboto + Figtree stay.
3. **Hairline separators plus tight neutral shadows.** The three pale-blue glow tokens go.
4. **Softer corners, 8/12px**, not the full iOS 12/16/20 scale.

### 2.1 The cascade from decision 1 — accepted during the build

Dropping the clip-art left the hero and page-title banners as flat slabs of `bg-primary`. The plan proposed removing those too, making purple an *accent* rather than a *background*, and that was implemented: banners are transparent over the ambient ground, headings are `text-heading`, and the header's links moved from `text-white` to `text-heading`.

The one place the brand band survived is the **testimonial section**, converted to `material-brand` rather than deleted — it was the only saturated region left, and a full-bleed tinted material over the wash is the iOS pattern for a tinted section. White copy is unchanged and measures 5.82:1.

### 2.2 Two more decisions taken mid-build

5. **Section differentiation via a dot grid** (§4.6). Once the texture PNGs came out, every section was the same flat field. Asked for "the background dots back", built as a CSS grid rather than restoring `bg-dots.png` — the PNG was black at 13% alpha with no dark handling, so it was invisible in dark mode.
6. **A hero-local wash** (§4.7), separate from the sitewide one, because the global ground is capped by a contrast constraint the hero does not share.

## 3. Where the repo's own rules constrained the build

From [CLAUDE.md](../../CLAUDE.md), all held:

1. **No `@apply`, no hand-written selectors.** Five `@utility` rules (four materials + `dots`), everything else is `@theme` tokens and utilities at call sites.
2. **Semantic tokens, not `dark:` at call sites.** Every material, separator, ambient, dot and hero colour re-points in the dark block. No `dark:` variant was added for a colour.
3. **Shadows stay the exception.** `--shadow-card` / `--shadow-sheet` are inlined at build time, so call sites carry `dark:shadow-none`. This turned out to *reduce* overrides: iOS dark mode separates with separators, not shadows, so `dark:shadow-none` replaced eight `dark:shadow-black/50`.
4. **Breakpoints stay pinned** to Bootstrap 4's.
5. **Repeated markup goes in includes.** Two new ones: `ui/ambient.html`, `ui/portrait.html`.
6. **`view-transition-name`s stay matched across the pages they transition between**, which CLAUDE.md already required for the page titles. §4.12 replaces that one-off rule with a system.

`source(none)` means this document's examples never reach the build. Both new includes live under `_includes/`, already in `@source`.

## 4. The design system, as built

### 4.1 Materials — four steps

```css
--color-material-thin: rgb(255 255 255 / 0.55);  /* chrome over content: the nav bar */
--color-material: rgb(255 255 255 / 0.62);       /* cards, discs, buttons */
--color-material-thick: rgb(255 255 255 / 0.8);  /* panels carrying body copy */
--color-material-brand: rgb(65 34 142 / 0.72);   /* tinted, for white-on-material chrome */
--color-separator: rgb(60 60 67 / 0.18);
--color-material-edge: rgb(60 60 67 / 0.16);  /* a DARK hairline in light mode — see §7.1 */
```

Dark: `rgb(40 34 56 / 0.4 | 0.55 | 0.78)`, brand `rgb(48 25 105 / 0.68)`, separator `rgb(235 235 245 / 0.14)`, edge `rgb(255 255 255 / 0.14)` (white only in dark, where a lit edge reads as a highlight).

**Changed from the draft:** `material-thin` shipped at **0.55, not 0.45**. The draft flagged it as "the likeliest failure in the plan, and the reason `material-thin` may have to go to 0.55" — that prediction was right, and it went in at 0.55 from the start.

### 4.2 Four utilities, and the traps they hid

```css
@utility material {
  background-color: var(--color-material);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--color-material-edge);
}
```

`material-thin` is the same at `blur(30px)` — a thin material blurs *more*, so less backdrop detail survives its lower alpha. `material-thick` and `material-brand` are `blur(20px)` with their own fills.

Three mechanical traps, all found by building rather than by reading docs:

- **Never hand-write `-webkit-backdrop-filter`.** Lightning CSS adds it, and writing the pair by hand makes it dedupe the two identical declarations down to the prefixed one alone — **which drops Firefox**, since Firefox supports only the unprefixed property. Tailwind's own `backdrop-*` utilities escape this because their values are `var()` chains it cannot compare. Shipped wrong once, caught by inspecting the emitted CSS.
- **A `border` shorthand in a `@utility` sorts after `border-x-0`/`border-t-0`** at equal specificity. The header's one-edge border trim needs `!` on the trim. Hit twice: once on the header (fixed with `!`), once on the active service card where a `border-0` silently did nothing (fixed by removing the nesting instead — §7.3).
- **A `@utility` body cannot contain `@media`**, so the opt-outs in §7.2 re-point *tokens*. That is the whole reason alpha lives in tokens rather than in `/60` modifiers at call sites.

**A fourth, structural rule learned from a bug:** a child element that means to fill a rounded material must carry its own radius, and it will still be inset by the material's 1px border. See §7.3 — this produced a visible defect twice.

### 4.3 Depth

```css
--shadow-card: 0 1px 2px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.06);
--shadow-sheet: 0 8px 32px rgb(0 0 0 / 0.1);
```

`--shadow-soft`, `--shadow-lift`, `--shadow-glow` are gone, along with the `before:` pseudo-elements that carried the glow halos on the contact panel and the about portrait.

### 4.4 Shape

```css
--radius-control: 0.5rem;  /* 8px  — buttons, inputs, chips */
--radius-card: 0.75rem;    /* 12px — cards, panels, sheets */
```

Custom names, not overrides of `--radius-sm/md/lg`. `rounded-full` stays for discs.

### 4.5 The ambient ground — `ui/ambient.html`

```css
--color-ambient-1: rgb(65 34 142 / 0.06);   /* primary */
--color-ambient-2: rgb(43 253 255 / 0.06);  /* secondary cyan */
--color-ambient-3: rgb(183 156 255 / 0.06);
```

Dark: `0.12 / 0.08 / 0.10`.

Three radial gradients sized in `vmax` on a `fixed inset-0 -z-10 overflow-hidden pointer-events-none` layer, placed once in [_layouts/default.html](../../_layouts/default.html).

**Two deliberate deviations from the draft:**

- **No `blur-3xl`.** A radial gradient that fades to transparent is already soft, so the filter would double the compositing cost for no visible change — and it would make this layer a `filter` ancestor, which in WebKit breaks `backdrop-filter` on anything nested inside. **Dropping the blur eliminated §9.4 of the draft entirely**, which had called that nesting hazard "a correctness requirement".
- **Both washes were cooled after measurement.** Dark started at `0.18/0.14/0.16`, composited to `rgb(53 68 104)` — a visibly blue field rather than a faint tint, and it cost contrast on everything above it. Light started at `0.10` each and was cooled to `0.06` for the same reason.

It sits at `-z-10`, which works because of CSS background propagation: `html` has no background, so `body`'s is painted as the canvas and `body` is treated as having none. **Give `html` a background and this layer disappears behind it.**

### 4.6 The section dot grid

```css
--color-dot: rgb(65 34 142 / 0.12);   /* dark: rgb(183 156 255 / 0.14) */

@utility dots {
  background-image: radial-gradient(var(--color-dot) 1px, transparent 1px);
  background-size: 22px 22px;
  background-position: 0 0;
}
```

Applied to **services, certificates, contact** — and only those three. It earns its place twice: it differentiates sections, and it is what the materials actually blur. The ambient wash is low-frequency, so blurring it changes almost nothing; a 1px grid at 20px blur smears into visible frost.

Placement is constrained, not arbitrary (§7.4): `contact` is always the last section on every page, so its predecessor must stay plain, and `skills` does not render (no data in `settings.yml`), which makes `about-section` and `services` neighbours. Verified against the rendered section order of all six page types — no two dotted sections are ever adjacent.

### 4.7 The hero-local wash

```css
--color-hero-1: rgb(65 34 142 / 0.34);   /* dark: rgb(124 77 255 / 0.3) */
--color-hero-2: rgb(43 253 255 / 0.2);   /* dark: rgb(43 253 255 / 0.12) */
```

Two gradients inside the hero, on top of the global ground. It can run far hotter than the sitewide values because **the hero carries no muted text** — the global ground is capped by `text-muted` sitting at 4.52:1 on a bare section, and brightening it everywhere would push that under. Keeping the strong wash local decouples the two.

**Matched by lift, not by alpha**, and this was got wrong first: dark was raised to 0.30 because the near-black hero read as dead, while light was left at 0.10 — a 1.71× lift versus 1.20×. A dark ground needs a higher alpha to travel the same perceptual distance. Both now land at ~1.7× (§7.1).

`--color-hero-1` also drives the glow behind the portrait's head, so the two move together.

### 4.8 The hero, rebuilt

Two columns (`lg:w-7/12` + `lg:w-5/12`, `items-center`): heading and social rail left, cutout portrait right. Padding `pt-30 pb-20 md:pt-37.5 md:pb-37.5` — down from 180/250px top, since the header measures ~100px and 250px left ~150px of dead gap.

The social rail changed shape: it was a vertical stack pinned to the left gutter with `ms-12`, which made sense floating in an empty hero but has nothing to align to once there is a left column. Now a horizontal row under the heading.

### 4.9 `ui/portrait.html` — the cutout treatment

The source became a transparent cutout mid-build, which invalidated the framed-photo treatment: a bordered box around a cutout reads as an empty box with a person floating in it. So the figure **stands in front of** a material panel, head and shoulders breaking above its top edge — the one composition a cutout can do and a rectangular photo cannot.

**The panel edge is measured, not guessed.** Decoding the alpha channel put the head at 6.7–30% of frame height, shoulders from ~34%, torso widest at 56–66%, figure cropped at the bottom. Hence `top-[34%]`. Re-measure if the photo is recropped.

Paint order is DOM order, not `z-index`: glow, then panel, then image last. The panel's `backdrop-filter` therefore blurs the glow behind it, which is the point.

Used twice — hero and about page — which is why it is an include.

### 4.10 Portrait assets

The cutout arrived as `author.png`, 1460×2180 RGBA, **1483 KB** — 5.4× heavier than the JPEG it replaced, above the fold. `cwebp` was available:

| file | size |
|---|---|
| `author.png` (master, untracked) | 1483 KB |
| `author-800.webp` | **47 KB** |
| `author-400.webp` | **18 KB** |

31× smaller, alpha intact. Served via `srcset` at `sizes="400px"` (every call site caps at `max-w-100`), `fetchpriority="high"` on the hero copy as the LCP candidate, `loading="lazy"` on the about page's. Paths live in `settings.yml` and `about.md` front matter per the content/config split.

### 4.11 The about page, restructured

The title was in its own `<section>` and the portrait in the next one, with a `lg:-mt-57.5` pull reaching across the section boundary to fake their alignment. That only worked at the one banner height it was tuned for — shrinking the banner moved the title without moving the photo, and any pull large enough to catch up put the photo behind the fixed header.

Now **one row, two sibling columns**, `items-start` so the tops line up, no negative margins, `lg:mt-20` on the text column to drop the title 80px below the photo's top. Breakpoints follow the hero (`7/12` + `5/12`, stacking below `lg`) rather than the old `md:w-2/3` + `md:w-1/3`, which put a 597px-tall portrait in a 256px-wide column.

### 4.12 Cross-document view transitions

Added after the redesign landed, by a second agent. The site is a multi-page app, so the mechanism is the native `@view-transition` rule plus a short list of `view-transition-name`s in the templates. The value is in the four rules that keep that list from becoming a pile of accidental morphs — they are documented at length in [_tailwind/main.css](../../_tailwind/main.css) and summarised here because they constrain future template edits:

1. **A name is only spent where both pages really have the element.** Every name is half of a pair. An unpaired name animates as a lone enter/exit, which is what the root fade already does — it buys nothing and reads as a glitch when the two elements are only loosely related.
2. **A name must be unique per document.** A duplicate does not degrade gracefully, it **aborts the entire transition**. [post.html](../../_includes/post.html) therefore drops its `post-*` names when the card is the post you are already reading, because `_layouts/post.html`'s "Similar Stories" list includes it.
3. **Naming lifts an element out of its ancestors** — their clip, stacking context and z-index — into its own group in a flat layer tree painted above `root`. Two consequences were designed around, not discovered late: the portfolio grid names the **clipping wrapper** rather than the `<img>` inside it (which would fly unclipped at its idle `scale-110`), and the ambient wash is left **unnamed** so it does not spend the transition covering the content it exists to sit behind.
4. **Only `position: fixed` chrome is worth naming persistent.** A group animates from its old viewport box to its new one, so naming a document-flow element that sits at a different scroll offset on the next page (the footer, the contact block) makes it *slide* the difference. The header is viewport-anchored, so its two boxes coincide and naming it holds it still while the content moves underneath.

The pairs, all verified present on both ends (§7.7):

| Name | Pair | Why it works |
|---|---|---|
| `site-header` | every page | `fixed`, so the boxes coincide; only the frost animates, since nav.js has not yet re-added `.nav-bg` on the new page |
| `portrait` | hero ↔ about | literally the same file at the same width — close to a pure translate |
| `portfolio-title` | home heading ↔ `/portfolio` title | identical text |
| `blog-title` | home heading ↔ `/blog` title | §7.7 flags this one |
| `shot-<image>` ×3 | home grid ↔ `/portfolio` grid | gated on the image existing in both lists |
| `post-image-<slug>`, `post-title-<slug>` | blog card ↔ post page | per-post, gated by rule 2 |

**Root is animated, not cross-faded.** The UA default is a symmetric opacity cross-fade, which dips through the ambient ground mid-transition. Instead the outgoing page is **held opaque** (`animation: none`) and the incoming one rises in over it, so there is never a frame where neither page is solid. `mix-blend-mode: normal` is load-bearing: the UA sets `plus-lighter`, which is only correct for a symmetric cross-fade — layered over an opaque old snapshot it composites additively and blows out the midpoint.

**`prefers-reduced-motion: reduce` sets `navigation: none`**, the documented opt-out, which turns navigation back into a plain load. Cheaper and more honest than zeroing the animations, which would still snapshot both pages.

Three things this fixed that the redesign had left wrong:

- `_layouts/page.html` **hard-coded `portfolio-page-title`** for every page on that layout, so `/blog` and `/contact` inherited it and the home page's "Portfolio" heading morphed into the word "Contact". The name now comes from each page's own `transition:` front matter, and pages with no counterpart set nothing.
- The home page's "more about me" **button** carried `about-page-title`, stretching a 40px pill into the about page's `<h1>`. Dropped; the portrait carries that navigation's continuity instead.
- The about page's `<h1>` is deliberately **not** paired with the hero's — "About Me" against three lines of "Hi I'm Jay!" squashes the text.

## 5. Commit sequence for the current diff

The work was built in passes, so **many changed templates carry edits belonging to more than one topic** — `contact-section.html` alone has illustration removal, shadow, radius, material and dots; `post.html` has card material, radius, and per-post transition names. Committing by topic literally would need `git add -p` on those files.

This sequence is coarser but every commit is whole-file. Conventional Commits, repo scopes (`theme`, `styles`, `includes`, `scripts`, `content`, `plan`).

| # | Commit | Files |
|---|---|---|
| 1 | `docs(plan): replace the glass plan with an iOS translucent redesign` | this doc, delete `liquid-glass.md` |
| 2 | `feat(theme): add the material, dot and depth token system` | `_tailwind/main.css` |
| 3 | `feat(includes): add the ambient ground and cutout portrait includes` | `ui/ambient.html`, `ui/portrait.html`, `_layouts/default.html` |
| 4 | `feat(content): serve the portrait as sized WebP` | `_data/settings.yml`, `_pages/about.md`, 2 `.webp`, delete `author.jpg` |
| 5 | `refactor(includes): drop the illustration slabs and rebuild the hero and about page` | `hero-section.html`, `page-title.html`, `_layouts/about.html`, `testimonial-section.html`, + 20 PNG deletions |
| 6 | `refactor(scripts): remove the dead hero parallax script` | delete `parallax.js`, `footer.html` |
| 7 | `feat(styles): rework the header for a light translucent ground` | `header.html` |
| 8 | `feat(styles): put the card system on materials with flat depth and softer corners` | `services-`, `skills-`, `team-`, `post.html`, `_layouts/post.html`, `portfolio-section.html`, `_pages/portfolio.html`, `work-process-`, `ui/button.html` |
| 9 | `feat(styles): put the icon discs and contact panel on materials` | `experience-`, `certificates-`, `education-`, `contact-section.html`, `social-icon.html` |
| 10 | `feat(styles): pair cross-document view transitions` | `_tailwind/main.css`, `header.html`, `page-title.html`, `post.html`, `portfolio-section.html`, `about-section.html`, `blog-section.html`, `ui/portrait.html`, `_layouts/page.html`, `_layouts/post.html`, `_layouts/about.html`, `_pages/blog.html`, `_pages/portfolio.html` |

Ordering constraints:

- **3 before 5** — the ambient ground must exist before the slabs come off, or the hero is a bare white box for one commit.
- **4 before 5** — `hero-section.html` reads `hero.hero-image`. Its `{% if %}` guard means the reverse order still builds, just without a photo.
- **5 before 6** — `parallax.js`'s `LAYERS` list is exactly the `#l2`–`#l9` divs deleted in 5.
- **2 is indivisible.** Deleting `--shadow-soft` stops the class being generated, which produces no shadow *silently* rather than a build error — so the token change and its call sites must not be separated. They span commits 7–9, which means 2 through 9 are one atomic set in practice: do not ship 2 alone to `main`.
- **10 overlaps 2, 5, 7 and 8 on nine files.** It is listed last because the transition work was done last, but it cannot be committed as a clean whole-file commit *after* those — the same files carry both sets of edits. Either fold each file's transition edits into the commit that already touches it (2, 5, 7, 8) and commit only `about-section.html`, `blog-section.html`, `_layouts/page.html`, `_pages/blog.html` separately, or accept `git add -p`. **Folding is the recommendation** — a view-transition name and the markup it sits on are not independently revertable anyway.

## 6. Rollback posture

Commits 7, 8 and 9 revert alone. Commits 2–5 are the direction itself; reverting 2 through 9 returns the site to Kross with none of the material system. Reverting 1 through 10 returns it to `30e1c54`.

The transition work (§4.12) is the cheapest thing here to abandon: deleting the block at the bottom of `_tailwind/main.css` disables the whole mechanism in one edit, and the orphaned `view-transition-name`s in the templates then cost nothing — a name with no `@view-transition` rule is inert. Removing `navigation: auto` alone is the kill switch.

## 7. Verification — measured, not eyeballed

### 7.1 Contrast

Every pair composited over the real worst-case backdrop and measured with a script. All pass.

| Pair | Effective bg | Ratio |
|---|---|---|
| nav `text-heading` on `material-thin`, over the footer (worst light) | `rgb(156 156 156)` | 7.61 |
| nav `text-heading` on `material-thin`, over the brand band | `rgb(188 180 217)` | 10.67 |
| card `body-text` on `material`, light / dark | `rgb(239 244 252)` / `rgb(40 40 65)` | 7.79 / 7.05 |
| `body-text` on a **dot**, light / dark | — | 5.90 / 4.95 |
| white on `material-brand` (testimonials, discs, active card), light / dark | `rgb(111 91 172)` | 5.58 / 14.06 |
| contact `body-text` on `material-thick`, light / dark | `rgb(247 249 253)` / `rgb(43 41 67)` | 8.16 / 6.91 |
| hero `h1` on the hero wash, light / dark | `rgb(147 185 221)` / `rgb(63 80 145)` | 10.23 / 6.75 |
| hero wash **lift** off the global ground, light / dark | — | **1.74× / 1.71×** |

**Quiet text needed the token split in two.** `--color-muted` was doing two incompatible jobs: labels on the near-black footer, and quiet text on a light page ground. Darkening it enough for the page made the footer illegible, which is why it sat at a failing value through most of the build.

- `--color-muted` is now **footer-only** — `#999999` light, `#8a8398` dark (the theme's original values): 5.58:1 and 5.38:1 on `--color-footer`.
- `--color-subtle` is new, for quiet text on a page ground or material — `#5d5d5d` light, `#9d95ad` dark. Used by the experience, education and team organization lines.

| | worst surface | before (`text-muted`) | after (`text-subtle`) |
|---|---|---|---|
| light | a dot | **1.96** | **4.52** |
| light | bare ground | 2.42 | 5.59 |
| dark | bare ground | 2.75 | 4.52 |
| dark | material | 3.46 | 4.97 |

The dark figure is the regression this redesign introduced and then fixed: a translucent dark material composites *lighter* than the opaque `--color-surface` it replaced, so quiet text fell from 4.79:1 to 3.46:1. No ambient value fixes it — even a near-zero wash only reached 4.17:1, because the lift comes from the material tint itself.

`--color-subtle` light is only 17 levels lighter than `--color-body-text`, because AA leaves almost no tonal room below body text on a light ground. **Size and weight carry the hierarchy, not tone** — the experience block is a `text-h6` under a `text-h4`. Verified empirically that `text-subtle` lands on a bare ground in all five places it is used and never on a dot, so the dark "on a dot" figure of 3.49 is hypothetical.

**A second fix in the same pass: the light-mode material edge was invisible.** `--color-material-edge` was white at 0.55 in both themes — a lit top edge, which is a dark-mode idea. Over a light ground that is a 1.09× delta, i.e. nothing, so the icon discs had no visible surface at all (cards got away with it because they also carry `shadow-card`). Light mode now uses a dark hairline, `rgb(60 60 67 / 0.16)`: a 1.31× delta on the ground, and only 1.11× on `material-brand`, so the purple discs keep a soft edge rather than a drawn outline. Dark mode keeps the white lit edge.

### 7.2 The opt-outs

`prefers-reduced-transparency: reduce` and `prefers-contrast: more` re-point all four material tokens to `--color-surface`, the edge to `--color-line`, and **all three ambient tokens to `transparent`** — a translucency-sensitive reader should not be handed a decorative wash either. The same re-points sit inside `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))`. Both shipped with the utilities, in one commit, because a material without its guards is an accessibility regression rather than an unfinished feature.

### 7.3 Two defects from children inside rounded materials

Both the same root cause, and worth reading as a rule rather than two anecdotes.

1. **The active service card.** The tint was on an inner `<div>` with no radius of its own, inside a `rounded-card material`. Its square corners cut across the card's 12px radius, and it sat inside the card's 1px border, leaving a hairline ring of card visible around it. It was also a **material nested inside a material** — a second `backdrop-filter` blurring the first's output. Fixed by tinting the card itself (`material` → `material-brand` on the wrapper), which removes the ring, the radius mismatch and the nesting in one move.
2. **The blog card's image** carried `rounded-card` on all four corners, showing a 12px notch mid-card where the image meets the text. Masked at the old 4px radius. Now `rounded-t-card`, switching to `rounded-s-card` at `@min-[24rem]` where the image moves to the side — the radius follows whichever card edge it actually touches.

### 7.4 Performance — counted, not yet traced

Exact per-page `backdrop-filter` counts, from walking the rendered HTML with a real parser:

| page | count | breakdown |
|---|---|---|
| `index.html` | **11** | 6 `material`, 4 `material-brand`, 1 `material-thick` |
| `about.html` | **13** | 12 `material`, 1 `material-thick` |
| `portfolio.html` | 7 | |
| post pages / `blog.html` | 5 | |

Zero nesting on any page. Budget is one always-animating material (the header) plus ~10 static, so index is at the line and about is over it.

**An earlier count of 10 for index was wrong** — the counting script excluded any element whose class list mentioned `bg-material` anywhere, which wrongly dropped the two social discs (they carry `material-brand` plus a `hover:bg-material-thick`).

Still untraced, and it needs a real browser: Performance trace of a full scroll on `/about`, mobile emulation, 4× CPU throttle, Rendering panel paint flashing on. Threshold 60fps. If it fails, in order: (1) the three disc call sites swap `material` → `bg-material`, keeping the tint and dropping the filter — worth noting the certificates discs are the only set where the blur does real work, since they sit on the dot grid, while education and experience are over flat ground and get nothing; (2) cards drop to a tint below `lg`; (3) the wash becomes a static pre-blurred gradient. **`will-change` is not on that list** — it promotes layers and makes this worse.

### 7.5 Other checks that passed

- `pnpm css:build` → 50 KB, well clear of the 20,000-byte floor in [pages.yml](../../.github/workflows/pages.yml). `bundle exec jekyll build` succeeds.
- Both `backdrop-filter` spellings present in all four material rules.
- Zero hits for `shadow-soft|shadow-lift|shadow-glow`, `illustrations/`, `parallax`, `bg-surface-alt`, `rounded-[5px]`.
- No broken asset references anywhere in `docs/`.
- `about-page-title` is **gone** from both ends on purpose (§4.12): it used to stretch a 40px button into an `<h1>`. The portrait carries that navigation now.
- The four remaining scripts load in order.

### 7.6 View-transition names — audited, not assumed

Rule 2 of §4.12 is unforgiving: one duplicate name aborts the whole transition, silently. So both invariants were checked against the rendered HTML rather than the templates.

| Check | Result |
|---|---|
| Duplicate names within a document | **none**, across all 10 rendered pages |
| Unpaired names (present on only one page) | **none** — all 13 distinct names exist on 2+ pages |
| Rule 2's guard in `post.html` | each post page carries exactly **2** own-slug names (its own hero image + title), confirming the "Similar Stories" card suppresses its duplicate |
| `@view-transition` survives minification | present, including the `@media (prefers-reduced-motion: reduce)` nesting |
| `::view-transition-*` rules survive | all 7 emitted; Lightning CSS splits the comma-grouped selectors and reorders the `animation` shorthand, both equivalent |

Counting these needs care: `[view-transition-name:site-header]` (the arbitrary-variant class form) also matches a naive search for the inline-style form, which double-counts every name written as a class and reports a false duplicate on `site-header`, `portfolio-title` and `blog-title`. Strip the bracket form before scanning for the style form.

**One pair worth a second look.** `blog-title` pairs the home page's "Latest Blogs" `<h2>` with `/blog`'s "Blogs" `<h1>` — different text at different sizes. That is the same objection §4.12 records for *rejecting* the hero-h1 ↔ about-h1 pair ("morphing between them squashes the text"), just milder. `portfolio-title` has identical text on both ends and `post-title-*` carries the same post title, so this is the only pair that morphs differing words. Judgement call; worth eyeballing before committing.

### 7.7 What got worse, plainly

- **First paint on a slow device.** Eleven blurred surfaces plus a blurred header is compositor work before anything is readable. The ~190 KB of deleted PNGs and the 1.44 MB saved on the portrait more than pay for it on a cold load; on a warm load it is a net add.
- **The site stops looking like Kross.** That is the point, but the README's "modifications vs. upstream" note is now badly out of date and any future upstream merge is manual.
- **The OG banner** (`assets/images/banner.png`) still shows the old design.

## 8. Outstanding

*(The light-mode quiet-text failure that sat here through the build is resolved — see the token split in §7.1.)*

1. **`page-title.html` padding.** Still `pt-30 pb-12.5 sm:py-45 lg:pt-62.5 lg:pb-37.5` — 250px of top padding sized for a slab that no longer exists. The hero and about page were brought to 120/150px; this serves `/blog`, `/portfolio`, `/contact` and every post, and is the last one out of step. The transition pass edited this file but only to route the `transition` param, so the padding is untouched.
2. **The `/about` perf trace** (§7.4). Now also worth watching during a navigation: the header is a named group *and* a `backdrop-filter` element, so it is snapshotted every transition.
3. **`author.png`, 1483 KB, untracked and referenced nowhere.** Jekyll copies everything under `assets/`, so committing it ships 1.44 MB of dead weight to Pages. Either keep the master outside `assets/` or add it to `_config.yml`'s `exclude`.
4. **A stale comment** in [ui/button.html](../../_includes/ui/button.html) says `variant: material` is meaningful over "the page-title banner, the contact panel's dots" — the page-title banner no longer has any texture.
5. **`variant: material` has no call site.**
6. **Four `.DS_Store` files** are untracked. Jekyll ignores dotfiles so they never reach `docs/`, but they belong in `.gitignore`.
7. **The `blog-title` pair morphs differing text** (§7.6).
8. **Transitions are unverified in a browser.** The audit covers the invariants that fail silently; it cannot tell you whether the morphs look good. Worth walking home → portfolio, home → blog → a post, and home → about, in both themes, plus one pass with OS reduce-motion on to confirm navigation falls back to a plain load.

## 9. Out of scope

**9.1 Typography.** Decision 2.

**9.2 The full iOS radius scale.** Decision 4 picked 8/12px.

**9.3 Real refraction / Liquid Glass proper.** Needs a per-element displacement map — `filter: url(#displace)` over an inline SVG `feDisplacementMap`, plus a generated map per panel size. Far more expensive than a blur, degrades to nothing where the filter is rejected, and the primitive would be hand-written SVG outside the Tailwind system.

**9.4 Cursor-tracked speculars and animated sheen.** Both need new JS or new keyframes plus a `prefers-reduced-motion` branch. The existing `--animate-wave` stays, being content rather than ornament; the view transitions in §4.12 are the only motion added, and they honour reduce-motion.

**9.5 Materials on the footer.** `bg-footer` (`#222` / `#0d0b12`) stays the page's one solid, heavy surface. Translucency everywhere is translucency nowhere.

**9.6 The known inconsistencies in CLAUDE.md.** The duplicate `defaults:` key, the stale `url:`, the `assets/image/banner.png` typo, the empty author meta.

**9.7 Breakpoint unpinning.**

## 10. Relationship to the other plans

[bootstrap-to-tailwind.md](bootstrap-to-tailwind.md) is executed. Its semantic-token discipline is what made a four-step material scale, a dot grid and two separate washes token edits rather than site-wide find-and-replace — and what made the two contrast regressions in §7.1 fixable by re-pointing one token each.

[jekyll-to-astro-migration.md](jekyll-to-astro-migration.md) is not started. This adds two includes and deletes one script and 21 images, so it slightly *reduces* the migration surface. The two new includes port to components mechanically. Do this first or that first, not both at once.
