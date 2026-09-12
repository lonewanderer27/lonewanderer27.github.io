# Kross Jekyll | My Portfolio

Jekyll personal portfolio/blog ported from the [Kross HTML Template](https://themefisher.com/products/kross/), restyled with Tailwind CSS v4.

## Demo

| Homepage  | About  | Blog  | Portfolio  | Contact  |
|---|---|---|---|---|
| ![Homepage](./preview-home.png) | ![About](./preview-about.png) | ![Blog](./preview-blog.png) | ![portfolio](./preview-portfolio.png) | ![contact](./preview-contact.png) |

[Live Preview](https://jay.thedev.id)

## Setup

```bash
bundle install     # Ruby gems (Ruby 3.4.10)
pnpm install       # Node deps (pnpm 11)

pnpm dev           # build CSS, then watch CSS + `jekyll serve`
pnpm css:build     # _tailwind/main.css -> assets/css/main.css (minified)
```

`bundle exec jekyll serve` on its own is **not** enough — Jekyll does not compile the CSS, it only copies the already-built `assets/css/main.css`. Run `pnpm dev`, or `pnpm css:build` first, otherwise the site renders unstyled.

`assets/css/main.css` and `docs/` are build artifacts and are gitignored.

## Customize

Things you can customize in `_data/settings.yml` (no HTML/CSS):

- Theme General Settings ( name, logo, email, phone )
- Hero Section
- About Section
- Team Section
- Skills Section
- Experience Section
- Certificates Section
- Education Section
- Services Section
- Portfolio Section
- Testimonials Section
- Client Slider Section
- Contact Section

## Modifications

I have made the following modifications to the original project:

- Restyled from Bootstrap 4 to Tailwind CSS v4 — `_tailwind/main.css` is the only hand-written CSS, with semantic colour tokens and dark mode via `prefers-color-scheme`.
- Replaced the jQuery plugins with plain-JS (`assets/js/`).
- Added a feature to display certificates.
- Nav item active class when its the active page

## Deployment

Deployed to GitHub Pages at `https://jay.thedev.id` from `main` by [pages.yml](.github/workflows/pages.yml): `pnpm css:build` → `bundle exec jekyll build` (into `docs/`) → upload as the Pages artifact. The repo's Pages source must be set to **GitHub Actions**, not a branch/folder.

## License

Copyright (c) 2016 - Present, Designed & Developed by [Themefisher](https://themefisher.com)

Modified by [Ian James](https://github.com/lonewanderer27) (2026)

**Code License:** Released under the [MIT](https://github.com/themefisher/kross-jekyll/blob/main/LICENSE) license.

**Image license:** The images are only for demonstration purposes. They have their license, we don't have permission to share those images.