# Converting all styling to pure Tailwind CSS v4

> Status: draft plan, not yet started. Written 2026-09-11 against branch `version5` at commit `d2bf236`. Rescoped 2026-09-11 from "remove Bootstrap" to "all styling becomes Tailwind".
>
> Decisions taken (2026-09-11): Tailwind lands in the **current Jekyll repo** (not deferred to the Astro migration), built by a Node step wired into a **new GitHub Actions workflow**; fidelity target is **pixel-faithful port plus targeted modernization** (dark mode, fluid type, reduced-motion, fixing latent bugs).
>
> Scope: **both** styling systems currently in the repo — vendored Bootstrap 4 **and** the hand-written SCSS in `assets/scss/` — are replaced by Tailwind. When this is done there are no `.scss` files, no `sass:` config, no vendored CSS framework, and no hand-authored CSS rules. Content in `_data/settings.yml`, URL shapes, and Liquid data logic are unchanged. This does **not** migrate to Astro — see section 14.

## 1. What "pure Tailwind" means here, and where it cannot reach

"Pure" needs a precise definition or it becomes unfalsifiable. For this plan it means: **every styling decision is expressed either as a utility class in a template, or as a Tailwind v4 CSS-config directive.** Concretely, the allowed surface is:

| Allowed | Used for |
|---|---|
| Utility classes in templates | the overwhelming majority of all styling |
| `@theme` | design tokens — colors, fonts, type scale, shadows, animations, breakpoints |
| `@utility` | genuinely repeated custom utilities that Tailwind has no equivalent for |
| `@custom-variant` | the `dark:` variant (v4 requires declaring it) |
| `@layer base` | element defaults Preflight does not already cover |
| `@source` | telling the scanner where templates live |
| `@tailwindcss/typography` | markdown-rendered post bodies |

What is **banned**: `.scss` files, hand-written selectors with declarations, and `@apply`. The last needs justifying — `@apply` looks like the obvious tool for turning `.btn` into Tailwind, and it is the single most common way a "Tailwind migration" ends up as SCSS with extra steps. Tailwind's own v4 guidance is to avoid it. Section 9 covers what to do instead, and the answer in a Jekyll repo is unusually clean.

Four things are genuinely out of reach, and pretending otherwise would make the plan dishonest:

1. **Markdown post bodies.** Kramdown emits bare `<p>`, `<h2>`, `<blockquote>`, `<strong>` with no class hooks, so no utility can ever be attached to them. This is exactly what `@tailwindcss/typography` exists for — `prose` on the wrapper. That is a Tailwind-native answer, so it counts as pure; hand-written `.content > *` rules would not.
2. **Vendor CSS for icon fonts.** Themify (`ti-*`) and the Font Awesome kit ship their own CSS and their class names live in `_data/settings.yml`. Consolidating icon sets is a data-file project, not a styling one. Out of scope; kept as vendor CSS.
3. **Third-party JS that styles via its own class names.** slick generates `.slick-slide`/`.slick-dots` markup; Shuffle writes inline positioning. Neither can be driven by utilities. See section 10 — this is the finding that most changes the plan.
4. **Preflight's own base layer.** Tailwind ships element resets. That is Tailwind, not custom CSS.

Everything else in `assets/scss/` converts. Section 8 accounts for it rule by rule.

## 2. Current styling inventory

The vendored framework is **Bootstrap 4.1.1** (`assets/plugins/bootstrap/bootstrap.min.css`, 134 KB; `bootstrap.min.js`, 68 KB), loaded through the plugin manifest in [_data/plugins.yml](../../_data/plugins.yml) — CSS in [_includes/head.html:26-28](../../_includes/head.html#L26-L28), JS in [_includes/footer.html:44-46](../../_includes/footer.html#L44-L46). Alongside it sits ~12 KB of hand-written SCSS across 12 files: 6 at the root of `assets/scss/` and 6 under `templates/`.

Five facts materially shape the plan:

**Almost nothing of Bootstrap's JavaScript is used.** Exactly two components are wired up:

| Component | Location | Replacement |
|---|---|---|
| `collapse` (navbar toggler) | [_includes/header.html:10-16](../../_includes/header.html#L10-L16) | ~15 lines of vanilla JS + `hidden` toggle |
| `btn-group-toggle` with `data-toggle="buttons"` | [_pages/portfolio.html:11](../../_pages/portfolio.html#L11) | `peer-checked:` variants — **zero JS** |

No modal, dropdown, carousel, tooltip, popover, scrollspy, tab, or alert dismissal. 68 KB of JS plus Popper exists to serve one hamburger menu.

**The SCSS already fights Bootstrap rather than extending it.** [assets/scss/_common.scss](../../assets/scss/_common.scss) and [assets/scss/_buttons.scss](../../assets/scss/_buttons.scss) override `.btn`, `.btn-primary`, `.bg-primary`, `.bg-dark`, `.text-primary`, `.text-dark`, `.text-light`, `.form-control`, `.card`, `.shadow`, and `.rounded-lg` — most with `!important` to win the specificity fight. This is the strongest argument for doing both systems in one project rather than two: the SCSS only looks like independent styling, and porting Bootstrap while leaving the SCSS would leave overrides with nothing beneath them.

**Roughly 40% of the SCSS is dead.** Verified by checking every custom class name against all templates: `.card-lg`, `.filter-controls`, `.preloader`, `.overlay`, `.bg-gray`, `.text-color`, `.overflow-hidden`, `.hover-bg-primary`, and nine of the ten `.mb-*` steppings have **zero** template references. `.overlay` needs a targeted check — a naive grep matches `hover-overlay`, which *is* used; the bare class is not. Deleting these is the cheapest part of the whole project and should happen first.

**Bootstrap 5 class names have already leaked in, silently doing nothing.** `ms-3` appears at [_includes/portfolio-section.html:25](../../_includes/portfolio-section.html#L25) and [_pages/portfolio.html:32](../../_pages/portfolio.html#L32), and `fs-3` at [_includes/footer.html:22](../../_includes/footer.html#L22). BS4 uses `mr-`/`ml-` and has no `fs-*` scale, so **these three classes apply no styling on the live site today.** The two GitHub buttons in the portfolio hover overlay currently sit flush against the "view project" button. Fix during the port; expect a small intentional visual change there.

**~110 distinct Bootstrap utility classes are in use** across 22 templates. By frequency: `text-center` (31), `row` (31), `container` (28), `col-12` (23), `mb-4` (18), `text-white` (16), `img-fluid` (16), `w-100` (11), `position-relative` (10), `btn` (10). A long tail of layout, spacing, and text utilities — mechanical to translate, which is what makes a file-by-file port tractable.

## 3. The blocker that has to be solved first: GitHub Pages cannot build Tailwind

A hard dependency, not an improvement, and it must land before any CSS work is useful.

There is no `.github/` directory, no `package.json`, and `docs/` is both listed in [.gitignore](../../.gitignore) and has **zero tracked files** (`git ls-files docs` → empty). So the `destination: docs/` in [_config.yml:12](../../_config.yml#L12) only affects local builds, and GitHub Pages is running its **own classic Jekyll build** from the branch root. The classic builder runs `jekyll build` with a fixed gem allowlist and no Node — it cannot run Tailwind, and it will not run arbitrary build steps.

Two viable resolutions; take the first.

**Chosen: a GitHub Actions workflow.** Build Tailwind with Node, then Jekyll, then deploy the artifact. Requires flipping Pages source to "GitHub Actions" in repo settings — a manual step in the GitHub UI that no commit can perform, so it has to be coordinated with the merge.

**Rejected: committing the built CSS.** Keeps the classic builder working with no new infra, but puts a generated file in git, makes every content change a two-step manual process, and guarantees the committed CSS drifts out of sync with the templates. Noted only because it is the fallback if the Pages source cannot be changed.

Because Tailwind v4 scans source files and generates only the classes it finds, **a missing or stale CSS build produces an unstyled page, not an error.** Section 13 covers guarding against that.

### New file: `.github/workflows/pages.yml`

```yaml
name: Build and deploy site
on:
  push:
    branches: [version5]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run css:build      # MUST precede the Jekyll build

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1.2'     # matches .ruby-version
          bundler-cache: true
      - run: bundle exec jekyll build
        env:
          JEKYLL_ENV: production

      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: docs                # matches destination: docs/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

Action versions verified against each repo's latest release on 2026-09-11: `checkout` v7.0.1, `setup-node` v7.0.0, `configure-pages` v6.0.0, `upload-pages-artifact` v5.0.0, `deploy-pages` v5.0.1, `setup-ruby` v1.321.0 (the `v1` floating major is the documented usage for that one).

Ordering is load-bearing: `npm run css:build` writes `assets/css/main.css`, and Jekyll must copy that file into `docs/`, so Tailwind runs first.

Note `Gemfile.lock` is currently gitignored ([.gitignore:22](../../.gitignore#L22)). `bundler-cache: true` works without it but resolves fresh gems on every run, so CI can break from an upstream Jekyll release with no repo change. Recommend un-ignoring and committing `Gemfile.lock` as part of this work — a prerequisite for reproducible builds, not a nicety.

## 4. Tailwind setup

Tailwind v4 is configured in CSS, not in a `tailwind.config.js`. There is no PostCSS or Autoprefixer to install — v4 handles vendor prefixing itself.

### New file: `package.json`

```json
{
  "name": "lonewanderer27-github-io",
  "private": true,
  "scripts": {
    "css:build": "tailwindcss -i ./_tailwind/main.css -o ./assets/css/main.css --minify",
    "css:watch": "tailwindcss -i ./_tailwind/main.css -o ./assets/css/main.css --watch",
    "dev": "npm run css:build && concurrently \"npm:css:watch\" \"bundle exec jekyll serve\""
  },
  "devDependencies": {
    "@tailwindcss/cli": "^4.1.0",
    "@tailwindcss/typography": "^0.5.16",
    "tailwindcss": "^4.1.0",
    "concurrently": "^9.1.0"
  }
}
```

### Rejected: running Tailwind inside the Jekyll build via `jekyll-postcss`

The widely-cited pattern for this ([mzrn.sh, April 2022](https://mzrn.sh/2022/04/09/starting-a-blank-jekyll-site-with-tailwind-css-in-2022/)) wires PostCSS into Jekyll's own asset pipeline with the `jekyll-postcss` gem: add the gem, add `postcss.config.js`, put front matter at the top of `assets/css/main.css`, set `postcss: cache: false` in `_config.yml`, and then a single `bundle exec jekyll serve --livereload` builds both. Genuinely more elegant than this plan's two-process setup, and worth stating plainly: **it gets one command and working livereload where this plan needs `concurrently`.**

Rejected anyway, because the gem is abandoned:

- Last release **v0.5.0, 2021-09-11**; last commit to the repo **2021-11-22**; 12 open issues. That predates Tailwind v3.0 (Dec 2021) entirely, let alone v4.
- Its final substantive commit added an "Alternatives" section to its own README — the author pointing users elsewhere.
- There is an open issue from 2022-03-15, *"Running `bundle exec jekyll serve` freezes on 'Requiring: jekyll-postcss'"*, which is the category of failure that costs an afternoon and has no upstream fix coming.
- The article's specifics are all v3-era and would need translating regardless: `tailwind.config.js` with a `content` array becomes CSS-side `@source`, `@tailwind base/components/utilities` becomes `@import "tailwindcss"`, and v4 makes `autoprefixer` redundant since it prefixes itself. The PostCSS plugin also moved packages — it is `@tailwindcss/postcss` in v4, configured as `{ plugins: { "@tailwindcss/postcss": {} } }` — so even the PostCSS route is not the article's route any more.

Taking the standalone CLI instead costs one real thing, and it is the reason step C in section 13 adds a CSS-size assertion in CI: because Tailwind runs *beside* Jekyll rather than inside it, the output can go stale or missing independently of a successful Jekyll build, and the symptom is an unstyled page rather than an error. The gem's approach makes that failure structurally impossible. That is a fair trade for not depending on five-year-abandoned code, but it is a trade, not a free win.

If a single-command workflow is wanted later without the dead gem, the move is a `Makefile` or a `bin/dev` script wrapping the same two processes — not reviving `jekyll-postcss`.

### Why the source lives in `_tailwind/`

Jekyll ignores top-level directories beginning with `_`, so `_tailwind/main.css` is never copied to the output and never touched by Jekyll's Sass pipeline. This matters during the transition: Jekyll's built-in Sass would choke on `@theme` and `@utility`, and the `sass:` block in [_config.yml:39-41](../../_config.yml#L39-L41) processes everything under `assets/scss`. Keeping Tailwind's input outside that tree means the two pipelines never see each other's files, which is what lets sections 6–9 proceed incrementally with both stylesheets loaded.

Add to `.gitignore`:

```
# Tailwind build output
assets/css/main.css
node_modules/
```

### New file: `_tailwind/main.css`

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

/* Scanner roots. Jekyll's docs/ output is gitignored so v4 already skips it,
   but be explicit so a stale build can never contribute phantom classes.
   _data is included because section 9 puts reusable class strings in YAML. */
@source "../_includes";
@source "../_layouts";
@source "../_pages";
@source "../_posts";
@source "../_data";
@source "../index.html";
@source "../404.html";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Brand — from assets/scss/_variables.scss */
  --color-primary:      #41228e;
  --color-primary-lite: #5a2fc4;  /* was lighten($primary-color, 10%) */
  --color-secondary:    #2bfdff;
  --color-body-text:    #4c4c4c;
  --color-muted:        #999999;
  --color-line:         #c7c7c7;
  --color-ink:          #222222;  /* was the .bg-dark override */
  --color-haze:         #eaeaea;  /* was $gray */

  /* Breakpoints pinned to Bootstrap 4's, so template diffs are pure
     class translation with no breakpoint shift mixed in. See section 6. */
  --breakpoint-sm:  576px;
  --breakpoint-md:  768px;
  --breakpoint-lg:  992px;
  --breakpoint-xl: 1200px;

  /* Type */
  --font-primary:   'Roboto', ui-sans-serif, system-ui, sans-serif;
  --font-secondary: 'Figtree', ui-serif, Georgia, serif;

  /* Fluid headings — replaces the fixed px + @include desktop pairs
     in assets/scss/_typography.scss */
  --text-h1: clamp(2.75rem, 6vw, 5rem);     /* 44px → 80px */
  --text-h2: clamp(2.25rem, 5vw, 3.75rem);  /* 36px → 60px */
  --text-h3: 2.5rem;
  --text-h4: 1.375rem;
  --text-h5: 1.125rem;
  --text-h6: 0.875rem;

  /* Custom shadows from _common.scss and _homepage.scss */
  --shadow-soft: 0 18px 39.1px 6.9px rgb(224 241 255 / 0.34);
  --shadow-lift: 0 18px 40px 8px rgb(224 241 255 / 0.54);
  --shadow-down: 0 0 80.75px 14.25px rgb(224 241 255 / 0.34);

  /* The skill-meter wave from _homepage.scss */
  --animate-wave:      wave  6s linear infinite;
  --animate-wave-slow: wave 10s linear -5s infinite;
  @keyframes wave {
     50% { transform: translateX(-50%) rotate(180deg); }
    100% { transform: translateX(-50%) rotate(360deg); }
  }
}

/* Bootstrap's stepped container widths, reproduced exactly. See section 6. */
@utility container-page {
  width: 100%;
  margin-inline: auto;
  padding-inline: 15px;
  @media (width >=  576px) { max-width:  540px; }
  @media (width >=  768px) { max-width:  720px; }
  @media (width >=  992px) { max-width:  960px; }
  @media (width >= 1200px) { max-width: 1140px; }
}

@layer base {
  /* Only what Preflight does not already cover — see section 8. */
}
```

Two notes on values above. `lighten($primary-color, 10%)` is computed once to `#5a2fc4` rather than left as a runtime function — verify against a build of the current site before committing, since that value drives every button hover and active state. And the `wave` keyframes deliberately re-declare `translateX(-50%)` inside each step: the element carries `-translate-x-1/2` for its un-animated first frame, and an animation setting `transform` overrides that utility wholesale, so dropping the translate from the keyframes would make the waves jump sideways the instant they animate.

## 5. Name collisions that will silently break layout

**The highest-risk item in the project, and easy to miss because nothing errors.**

[assets/scss/_common.scss](../../assets/scss/_common.scss) defines `.mb-10` through `.mb-100` as **literal pixel values** with `!important` — `.mb-80 { margin-bottom: 80px !important; }`. Tailwind's default scale reads the same names as `0.25rem` multiples:

| Class | Current meaning | Tailwind v4 meaning | Error |
|---|---|---|---|
| `mb-80` | 80px | 20rem = **320px** | 4× |
| `mb-100` | 100px | 25rem = 400px | 4× |
| `mb-10` | 10px | 2.5rem = 40px | 4× |

Only `mb-80` is actually used — 3 occurrences, in [_includes/certificates-section.html:12](../../_includes/certificates-section.html#L12), [_includes/education-section.html:12](../../_includes/education-section.html#L12), and a commented-out line in [_includes/contact-section.html:16](../../_includes/contact-section.html#L16). The other nine are dead.

Handling: delete all ten definitions, and rewrite the three real `mb-80` uses to `mb-20` (Tailwind's 5rem = 80px). Do this **as its own first commit, before Tailwind is installed.** While the old SCSS is still authoritative, `mb-20` means 20px, so a direct edit would be wrong for as long as the old stylesheet is live. Cleanest sequencing: in the pre-work commit replace the three `mb-80` with a one-off class defined in SCSS as `80px`, then in the Tailwind phase that class becomes `mb-20`. Never leave a window where a `mb-*` class means two different things depending on stylesheet load order.

Three more overrides collide the same way and need renaming rather than translating:

- `.shadow` (custom soft blue glow) vs Tailwind `shadow` (neutral grey) → `shadow-soft`
- `.rounded-lg` (15px) vs Tailwind `rounded-lg` (0.5rem = 8px) → `rounded-[15px]`
- `.bg-dark` (`#222222`) vs no Tailwind equivalent → `bg-ink`

And one that collides by *absence*: `.container`. Tailwind v4 ships a `container` utility but dropped v3's centering and padding config, so `container` alone is not Bootstrap's `.container`. Hence `container-page` in section 4 rather than trying to redefine `container`.

## 6. Layout: grid, container, breakpoints

Bootstrap 4's grid is flexbox with negative margins: `.row` is `display:flex; flex-wrap:wrap; margin: 0 -15px`, and each `.col-*` carries `padding: 0 15px`, producing 30px gutters. Replicating that with negative margins works but inherits the same overflow quirks. Since modernization is in scope, translate to CSS Grid, which expresses gutters directly:

| Bootstrap 4 | Tailwind |
|---|---|
| `row` | `grid grid-cols-12 gap-x-[30px]` |
| `col-12` | `col-span-12` |
| `col-lg-4` | `col-span-12 lg:col-span-4` |
| `col-lg-3 col-sm-6` | `col-span-12 sm:col-span-6 lg:col-span-3` |
| `col-lg-10 mx-auto` | `col-span-12 lg:col-span-10 lg:col-start-2` |
| `col-lg-8 mx-auto` | `col-span-12 lg:col-span-8 lg:col-start-3` |
| `container` | `container-page` (section 4) |
| `justify-content-around` | `justify-around` (flex rows only — see below) |

Two rows must **not** become grid:

1. **`.row.shuffle-wrapper`** ([_includes/portfolio-section.html:11](../../_includes/portfolio-section.html#L11), [_pages/portfolio.html:19](../../_pages/portfolio.html#L19)). Shuffle.js absolutely-positions its items and computes offsets from the container, so a grid parent breaks it. Keep as `flex flex-wrap -mx-[15px]` with items at `w-full sm:w-1/2 lg:w-1/3 px-[15px]` until Shuffle is replaced in section 10.
2. **Rows using `justify-content-around`** ([_includes/experience-section.html:6](../../_includes/experience-section.html#L6), [_includes/work-process-section.html:6](../../_includes/work-process-section.html#L6)). Distribution semantics differ between flex and grid; keep flex for a faithful port.

Do not swap `container-page`'s stepped widths for a fluid `max-w-[1140px]` in the same pass — the steps are visible at tablet sizes and changing them makes every regression check ambiguous. Fine follow-up once the port is verified.

**Breakpoint semantics invert.** The SCSS mixins in [assets/scss/_mixins.scss](../../assets/scss/_mixins.scss) are all `max-width` (mobile-last): `mobile-xs` ≤400, `mobile` ≤575, `tablet` ≤767, `desktop` ≤991, `desktop-lg` ≤1200. Tailwind is `min-width` (mobile-first). Every ported media query flips — `@include mobile { padding-top: 20px }` becomes a base `py-5` with `sm:py-20` layered on, not a `max-sm:` variant. Reaching for `max-sm:` to preserve the original shape is the tempting wrong move; it produces rules that fight each other once more than one breakpoint is involved.

Bootstrap 4's `sm` is 576px against Tailwind's 640px, and `lg` 992px against 1024px. Section 4 **pins Tailwind's breakpoints to Bootstrap's** so no template diff mixes a class translation with a breakpoint change. Unpin later, deliberately, as its own commit.

## 7. Bootstrap utility → Tailwind map

| Bootstrap 4 | Tailwind v4 | Notes |
|---|---|---|
| `img-fluid` | *(delete)* | Preflight already sets `max-width:100%; height:auto` on `img` |
| `w-100` / `h-100` | `w-full` / `h-full` | |
| `position-relative` / `-absolute` / `fixed-top` | `relative` / `absolute` / `fixed top-0 inset-x-0` | |
| `d-flex` / `d-block` / `d-none` / `d-inline-block` | `flex` / `block` / `hidden` / `inline-block` | |
| `d-unset` | *(delete)* | only on `.client-logo`; set width directly |
| `align-items-center` / `justify-content-center` | `items-center` / `justify-center` | |
| `justify-content-between` | `justify-between` | toggled by JS in `emailForm.js` |
| `text-center` / `text-white` / `mx-auto` / `mb-0` | identical | |
| `text-dark` | `text-black` | custom override was `#000` |
| `text-light` | `text-muted` | custom override was `#999`, **not** Bootstrap's `#f8f9fa` |
| `text-primary` | `text-primary` | via `@theme` token |
| `bg-primary` / `bg-white` / `bg-light` / `bg-dark` | `bg-primary` / `bg-white` / `bg-neutral-100` / `bg-ink` | |
| `mb-4` | `mb-6` | BS4 `mb-4` = 1.5rem |
| `mb-5` / `p-5` / `py-5` / `px-4` | `mb-12` / `p-12` / `py-12` / `px-6` | BS4 `5` = 3rem, `4` = 1.5rem |
| `mb-1` / `mb-3` / `mt-3` / `pt-3` | `mb-1` / `mb-4` / `mt-4` / `pt-4` | BS4 `1` = .25rem, `3` = 1rem |
| `mr-3` / `mr-5` / `mr-lg-5` / `ml-5` / `ml-auto` | `me-4` / `me-12` / `lg:me-12` / `ms-12` / `ms-auto` | **logical properties** — RTL-safe |
| `ms-3` *(currently inert)* | `ms-4` | latent bug from section 2, now actually applies |
| `fs-3` *(currently inert)* | `text-3xl` | latent bug from section 2 |
| `mb-md-0` / `mb-lg-0` | base `mb-6` + `md:mb-0` / `lg:mb-0` | mobile-first inversion |
| `rounded` / `rounded-circle` / `rounded-top` | `rounded` / `rounded-full` / `rounded-t` | |
| `rounded-lg` | `rounded-[15px]` | custom 15px, **not** Tailwind's 8px |
| `border-top` / `border-dark` / `border-white` | `border-t` / `border-ink` / `border-white` | |
| `float-left` | `float-start` | in `_layouts/post.html` |
| `list-unstyled` | *(delete)* | Preflight already resets lists |
| `shadow` | `shadow-soft` | see section 5 |
| `card`, `card-body`, `card-title`, `card-text`, `card-footer`, `card-img-top` | utilities via a Liquid partial — section 9 | borders already stripped to 0 in `_common.scss` |
| `form-control` | utilities — section 9 | heavily customized already |
| `btn`, `btn-primary`, `btn-light`, `btn-dark`, `btn-transparent`, `btn-sm`, `btn-xs` | utilities via a Liquid partial — section 9 | |
| `navbar*`, `nav-item`, `nav-link`, `collapse` | hand-built — section 10 | |
| `btn-group`, `btn-group-toggle` | `peer-checked:` — section 10 | |
| `alert alert-success` | inline utilities | one use, in contact form |
| `active` | context-dependent | nav state and service card; becomes a `data-` attribute |

Note how many rows are *(delete)*: Preflight already covers `img-fluid` and `list-unstyled`, and its heading reset is why section 8 has to touch every heading.

## 8. SCSS → Tailwind, file by file

Everything in `assets/scss/` is accounted for. **Delete outright (zero template references):** `.card-lg`, `.filter-controls`, `.preloader`, `.overlay`, `.bg-gray`, `.text-color`, `.overflow-hidden`, `.hover-bg-primary`, `.mb-{10,20,30,40,50,60,70,90,100}`.

| File | Destination |
|---|---|
| [_variables.scss](../../assets/scss/_variables.scss) | → `@theme` tokens (section 4). Delete. `$icon-font: 'themify'` stays vendor-owned (section 1). |
| [_mixins.scss](../../assets/scss/_mixins.scss) | → Tailwind breakpoint variants. Delete. `@mixin size()` → the `size-*` utility. |
| [_typography.scss](../../assets/scss/_typography.scss) | → `@theme` type tokens + utilities **on every heading in every template**. See below — the largest mechanical change in the project. The `@import url(...)` for Playfair/Roboto is a render-blocking import inside CSS; move to a `<link>` in `head.html` or drop Playfair, which nothing references any more. |
| [_buttons.scss](../../assets/scss/_buttons.scss) | → utility strings behind a Liquid partial (section 9). Note `btn-light`/`btn-dark` come from Bootstrap today and need explicit definitions once it is gone. Drop the `outline: 0` / `box-shadow: none !important` on `:focus` — see section 10. |
| [_common.scss](../../assets/scss/_common.scss) | Three-way split: **Preflight already covers** the `img`, `ol/ul`, and most `a` resets — delete them outright. **`::selection`** → the `selection:` variant on `<body>` (`selection:bg-primary-lite selection:text-white`), no base rule needed. Body defaults → utilities on the `<body>` tag in `default.html`. `.section` → `py-20 sm:py-5`-shaped utilities; `.section-title` → `mb-20 font-secondary`; `.bg-cover` → `bg-cover bg-center bg-no-repeat`; `.icon` → `text-[45px]`; `.icon-bg` → `size-[100px] leading-[100px] text-center`; the `mb-*` steppings deleted per section 5. The `@for` loops hiding `.bg-shape-4..7` and `#l5..#l9` on small screens become `hidden sm:block` in the templates. |
| [templates/_navigation.scss](../../assets/scss/templates/_navigation.scss) | Rewrite with the nav in section 10. `.nav-bg` becomes a `data-scrolled` attribute driven by `data-[scrolled=true]:` variants rather than a JS-toggled class with its own rule. |
| [templates/_hero-area.scss](../../assets/scss/templates/_hero-area.scss) | The nine `#l1`–`#l9` absolute offsets become arbitrary-value utilities on each layer (`absolute top-[190px] left-[-250px]`), which puts the numbers next to the images they position and lets the ID selectors go. `.layer-bg` → `absolute bottom-0 left-0`. |
| [templates/_homepage.scss](../../assets/scss/templates/_homepage.scss) | The interesting file. `@keyframes rotate` → `@theme` (section 4). `.wave`'s two animated pseudo-elements → `before:`/`after:` variants; `.hover-wrapper` → `group` + `group-hover:`; `.shadow-down::before` → `before:` utilities; `.footer-section`/`.section-on-footer` → `pt-[200px]` / `-mb-[250px]`; `.edu-bg-image` → `absolute left-0 top-[-300px] -z-10`. Worked examples below. |
| [templates/_about.scss](../../assets/scss/templates/_about.scss) | `.page-title-alt` padding → responsive utilities; `.bg-shape-*` offsets → per-image utilities; `.border-thick` → `border-[10px]`; `.drag-lg-top` → `lg:-mt-[230px]`. |
| [templates/_portfolio.scss](../../assets/scss/templates/_portfolio.scss) | `.page-title` padding → responsive utilities; seven `.bg-shape-*` offsets → per-image utilities; `@include mobile { .btn-group { flex-direction: column } }` → `flex-col sm:flex-row` on the filter group. |
| [templates/_blog.scss](../../assets/scss/templates/_blog.scss) | `.content` and `blockquote > p` style markdown bodies with no class hooks → `prose` (section 1). Configure the blockquote and `strong` treatment through `prose` modifiers rather than reinstating child selectors. |
| [style.scss](../../assets/scss/style.scss) | Delete. Move the `@view-transition { navigation: auto }` block to `_tailwind/main.css`. |

Then delete the `sass:` block from [_config.yml:39-41](../../_config.yml#L39-L41), remove the `style.css` link from [_includes/head.html:31](../../_includes/head.html#L31), and delete `assets/scss/` entirely.

### The heading consequence, stated plainly

`_typography.scss` styles bare `h1`–`h6` selectors. Preflight **unsets** heading sizes and weights, so once the SCSS is gone every heading renders at body size until a utility is added. This touches every heading in every template — the single largest mechanical edit in the project, and the most likely source of a "half the site looks broken" moment mid-migration.

Two ways to handle it. **Recommended:** add `text-h2 font-secondary` style utilities at each heading, since it keeps the promise of section 1 and makes each template self-describing. **The pragmatic alternative** is a small `@layer base` block restyling `h1`–`h6` exactly as `_typography.scss` does, which is a deliberate, documented impurity that removes a large class of risk. If schedule pressure appears, this is the first place to spend it — take the base block, note it, move on. Do not discover this trade-off halfway through template migration; decide before step F.

### Worked examples for the non-obvious conversions

The skill meter's two animated pseudo-elements (`.wave`):

```html
<div class="absolute inset-0
            before:content-[''] before:absolute before:bottom-0 before:left-1/2 before:z-10
            before:size-[800px] before:-translate-x-1/2 before:rounded-[45%]
            before:bg-white/40 before:animate-wave
            after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:z-20
            after:size-[800px] after:-translate-x-1/2 after:rounded-[47%]
            after:bg-white/90 after:animate-wave-slow"></div>
```

The portfolio hover overlay (`.hover-wrapper` / `.hover-overlay` / `.hover-content`):

```html
<div class="group relative overflow-hidden rounded">
  <img class="w-full scale-110 transition duration-300 group-hover:scale-100" …>
  <div class="absolute inset-0 rounded-[inherit] bg-black/30
              invisible opacity-0 transition duration-300
              group-hover:visible group-hover:opacity-100">
    <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center">…</div>
  </div>
</div>
```

`rounded-[inherit]` is the literal translation of `border-radius: inherit` and matters here — without it the overlay's corners square off against the rounded image.

The contact card's outer glow (`.shadow-down::before`):

```html
<div class="relative before:content-[''] before:absolute before:inset-0 before:-z-10
            before:shadow-down">…</div>
```

## 9. Repetition without `@apply`

Section 1 bans `@apply`, which leaves a real question: `btn` appears 10 times and `card` 4, and their utility strings are long. Restating a 12-class button string by hand at every call site is how a pure-utility codebase rots.

**The Jekyll-native answer is a parameterized include**, which is strictly better than `@apply` here because the utilities stay visible to Tailwind's scanner as literal strings in one file:

```liquid
{%- comment -%} _includes/ui/button.html {%- endcomment -%}
{%- assign base = "inline-block rounded-[5px] border-0 font-secondary font-semibold capitalize transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" -%}
{%- case include.size -%}
  {%- when "sm" -%}{%- assign size = "px-[30px] py-[10px] text-[15px]" -%}
  {%- when "xs" -%}{%- assign size = "px-[10px] py-[5px] text-[15px]" -%}
  {%- else -%}     {%- assign size = "px-[44px] py-4 text-[22px]" -%}
{%- endcase -%}
{%- case include.variant -%}
  {%- when "transparent" -%}{%- assign tone = "bg-transparent font-bold text-primary" -%}
  {%- when "light" -%}      {%- assign tone = "bg-white text-ink hover:bg-neutral-100" -%}
  {%- when "dark" -%}       {%- assign tone = "bg-ink text-white hover:bg-black" -%}
  {%- else -%}              {%- assign tone = "bg-primary text-white hover:bg-primary-lite" -%}
{%- endcase -%}
<a href="{{ include.href }}" class="{{ base }} {{ size }} {{ tone }}">{{ include.label }}</a>
```

Called as `{% include ui/button.html variant="light" size="sm" href=item.url label="view project" %}`.

Two things this gets right that `@apply` does not: the utility list is a single source of truth *without* creating a CSS abstraction layer that has to be maintained alongside the utilities, and variants compose by Liquid string concatenation rather than by CSS specificity. Do the same for the card shell, the form field, and the section wrapper — the four things that actually repeat. Anything used once or twice gets its utilities inline; a partial for a single call site is worse than the repetition it avoids.

One scanner requirement this creates: because these strings live in `_includes` (and section 4 also declares `_data`), both must be in the `@source` list. They are. **Never build a class name by concatenating fragments** (`"mb-" | append: n`) — v4 scans for complete literal strings and will not generate `mb-4` from parts, and this fails silently, which is the same failure mode as a bad `@source`.

## 10. JS-coupled styling

### Navbar collapse

Replace `data-toggle="collapse"` with an explicit `aria-expanded` toggle:

```js
const toggle = document.querySelector('[data-nav-toggle]');
const menu = document.getElementById('navigation');
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  menu.hidden = open;
});
```

Drive visibility off the `hidden` attribute so the menu is genuinely removed from the accessibility tree and tab order when closed, paired with `lg:!block` so desktop ignores the attribute. This is an accessibility improvement over Bootstrap 4's height-animated collapse, which leaves the menu focusable while visually closed. The `navbar-toggler-icon` background-image hamburger becomes an inline SVG.

### Portfolio filter — no JavaScript at all

[_pages/portfolio.html:11-19](../../_pages/portfolio.html#L11-L19) uses `btn-group-toggle` + `data-toggle="buttons"`, whose only job is moving `.active` between labels as radios change. `peer` does this in CSS:

```html
<label class="cursor-pointer">
  <input type="radio" name="shuffle-filter" value="all" checked class="peer sr-only">
  <span class="… peer-checked:bg-primary-lite peer-checked:font-bold
               peer-focus-visible:ring-2 peer-focus-visible:ring-primary">All</span>
</label>
```

`sr-only` rather than `hidden` keeps the radio focusable. The `peer-focus-visible:ring-2` is a genuine fix, not decoration: `_buttons.scss` currently sets `outline: 0` and `box-shadow: none !important` on `.btn:focus`, so **the site has no visible keyboard focus indicator on any button today.** Dropping that suppression is part of the port.

### Purity forces the slick and Shuffle question

This is the finding that most changes the shape of the plan versus a Bootstrap-only port.

`_common.scss` currently contains a block styling `.slick-dots`, `.slick-slide`, and `.slick-list` — slick's own generated class names. Those elements are created by slick at runtime and never appear in any template, so **no utility can reach them.** The same applies to Shuffle's inline positioning. So the goal of "no hand-authored CSS" cannot be met while slick and Shuffle remain: the only options are a hand-written selector block (impure) or replacing the libraries.

| Behavior | Replacement |
|---|---|
| `.testimonial-slider` (slick) | CSS scroll-snap — removes slick **and** jQuery |
| `.client-logo-slider` (slick, autoplay, 4 responsive breakpoints) | CSS scroll-snap + a CSS marquee animation |
| Shuffle filter + masonry | CSS Grid + ~20 lines vanilla toggling `hidden`; also unblocks grid for the portfolio rows in section 6 |
| Sticky nav (`.nav-bg` on scroll > 100) | `IntersectionObserver` on a sentinel, setting `data-scrolled` |
| `[data-background]` / `[data-color]` / `[data-progress]` → inline styles | CSS custom properties set in the template (`style="--bg: url(…)"`), removing the JS entirely |
| Hero mouse parallax over `#l2`–`#l9` | ~25 lines vanilla, wrapped in `matchMedia('(prefers-reduced-motion: reduce)')` |

**Recommendation unchanged, reasoning strengthened:** still do this as its own PR after the styling port lands and is verified, because combining a CSS rewrite with a JS rewrite makes any regression ambiguous between the two. But it is now a *required* step for the stated goal rather than an optional cleanup, so plan for it rather than treating it as someday-work. The honest interim state after step G is "pure Tailwind except for one slick block", and that should be written into the commit message rather than quietly ignored.

Two latent bugs to fix while rewriting rather than port forward:

- The sticky-nav handler reads `$(".navigation").offset().top` unguarded — it throws on any page without `.navigation`.
- `window.onload` is assigned in **both** `script.js` and `emailForm.js`, so the second one loaded wins. `emailForm.js` loads last ([_includes/footer.html:52](../../_includes/footer.html#L52)), which means `script.js`'s `window.onload` — **the entire hero parallax — never runs on any page today.** Use `addEventListener`.

Also noted, unrelated to styling: the EmailJS public key and service/template IDs are hardcoded in [emailForm.js:19-22](../../assets/js/emailForm.js#L19-L22). EmailJS public keys are designed to be client-visible, so this is not a leak, but it does mean anyone can post to the form endpoint — worth checking EmailJS's allowed-origins setting separately.

## 11. Modernization, itemized

Pixel-faithful port plus these, each independently revertable:

1. **Dark mode.** The `@custom-variant dark` is already declared in section 4; the work is a `dark:` pass over surfaces. The existing palette is light-only, so this means choosing dark values for `--color-primary` surfaces, `bg-white` cards, and the three blue glow shadows (which read as haze on dark). Real design work, not a mechanical pass — its own commit, and be willing to cut it.
2. **Fluid type** via `clamp()` (section 4), replacing fixed-px + `@include desktop` pairs.
3. **`prefers-reduced-motion`** guards on the hero parallax, the wave keyframes, and the logo marquee. Currently unguarded — a real accessibility gap.
4. **Logical properties** (`me-`/`ms-`/`float-start`) instead of `mr-`/`ml-`/`float-left`.
5. **Fix the three inert classes** — `ms-3` ×2, `fs-3` ×1 (section 2).
6. **Restore focus-visible rings** (section 10).
7. **Fix the `window.onload` clobber** so the hero parallax actually runs (section 10).
8. **Delete the ~40% dead SCSS** (section 8).
9. **`prose` for post bodies** replacing hand-rolled child selectors (section 8).
10. **Container queries** for the card grids, so cards respond to their column rather than the viewport. Optional; skip if section 6's grid work is already large.

Items 5, 6, and 7 change visible behavior. Call them out in the PR description so a reviewer diffing screenshots does not file them as regressions.

## 12. Commit conventions

The existing history already follows [Conventional Commits](https://www.conventionalcommits.org/) (`feat: add banner image support…`, `docs(posts): remove some posts`), and [jekyll-to-astro-migration.md](jekyll-to-astro-migration.md) section 12 sets the same rules for the migration that follows this one. This plan uses that vocabulary rather than inventing a second dialect, so `git log` reads consistently across both projects.

**Format.** `<type>(<scope>)!: <subject>`, subject in the imperative mood and lowercase, no trailing period, ideally under 50 characters. A body only when the "why" is not obvious from the subject, wrapped at 72 columns. Footers carry `BREAKING CHANGE:` and the `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` attribution line.

**Never use `style:` for CSS work.** This is the one trap specific to a styling project, and it is easy to fall into for an entire branch before noticing. In Conventional Commits, `style` means *formatting that does not affect meaning* — whitespace, semicolons, quote style. A commit that converts Bootstrap classes to Tailwind changes the stylesheet that ships, so it is `refactor` (output unchanged) or `feat`/`fix` (output deliberately changed), never `style`. Reserve `style:` for genuine no-op reformatting, of which this plan has none.

**Types, and how they apply here.** As on the Astro plan, the distinction that matters most is `refactor` versus `feat`: nearly every commit is a *port* whose rendered output is meant to be identical, so `refactor` is the honest type even though large amounts of markup change.

| Type | Used for |
|---|---|
| `build` | Tailwind toolchain — `package.json`, `_tailwind/main.css` config directives, `Gemfile.lock`, dependency changes |
| `refactor` | Converting existing templates and SCSS to Tailwind with no intended output change; deleting dead rules |
| `feat` | Genuinely new capability — dark mode, the `prose` treatment, the reusable UI partials |
| `fix` | The pre-existing bugs: the two inert BS5 classes, suppressed focus rings, the `window.onload` clobber, the unguarded `offset().top` |
| `perf` | The two payload-reduction commits — dropping Bootstrap and dropping jQuery |
| `ci` | The GitHub Pages workflow and the CSS-size assertion |
| `chore` | `.gitignore`, config housekeeping |
| `docs` | `CLAUDE.md`, this plan |

`perf` is used more here than on the Astro plan, where it was reserved. It is the right type for the teardown commits: the site renders identically, so `refactor` would be defensible, but the entire point of those commits is removing 202 KB and then 84 KB of payload, and `perf` is the type that says so.

**Scope vocabulary.** Fixed set mirroring the Jekyll layout, so scopes stay predictable: `deps`, `config`, `styles`, `theme`, `includes`, `layouts`, `pages`, `ui`, `scripts`, `assets`, `ci`. Note these differ from the Astro plan's set (`components` rather than `includes`, no `types`/`data`) because each mirrors its own directory layout; that is intended, not drift.

**Breaking changes.** Exactly one commit is breaking — adding the Actions workflow, because it requires a manual repository-settings change that no committed code can perform:

```
ci!: build and deploy via github actions

The classic GitHub Pages Jekyll build cannot run Node, so it cannot
build Tailwind. Moves the build into CI: Tailwind first, then Jekyll,
then an artifact deploy.

BREAKING CHANGE: GitHub Pages must be switched from branch-based
building to "GitHub Actions" in repository settings, or the site will
serve stale content after this commit.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
```

**Keep fixes out of refactors.** When converting a template surfaces one of the known bugs, land the faithful port first and the correction as its own `fix:` commit immediately after. Mixing them makes the diff that changed rendered output indistinguishable from the diff that merely changed class names — which defeats the screenshot verification this whole plan rests on. The three `fix:` commits in step F exist specifically so a reviewer diffing screenshots can see exactly which commit was allowed to change pixels.

**Atomicity and green commits.** Each commit does one thing and is individually revertable. Unlike the Astro migration, this plan can keep the site *building* at every commit, because both stylesheets load simultaneously from step D until step G — that overlap is what makes per-template commits safe. It cannot keep the site *visually correct* at every commit mid-step-F, which is expected. The green points are the step boundaries below. Merge with a merge commit or rebase, never a squash, so the per-template granularity survives.

**Enforcement is deliberately not set up here.** The Astro plan adds commitlint and husky as its final step, after its migration lands. Adding it in this project would mean the hook sits between you and every commit of a long mechanical port, for no benefit beyond what following the convention by hand already gives. Follow the convention manually; let the Astro plan's step J install the enforcement.

## 13. Commit sequence and verification

Steps are the green boundaries; commits within a step are individually revertable.

### Step A — reproducible builds

```
build(deps): track gemfile.lock for reproducible builds
```

Un-ignores and commits `Gemfile.lock`. **Gate:** `bundle exec jekyll build` clean.

### Step B — clear the ground before Tailwind exists

```
refactor(styles): remove dead scss rules
refactor(styles): replace mb-80 with an explicit gap class
```

The first deletes the ~40% dead SCSS from section 8. The second needs a body, because its "why" is entirely invisible from the subject:

```
refactor(styles): replace mb-80 with an explicit gap class

.mb-80 means 80px here but 320px in Tailwind's default scale, so the
name cannot survive the migration. Renaming now, while the SCSS is
still authoritative, avoids a window where the class means two
different things depending on stylesheet load order.
```

**Gate:** visual diff on `/about` plus the education and certificates sections.

### Step C — build infrastructure

The `ci!:` commit from section 12, then:

```
ci: fail the build if the tailwind output is suspiciously small
```

**Gate:** deploy succeeds and the site is byte-identical to before.

### Step D — Tailwind alongside the existing CSS

```
build(deps): add tailwind v4 toolchain
build(theme): add tailwind entrypoint with design tokens
chore: ignore tailwind output and node_modules
build(styles): load tailwind output alongside existing css
```

**Gate:** site visually unchanged — Tailwind is emitting almost nothing yet, which is exactly what step D should look like.

### Step E — decide, then build the shared pieces

Resolve the heading question from section 8 **before** writing any template commit. If the base-layer fallback is taken, that decision is its own commit:

```
refactor(theme): port heading scale to the base layer
```

Then the shared partials from section 9:

```
feat(ui): add button, card, field and section partials
```

`feat` rather than `refactor` because these files are new reusable capability, even though their purpose is to serve a port. **Gate:** a button and a card render identically to their SCSS versions.

### Step F — templates, one per commit, leaf-first

Order: `social-icon` → `post` → `client-slider` → the section includes → `header`/`footer` → layouts → pages. Message pattern:

```
refactor(includes): convert hero section to tailwind
refactor(includes): convert testimonial section to tailwind
refactor(layouts): convert default layout to tailwind
refactor(pages): convert portfolio page to tailwind
```

Interleaved, immediately after the template that surfaces each one:

```
fix(includes): apply intended margin to portfolio github button
fix(includes): apply intended size to footer social icons
fix(styles): restore visible keyboard focus on buttons
```

The first two are the inert `ms-3`/`fs-3` classes from section 2 — they were doing nothing, so these commits genuinely change pixels. **Gate:** screenshot diff per commit.

### Step G — teardown

```
perf(styles): drop bootstrap and the scss pipeline
chore(config): remove sass build configuration
```

The first deletes `assets/plugins/bootstrap/`, `assets/scss/`, the two manifest lines in `_data/plugins.yml`, and the `style.css` link; body should record the −202 KB and note that one slick block remains, so the interim impurity is in the history rather than forgotten. **Gate:** site identical.

### Step H — modernization

```
feat(styles): add dark mode
fix(styles): respect prefers-reduced-motion on animations
refactor(includes): use logical properties for inline spacing
feat(styles): style post bodies with the typography plugin
refactor(styles): use container queries for card grids
```

Each independently revertable, which matters most for dark mode — section 11 flags it as the item to cut under schedule pressure. **Gate:** deliberate, reviewed changes.

### Step I — separate PR

```
refactor(scripts): replace slick sliders with css scroll-snap
refactor(scripts): replace shuffle with css grid filtering
fix(scripts): guard dom lookups and stop onload clobbering
perf(scripts): remove jquery
```

The `fix` commit is where the hero parallax starts working for the first time (section 10) — call that out in its body, since it will read as an unexplained visual change otherwise.

### Pull request titles

- Steps A–H: `refactor(styles)!: convert all styling to tailwind` — breaking, because it contains the `ci!` commit and its manual settings change.
- Step I: `refactor(scripts): replace jquery plugins with native css and js`

### Verification, in order of value

1. **Screenshot baseline before step B.** Capture `/`, `/about`, `/portfolio`, `/blog`, a post, `/contact`, and `/404.html` at 375 / 768 / 1024 / 1440 px. There is no test suite in this repo, so screenshots *are* the test suite, and without them the port is unverifiable.
2. **The CSS-size assertion from step C.** Because a missing Tailwind build, a bad `@source`, or a concatenated class name all yield an unstyled page rather than a failure, fail the build if `assets/css/main.css` is under ~5 KB. Cheap insurance against the one failure mode that ships broken silently.
3. **A heading spot-check immediately after step F's first commit.** Preflight's heading reset (section 8) is the most likely thing to go wrong at scale; catch it on file one, not file twenty.
4. **Per-commit manual check** during step F: portfolio and service card hover states, the mobile hamburger, the portfolio filter, both sliders, form focus states, and the `section-on-footer` negative-margin overlap — the most fragile layout in the site.
5. **Keyboard pass** over nav and portfolio filter after step H.

Expected outcome: 134 KB Bootstrap CSS + 68 KB Bootstrap JS + ~12 KB SCSS → roughly 15–25 KB of generated Tailwind and no framework JS. A further 84 KB when jQuery goes in step I.

## 14. How this composes with the Astro plan

[jekyll-to-astro-migration.md](jekyll-to-astro-migration.md) originally set a scope boundary that "Bootstrap, the SCSS, and every class name in the templates are carried across unchanged." That plan has been amended to defer to this one; its reasoning — don't mix a framework migration with a styling rewrite — is correct and applies just as much in reverse.

Doing Tailwind first means:

- **The Astro port inherits Tailwind templates and swaps `@tailwindcss/cli` for `@tailwindcss/vite`.** Per [Astro's styling guide](https://docs.astro.build/en/guides/styling/#add-tailwind-4), on Astro ≥5.2 this is one command — `npx astro add tailwind` — which installs `@tailwindcss/vite`, registers it, and creates `src/styles/global.css` containing `@import "tailwindcss";`. That file is imported once from the layout (`import "../styles/global.css";` in `Base.astro`) so every page sharing it gets Tailwind. Two things to get right: Tailwind 4 is **not** an `integrations: []` entry — that was `@astrojs/tailwind`, now deprecated — and the `@theme` / `@utility` / `@custom-variant` / `@source` blocks from `_tailwind/main.css` move into `global.css` wholesale, with `@source` retargeted from `../_includes` to `../**/*.astro`. Because v4's config lives in CSS, none of section 4's token work is redone.
- **Because there is no SCSS left, the Astro plan loses a dependency and a step.** `sass` drops out of its scaffolding, and its section 8 becomes a file move rather than a Sass-pipeline port.
- **The Liquid UI partials from section 9 become Astro components**, which is a straight upgrade: `.astro` components have typed props, so `include.variant="light"` becomes a checked prop instead of a string compared in a Liquid `case`.
- **`withastro/action` replaces the hand-rolled build steps.** The workflow in section 3 exists because Jekyll needs Node bolted on beside Ruby. Astro's documented workflow is `actions/checkout@v7` + `withastro/action@v6` in a build job, then `actions/deploy-pages@v5` in a deploy job — the action detects the package manager, installs, builds, and uploads the Pages artifact itself, so `configure-pages` and `upload-pages-artifact` both disappear.
- **Step C here does most of the Astro plan's deployment work.** Both need `package.json`, a committed lockfile (Astro's docs call this out explicitly), a Pages workflow, and the Pages source flipped to **GitHub Actions** — the one step no commit can perform. Doing it here means the Astro migration starts with that already proven rather than debugging CI and a framework port at once.

One consequence to carry across: the Astro plan's verification compares rendered HTML against a Jekyll baseline, which only works while class names are stable. That baseline must be captured **after** this project lands, not from `version5` as it stands today. Its section 14 has been amended accordingly.

The ordering cost is that templates get touched twice — once for classes here, once for syntax there. That is the right trade: class translation against a working Jekyll build with screenshot baselines is far easier to verify than doing it inside a framework port where any regression has two candidate causes.
