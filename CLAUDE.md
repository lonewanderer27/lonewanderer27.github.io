# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Jekyll personal portfolio/blog site (Kross theme, ported from Themefisher's Kross HTML template), styled with Tailwind CSS v4. Deployed to GitHub Pages at `https://jay.thedev.id` (see [CNAME](CNAME)) from the `main` branch.

## Commands

```bash
bundle install     # Ruby gems (Ruby 3.4.10, see .ruby-version)
pnpm install       # Node deps (pnpm 11, see packageManager in package.json)

pnpm dev           # build CSS once, then watch CSS + `jekyll serve` concurrently
pnpm css:build     # _tailwind/main.css -> assets/css/main.css (minified)
pnpm css:watch     # same, in watch mode

bundle exec jekyll build   # builds into docs/ (destination is overridden in _config.yml)
```

There is no test suite and no linter. CI is [pages.yml](.github/workflows/pages.yml) (build + deploy only).

**`bundle exec jekyll serve` on its own is not enough** — Jekyll does not compile the CSS. It only copies the already-built `assets/css/main.css`. Run `pnpm dev`, or `pnpm css:build` first, otherwise the site renders unstyled.

## Architecture

### Two-toolchain build, in a required order

1. Tailwind CLI reads [_tailwind/main.css](_tailwind/main.css) and writes `assets/css/main.css`.
2. Jekyll builds into `docs/`, treating that CSS as a static passthrough asset.

`assets/css/main.css` and `docs/` are both gitignored — they are build artifacts, never committed. [_includes/head.html](_includes/head.html) links `/assets/css/main.css` directly. There is no Sass in this repo and no `sass:` config; if you see instructions mentioning `assets/scss`, they are stale.

### Deployment

[pages.yml](.github/workflows/pages.yml) runs on push to `main`: pnpm install → `pnpm css:build` → a guard asserting `assets/css/main.css` exceeds a 20,000-byte floor → `bundle exec jekyll build` → upload `docs/` as the Pages artifact → `deploy-pages`. The Pages source must be set to **GitHub Actions**, not a branch/folder.

The size guard exists because a Tailwind build whose `@source` globs match nothing produces a small-but-valid stylesheet and an unstyled site, not an error. If you move template directories, update the `@source` lines in `_tailwind/main.css` or this guard will (correctly) fail the build.

`jay.thedev.id/resume` is a **separate site of the user's**, not part of this repo. Never add a `/resume` route here — it would shadow it.

### Styling: all Tailwind, no CSS files

[_tailwind/main.css](_tailwind/main.css) is the single styling source and the only hand-written CSS. Rules in force:

- Styling lives in utility classes in templates, plus v4 CSS-config directives (`@theme`, `@utility`, `@layer base`, `@source`). No `.scss`, no new hand-written selectors, **no `@apply`**.
- **Semantic tokens.** Templates ask for `bg-surface`, `text-heading`, `text-muted`, `border-footer-line`, etc. Dark mode is implemented by re-pointing those tokens inside `@media (prefers-color-scheme: dark)` — not by adding `dark:` variants at call sites. Add a new colour as a semantic token with both light and dark values.
- **Shadows are the exception.** Tailwind inlines a `--shadow-*` token's value into the utility at build time, so re-pointing a shadow token in the dark block does nothing. Call sites carry `dark:shadow-<colour>` instead.
- **Breakpoints are pinned to Bootstrap 4's** (576/768/992/1200) so the port stayed a pure class translation. Unpinning is a deliberate, separate change.
- Repeated markup is factored into includes rather than CSS classes — see `_includes/ui/`.

### Icons

One provider, inlined: [_includes/ui/icon.html](_includes/ui/icon.html) holds Tabler Icons (MIT) as a `{%- case -%}` over `include.name`, falling back to `medal`. There is no icon webfont and no icon CDN — the themify-icons woff (55KB + 13KB CSS) and the Font Awesome kit script were both removed, since the site draws about a dozen glyphs.

- Size with a `size-*` utility, not a font size. The old `text-[45px] leading-25!` line-height centring trick does not work on an SVG; wrap the call in `grid place-items-center` instead.
- Colour comes from `stroke="currentColor"`, so `text-*` semantic tokens still re-point for dark mode.
- A single icon can override that with the include's `style` param. The experience entries do,
  carrying `icon-color` / `icon-color-dark` hexes that render as `color: light-dark(light, dark)`.
  `:root` already declares `color-scheme: light dark`, which is what makes `light-dark()` resolve.
  A hex cannot become a utility class (`text-[{{ var }}]` is never generated, since Tailwind scans
  for literals), so per-entry colour is an inline style rather than a class.
- Icon names in `_data/settings.yml` are bare Tabler names (`brand-github`, `device-mobile`), not prefixed classes. `services`, `social`, `certificates` and `education` entries each take an optional `icon:`.
- **Liquid cannot nest an include inside an include parameter** — the inner `%}` closes the outer tag. To pass an icon as a `ui/button.html` label, `{%- capture -%}` it first (see [portfolio-section.html](_includes/portfolio-section.html)).
- Icons are decorative and `aria-hidden`; an icon-only link needs its own `aria-label`.

Two idioms carried over from the Bootstrap port, both common across templates:

- **Grid**: `container-page` (a custom `@utility` reproducing Bootstrap's stepped container widths) → `flex flex-wrap -mx-3.75` → `relative w-full px-3.75 lg:w-1/3` (3.75 = the 15px gutter on the 0.25rem spacing scale).
- **Stateful classes toggled by JS** are styled with arbitrary variants, e.g. the header's `[&.nav-bg]:py-0`. The class itself is defined nowhere; only the variant references it.

`@source` includes `../_data`, because utility class names live in `_data/settings.yml` alongside the copy. Class names in YAML are scanned like class names in templates.

### Component includes with parameters

[_includes/ui/button.html](_includes/ui/button.html) is the pattern: a `{%- comment -%}` block documenting its params, then `{%- case -%}` blocks assigning class strings, then one output tag. Accepts `href`/`label`/`variant`/`size`/`tag`/`type`/`extra`/`style`. Prefer extending this over hand-rolling a button's utility list; `extra` appends classes verbatim and `style` exists for `view-transition-name`.

### Content/config split

- [_config.yml](_config.yml) — Jekyll build config (plugins, `permalink: pretty`, kramdown, `destination: docs/`, `compress_html`, feed settings).
- [_data/settings.yml](_data/settings.yml) — **all site copy**: title, logo, nav menu, social links, and every section (hero, about, work-process, skills, experience, certificates, education, services, portfolio + labels, testimonials, client slider, contact). Most content changes need no HTML.
- [_data/plugins.yml](_data/plugins.yml) — vendor CSS/JS URL lists, iterated in `head.html` and `footer.html`. `css` is empty; `js` is just the EmailJS SDK.

### Pages, posts, layouts

`_pages/` holds standalone pages with permalink `/:basename:output_ext` (so `/about.html`, `/blog.html`, …); `_posts/` uses date-prefixed filenames with `permalink: pretty`. `_layouts/default.html` is the base shell (head + header + content + contact-section + footer) wrapped in `compress.html` for HTML minification; `page.html` adds a page-title banner; `about.html` adds the bio/team/client layout; `post.html` is for posts. Each site section is its own include, driven by `settings.yml` — reorder the homepage by editing the include list in [index.html](index.html).

Page-title elements carry `style="view-transition-name: ..."` (`about-page-title`, `portfolio-page-title`, …) and `@view-transition { navigation: auto }` is declared in `_tailwind/main.css`. Keep those names matching across the pages they transition between.

### JavaScript

Plain IIFEs, no jQuery, no framework, loaded at the bottom of [_includes/footer.html](_includes/footer.html) in this order: vendor (from `plugins.yml`), then `nav.js`, `parallax.js`, `carousel.js`, `portfolio-filter.js`, `emailForm.js`. Each script bails out silently when its hooks are absent, so all of them load on every page.

DOM contracts — changing this markup breaks the behaviour with no error:

| Script | Contract |
|---|---|
| [nav.js](assets/js/nav.js) | `[data-nav-toggle]` + `#navigation`; toggles `.navigation`'s `nav-bg` class via an IntersectionObserver sentinel |
| [portfolio-filter.js](assets/js/portfolio-filter.js) | `[data-portfolio-grid]` whose children carry `data-groups='["api",…]'`; radios named `portfolio-filter` with value `all` or a group |
| [carousel.js](assets/js/carousel.js) | `[data-carousel]` scroll-snap container (direct children are slides) + `[data-carousel-dots]`; dot classes are string constants in the script |

Visibility is toggled with the **`hidden` utility class, never the `hidden` attribute**: Preflight's `[hidden]{display:none!important}` sits in the base layer, and for `!important` declarations cascade-layer order is inverted, so that base rule beats an important utility.

## Conventions

- **Conventional Commits**, enforced by hand (no commitlint). Scopes in use: `styles`, `theme`, `includes`, `scripts`, `plan`, `gemfile`, plus bare `ci`/`build`/`docs`/`perf`. See `git log`.
- Design docs live in `.claude/plans/` — [bootstrap-to-tailwind.md](.claude/plans/bootstrap-to-tailwind.md) (the migration this repo just executed; still the reference for remaining teardown/modernization steps) and [jekyll-to-astro-migration.md](.claude/plans/jekyll-to-astro-migration.md) (not started). Read the relevant one before large changes.

## Known inconsistencies

Pre-existing; fix deliberately rather than as drive-by edits, since each changes rendered output.

- `_config.yml` declares `defaults:` **twice**. YAML keeps the last key, so the site-wide `image: /assets/images/banner.png` default is silently dead and only the `_pages` permalink default applies.
- `_config.yml` still has `url: "https://lonewanderer27.github.io"` while the live host is `jay.thedev.id`. This feeds `absolute_url`, `jekyll-seo-tag`, the sitemap and the feed.
- `settings.yml`'s `banner:` and `_layouts/default.html`'s front matter both point at `assets/image/banner.png` — singular `image`, while the directory is `assets/images/`.
- `head.html`'s author meta is `<meta name="author" content="{{ . }}">`, which renders empty.

## Notes from README

Modifications vs. upstream Kross: certificates display feature; nav item gets an active class on the current page. Code is MIT; the demo/preview images are not licensed for reuse.
