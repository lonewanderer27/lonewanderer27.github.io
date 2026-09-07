# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Jekyll personal portfolio/blog site (Kross theme, ported from Themefisher's Kross HTML template), deployed to GitHub Pages at `https://lonewanderer27.github.io`.

## Commands

```bash
bundle install                  # install Ruby gems (Ruby 3.1.2, see .ruby-version)
bundle exec jekyll serve        # run local dev server w/ live rebuild
bundle exec jekyll build        # build site into docs/ (see destination below)
```

No test suite, linter, or CI config exists in this repo.

## Architecture

- **Build output**: `_config.yml` sets `destination: docs/` — the built site goes to `docs/`, not the Jekyll default `_site/`. GitHub Pages serves from this `docs/` folder.
- **Site content/config split**:
  - `_config.yml` — Jekyll build config (plugins, permalinks, SASS, RSS/SEO settings, exclude list).
  - `_data/settings.yml` — all site content/copy (site title, logo, nav menu, and every homepage section: hero, about, team, skills, experience, certificates, education, services, portfolio, testimonials, client slider, contact). This is the primary file to edit for content changes — no HTML/CSS needed for most changes.
  - `_data/plugins.yml` — plugin-related data.
- **Pages vs posts**: `_pages/` holds standalone pages (about, blog, contact, portfolio) with custom permalinks (`_config.yml` maps `_pages` scope to `/:basename:output_ext`). `_posts/` holds blog posts in standard Jekyll date-prefixed filename format.
- **Layouts** (`_layouts/`): `default.html` is the base shell (head + header + content + contact-section + footer, wraps everything in `compress.html` for HTML minification). `page.html` extends default with a page-title banner section. `about.html` extends default with the about-page banner + two-column bio layout + team/client sections. `post.html` is for blog posts.
- **Sections as includes** (`_includes/`): each homepage/site section (hero, about, skills, experience, certificates, education, services, portfolio, testimonials, client-slider, team, contact, footer, header, head) is its own include file, driven by data from `_data/settings.yml`. To add/reorder homepage sections, edit which includes `index.html`/layouts pull in and the corresponding data block in `settings.yml`.
- **View transitions**: page-title elements use `style="view-transition-name: ..."` (e.g. `about-page-title`, `portfolio-page-title`) for animated transitions between pages — keep these names consistent when editing layouts.
- **Assets**: `assets/scss` compiled via Jekyll's built-in Sass (`compressed` style, output dir set in `_config.yml`); `assets/js`, `assets/plugins`, `assets/images` served as-is.
- **Image defaults**: `_config.yml` sets a site-wide default `image: /assets/images/banner.png` (used for social/SEO meta via `jekyll-seo-tag`); individual layouts/pages override via front matter `image:`.

## Notes from README

- Modifications made vs. upstream Kross theme: added certificates display feature; nav item gets active class on the current page.
- Image license: demo/preview images are not licensed for reuse; code is MIT licensed.
