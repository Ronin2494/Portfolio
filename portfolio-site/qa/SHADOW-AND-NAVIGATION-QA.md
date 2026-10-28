# Portfolio — Visual depth and navigation QA gate

Sources reviewed: [MDN box-shadow](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/box-shadow), [W3C WCAG 2.2](https://www.w3.org/TR/wcag/), [W3C Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast), and [W3C Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance).

**Release rule:** no merge until all required CI checks pass; no deployment claim until Render is live and the published page has been inspected. Passing static tests alone does not establish visual fidelity.

## Visual + interaction matrix

| ID | Scenario | Expected result | Method |
| --- | --- | --- | --- |
| SH-01 | Default button | Layered shadow is visible; text and icon remain legible | Browser computed style + screenshot |
| SH-02 | Hover / pointer | Shadow and icon shift are visible without changing layout or tap-target size | Chromium mouse |
| SH-03 | Pressed | Depth becomes shallower; no flicker or layout shift | Chromium pointer down/up |
| SH-04 | Keyboard focus | Independent, clearly contrasting solid outline, not just glow | Keyboard focus + computed outline |
| SH-05 | Non-text contrast | Essential button boundaries/icons meet 3:1 against adjacent background | WCAG 1.4.11 + contrast inspection |
| SH-06 | Text contrast | Button labels meet 4.5:1 (or 3:1 for large text) | WCAG 1.4.3 |
| SH-07 | Focus appearance | Outline is discernible and not obscured by shadows, card art or sticky controls | WCAG 2.4.7 / 2.4.11; AAA 2.4.13 as stretch |
| SH-08 | Reduced motion | Arrow movement and art transitions stop when reduce is set | Emulated media preference |
| SH-09 | Forced colors | Control boundaries and focus visible when shadows are removed | Chromium forced-colors emulation |
| SH-10 | Mobile tap targets | Main project launch buttons >=44x44 CSS px, no overlapping tap zones | 320 / 375 / 390px viewports |
| SH-11 | Overflow and shadow clipping | No horizontal scroll or clipped focus ring; card media does not cover text | Responsive screenshot and geometry |
| SH-12 | SVG semantics | Arrows are inline SVG, aria-hidden; parent anchors keep accessible names | DOM assertions |
| SH-13 | Links | Destinations preserved, no broken internal anchors, external rel attributes intact | DOM/link tests |
| SH-14 | Asset loading | Distinct product-specific images decode and retain aspect ratio | Browser decode/natural dimensions |
| SH-15 | Performance | No new external JS, lightweight lazy-loaded SVGs, monitor mobile Lighthouse / LCP / CLS | CI Lighthouse and asset checks |
| SH-16 | Browser compatibility | Chrome desktop/mobile; WebKit/iOS and Firefox where available | Browser QA / manual device pass |
| SH-17 | Desktop layout | Existing varied-span Bento and 3D hover interactions remain usable | Desktop visual smoke |
| SH-18 | Fallbacks | JS disabled and SVG unavailable must not make links inaccessible | Progressive enhancement review |

## Release notes
- Actual WebKit and physical iPhone testing cannot be claimed unless run.
- Do not use the soft box-shadow glow as the *only* focus indication.
- Avoid unnecessary animated box-shadow on mobile; prioritize opacity and transforms, with reduced-motion support.
- Visual QA must compare the user's reported emoji-style arrows in the portal header and project links against the new SVG treatment.
