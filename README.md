# Kross Jekyll | My Portfolio

Jekyll personal portfolio/blog ported from the [Kross HTML Template](https://themefisher.com/products/kross/), restyled with Tailwind CSS v4.

## Demo

| Section                  | After |
| ------------------------ | ----- |
| Home hero                | <img alt="hero-after-dark" src="https://github.com/user-attachments/assets/f44697af-3be3-40f3-9eb8-4223c97b81eb" /><br><img alt="hero-after-light" src="https://github.com/user-attachments/assets/4b865e5c-eff1-435b-b243-50d6f4f9b21a" /> |
| Header, scrolled         | <img alt="header-after-dark" src="https://github.com/user-attachments/assets/fe43dcca-8f15-4905-a23d-094c526f111a" /><br><img alt="header-after-light" src="https://github.com/user-attachments/assets/6d2ae17c-8bbb-44d5-b966-2e599b69a547" /> |
| Cards (services / skills) | <img alt="cards-after-dark" src="https://github.com/user-attachments/assets/7f62e25c-1565-481a-b656-d9a5e96ffdd9" /><br><img alt="cards-after-light" src="https://github.com/user-attachments/assets/7eaa1162-b497-425c-a349-a3ff16bf461b" /> |
| About page               | <img alt="about-after-dark" src="https://github.com/user-attachments/assets/f0e9ab0f-2604-4fc7-8330-1d82697a60a5" /><br><img alt="about-after-light" src="https://github.com/user-attachments/assets/094aa819-b9f6-471e-8c02-7086bfab774b" /> |
| Experience section       | <img alt="experience-after-dark" src="https://github.com/user-attachments/assets/d3847145-bebb-477e-a676-fb38a257bc11" /><br><img alt="experience-after-light" src="https://github.com/user-attachments/assets/ef5c5ca9-be7c-47aa-b385-6405fe3e5397" /> |
| Contact panel            | <img alt="contact-after-dark" src="https://github.com/user-attachments/assets/29fc534c-ddc4-43df-831d-3d301e31d035" /><br><img alt="contact-after-light" src="https://github.com/user-attachments/assets/dc4342b0-8af3-4271-b9a4-9de2d0557c9a" /> |

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

This project has been substantially adapted from the original Kross project:

- Implemented iOS-style translucent material system: ambient backgrounds, blurred surfaces, dot-grid sections, hairline separators, softer corners, and neutral depth.
- Rebuilt the styling with Tailwind CSS v4 — `_tailwind/main.css` is the only hand-written CSS, using semantic colour tokens and `prefers-color-scheme` dark mode.
- Replaced the jQuery plugins with focused plain-JavaScript modules in `assets/js/`.
- Added paired cross-document view transitions that respect reduced-motion preferences.
- Added a cutout portrait hero, certificate display, and active navigation states for the current page.
- Removed the superseded decorative image assets and parallax script in favour of CSS materials and the new ambient design.

## Deployment

Deployed to GitHub Pages at `https://jay.thedev.id` from `main` by [pages.yml](.github/workflows/pages.yml): `pnpm css:build` → `bundle exec jekyll build` (into `docs/`) → upload as the Pages artifact. The repo's Pages source must be set to **GitHub Actions**, not a branch/folder.

## License

Copyright (c) 2016 - Present, original design by [Themefisher](https://themefisher.com)

Modified and maintained by [Ian James](https://github.com/lonewanderer27) (2026)

**Code license:** The original Kross code is released under the [MIT](https://github.com/themefisher/kross-jekyll/blob/main/LICENSE) license. The Tailwind, JavaScript, and template changes in this repository are provided under the same license.

**Image license:** The original preview and demonstration images are not covered by the MIT license. They are retained for demonstration purposes only and may not be redistributed without permission from their respective copyright holders.