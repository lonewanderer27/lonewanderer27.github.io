# Portfolio Category View Transitions

Same-document View Transitions for the `/portfolio` page. When the user changes category via the filter radio controls, portfolio cards smoothly animate into place: persisting items morph across grid coordinates, exiting items smoothly fade and scale down, and entering items fade and scale up.

---

## Behavior Rules

| State / Interaction | Visual Behavior | View Transition Mechanism |
|---|---|---|
| Change category (e.g. All $\to$ Web App) | Persisting cards slide to their new grid positions | `::view-transition-group(.portfolio-card)` |
| Filtered-out item | Fades out and scales down slightly (`scale(0.92)`) | `::view-transition-old(.portfolio-card):only-child` |
| Filtered-in item | Fades in and scales up from `scale(0.92)` to `1` | `::view-transition-new(.portfolio-card):only-child` |
| Page chrome (header, title, filters, footer) | Remains perfectly steady; zero 12px jump | `:active-view-transition-type(portfolio-filter)` & `.is-filtering` suppress root rise |
| Cross-document navigation (Home $\leftrightarrow$ Portfolio) | 3 shared cards morph between Home strip and Portfolio grid | Shared `shot-*` names preserved |
| `prefers-reduced-motion: reduce` | Instant DOM update without transitions | JS media query check + CSS `@media` overrides |
| Unsupported browser | Instant DOM update | Progressive enhancement fallback in `portfolio-filter.js` |

---

## Technical Architecture & Design Decisions

### 1. Root Jump Suppression
In `_tailwind/main.css`, cross-document page navigations declare:
```css
::view-transition-new(root) {
  animation: view-transition-rise 300ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
```
Any invocation of `document.startViewTransition()` on the document will by default execute this 12px vertical rise on `:root`. For in-page category filtering, this caused the entire viewport to jump.

To eliminate this jitter:
- The transition is assigned the type `portfolio-filter` via `types: ["portfolio-filter"]` and `.is-filtering` is added to `<html>`.
- The root snapshots and persistent chrome are zeroed out:
```css
html:active-view-transition-type(portfolio-filter)::view-transition-old(root),
html:active-view-transition-type(portfolio-filter)::view-transition-new(root),
html:active-view-transition-type(portfolio-filter)::view-transition-group(root),
html.is-filtering::view-transition-old(root),
html.is-filtering::view-transition-new(root),
html.is-filtering::view-transition-group(root),
html:active-view-transition-type(portfolio-filter)::view-transition-group(site-header),
html:active-view-transition-type(portfolio-filter)::view-transition-group(portfolio-title),
html.is-filtering::view-transition-group(site-header),
html.is-filtering::view-transition-group(portfolio-title) {
  animation: none !important;
}
```

### 2. Group Class Styling via `view-transition-class`
Every portfolio card carries the class `portfolio-card`, styled with `view-transition-class: portfolio-card`. This allows all 9 individual unique `shot-*` view transitions to share single, maintainable pseudo-element rules:
- `::view-transition-group(.portfolio-card)`: 350ms reflow ease.
- `::view-transition-old(.portfolio-card):only-child`: 220ms exit ease-in.
- `::view-transition-new(.portfolio-card):only-child`: 280ms enter ease-out.

### 3. Click Interactivity
By default, the `::view-transition` top-layer pseudo-element intercepts pointer events while the transition runs. Adding `pointer-events: none` ensures rapid user clicks on filter buttons are never blocked.

### 4. Rapid Click Cancellation & State Synchronization
If the user clicks another filter before the previous transition completes, `activeTransition.skipTransition()` immediately advances the active transition, preventing desynchronized DOM state.

### 5. Accessibility Focus Management
If keyboard focus is currently inside a project card that is being hidden, focus is returned to the selected filter radio button to prevent focus abandonment. An `aria-live="polite"` element announces the number of visible projects to screen readers.

---

## Phases & Conventional Commits

### Phase 1 — `feat(styles): add portfolio view transition classes and root jump suppression`
#### [MODIFY] `_tailwind/main.css`
Add portfolio card transition class, root/chrome motion suppression, click pass-through, group reflow, enter/exit keyframes, and `prefers-reduced-motion` overrides.

### Phase 2 — `feat(includes): assign view transition names and classes to all portfolio cards`
#### [MODIFY] `_pages/portfolio.html`
Assign unique `view-transition-name` (`shot-...`) and `portfolio-card` class to all cards in the grid. Add `aria-live="polite"` status message.

### Phase 3 — `feat(scripts): implement view transition category filtering with fallbacks`
#### [MODIFY] `assets/js/portfolio-filter.js`
Wrap DOM updates in `document.startViewTransition()` with transition type `portfolio-filter`, rapid click cancellation, focus management, and fallbacks.

### Phase 4 — `docs(plan): add portfolio view transitions design plan`
#### [NEW] `.claude/plans/portfolio-view-transitions.md`
Add design document to `.claude/plans/` capturing the architecture and behavior rules.
