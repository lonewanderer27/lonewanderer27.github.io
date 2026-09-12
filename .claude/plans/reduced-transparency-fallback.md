# Plan: Reduced-transparency fallback design

## Goal

Add a solid, high-clarity visual fallback for visitors who enable reduced
transparency, use increased contrast, or browse without `backdrop-filter`
support.

The normal site can retain its translucent material design while the fallback
replaces transparency-dependent effects with opaque surfaces, borders, and the
existing semantic color system.

## Current state

The repository already has most of the foundation:

- Material utilities such as `material`, `material-thin`, `material-thick`, and
  `material-brand`.
- Ambient background washes in
  [`_includes/ui/ambient.html`](../../_includes/ui/ambient.html).
- Reduced-transparency handling in
  [`_tailwind/main.css`](../../_tailwind/main.css).
- A fallback for browsers without `backdrop-filter` support.
- Semantic tokens that can be re-pointed without changing every template.

The tagged [`_data/settings.yml`](../../_data/settings.yml) file should remain
unchanged because it contains shared content, not presentation-specific
variants.

## Implementation commits

### 1. `docs(styles): document the reduced-transparency fallback`

**Files**

- [`_tailwind/main.css`](../../_tailwind/main.css), if its existing comments
  need to describe the finalized fallback behavior.
- The relevant design plan, if the implementation decisions should be
  recorded there.

**Changes**

- Define the fallback as an opaque, high-clarity presentation.
- Document that it applies to:
  - `prefers-reduced-transparency: reduce`
  - `prefers-contrast: more`
  - Browsers without `backdrop-filter`.
- Clarify that content, layout, and interaction behavior remain unchanged.

Omit this commit if the existing implementation comments already provide
adequate documentation.

### 2. `refactor(styles): centralize opaque material fallback tokens`

**File**

- [`_tailwind/main.css`](../../_tailwind/main.css)

Create one reusable fallback token definition for:

```css
--color-material-thin
--color-material
--color-material-thick
--color-material-brand
--color-material-edge
--color-ambient-1
--color-ambient-2
--color-ambient-3
```

Recommended fallback values:

- Neutral materials use `var(--color-surface)` or
  `var(--color-surface-alt)`.
- The branded material uses `var(--color-primary)`.
- Material edges use `var(--color-line)`.
- Ambient washes use `transparent`.

Apply the same values to:

```css
@media (prefers-reduced-transparency: reduce)
@media (prefers-contrast: more)
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))
```

Keep the material utility call sites unchanged in this commit.

### 3. `fix(styles): preserve fallback contrast on branded surfaces`

**Files**

- [`_tailwind/main.css`](../../_tailwind/main.css)
- Only affected templates if contrast verification proves that a component
  requires a class-level adjustment.

Verify and correct semantic colors for:

- Body text on opaque cards.
- Subtle and muted text on `surface` and `surface-alt`.
- White text on the opaque branded surface.
- Header links and controls.
- Focus indicators.
- Form labels, placeholders, and borders.

Prefer semantic token changes in
[`_tailwind/main.css`](../../_tailwind/main.css). Do not add one-off colors to
[`_data/settings.yml`](../../_data/settings.yml) or duplicate content for the
fallback.

Omit this commit if the existing values already pass the intended contrast
checks.

### 4. `fix(includes): remove transparency-dependent component assumptions`

**Candidate files**

- [`_includes/header.html`](../../_includes/header.html)
- [`_includes/hero-section.html`](../../_includes/hero-section.html)
- [`_includes/services-section.html`](../../_includes/services-section.html)
- [`_includes/contact-section.html`](../../_includes/contact-section.html)
- [`_includes/testimonial-section.html`](../../_includes/testimonial-section.html)
- [`_includes/ui/button.html`](../../_includes/ui/button.html)
- [`_includes/ui/portrait.html`](../../_includes/ui/portrait.html)

Only make markup or utility changes where token overrides are insufficient.
Check for:

- Content that becomes unreadable when a translucent surface becomes opaque.
- Hover states that become visually indistinguishable.
- Borders or shadows that become redundant or disappear.
- Decorative ambient gradients that should not remain visible in fallback mode.
- Nested rounded elements that expose incorrect edges.
- Mobile navigation behavior when the header becomes opaque.

Do not make speculative template changes. If the token fallback fully handles
these cases, skip this commit.

### 5. `build(styles): regenerate the compiled stylesheet`

Run:

```bash
pnpm css:build
```

The repository treats `assets/css/main.css` as a generated artifact. Commit it
only if the normal repository workflow tracks generated output; otherwise leave
it ignored and use the build only for validation.

Verify that:

- Material utilities are still generated.
- All fallback conditions are present.
- Ambient tokens resolve to transparent in fallback mode.
- No unsupported-browser path leaves a semi-transparent veil.
- The stylesheet remains above the CI size guard.

## Validation

Run the existing build commands:

```bash
pnpm css:build
bundle exec jekyll build
```

There is currently no automated test suite. Do not introduce a new testing
framework solely for this change.

Manually verify:

1. Light mode with normal transparency.
2. Dark mode with normal transparency.
3. Reduced transparency enabled.
4. Increased contrast enabled.
5. `backdrop-filter` unsupported or disabled.
6. Mobile navigation open and closed.
7. Keyboard focus across navigation, buttons, portfolio filters, and forms.

Confirm that the fallback preserves content, layout, interaction behavior,
focus visibility, and intended text contrast while removing reliance on blur,
translucency, and ambient washes.

## Recommended order

1. `docs(styles): document the reduced-transparency fallback`
2. `refactor(styles): centralize opaque material fallback tokens`
3. `fix(styles): preserve fallback contrast on branded surfaces`
4. `fix(includes): remove transparency-dependent component assumptions`
5. `build(styles): regenerate the compiled stylesheet`, only if generated
   output is tracked

## Scope boundaries

Do not modify [`_data/settings.yml`](../../_data/settings.yml) unless a
separate content requirement emerges. The fallback is driven by browser
preferences and should be implemented through the semantic styling system in
[`_tailwind/main.css`](../../_tailwind/main.css), with narrowly scoped include
changes only when necessary.
