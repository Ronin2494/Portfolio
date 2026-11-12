# Portfolio Experience — Phase 0 Baseline and Release Contract
Date: 2026-10-31
Status: Planning/QA baseline; no new feature code approved or deployed
Repository: Ronin2494/Portfolio (production branch: master)
Production: https://badbunny.work/

## 1. Scope and ownership
This is a Portfolio-local coordinated workflow. No AgentHQ dependency.
- Planning: preserve approved requirements, define scope and impact map.
- Design: deliver Figma interaction specifications with mobile, reduced-motion, focus, loading, exit, and return states.
- Development: isolated changes by component; no unrequested behavior changes.
- QA: unit, integration, Chromium, accessibility, visual regression, performance.
- DevOps: PR checks, manual review, controlled merge, Render revision match.
- Monitoring: production smoke, telemetry, regression follow-up.

## 2. Current verified evidence (2026-10-31 read-only review)
- GitHub default branch: master.
- Render latest reported live deployment: d2ee745728ffee6cb2e5e29f06d9d809a8b91158, button interactions (#32).
- Prior live deploys: ad327c74156286cbc08ee525fe135b2aac1382f2 mobile navigation (#31), ba83a853c9438633bfc9da6d98fbae2416093eaa private gallery single-card (#30).
- Actions show successful visual-quality run on d2ee7457, successful full QA and visual-quality on e5581dab, and one earlier failed full QA on 9ce22dd; **no claim of a full-QA success for d2ee7457 from sampled runs**.
- Open GitHub issue #19: traversable neural-world explorer, real node graph, history, accessible keyboard and touch, normal scroll preservation.
- Open GitHub issue #13: reported production mobile Lighthouse 51, LCP 7.3s (2026-10-23); these are historical measurements, not a fresh result.
- Existing workflows: .github/workflows/portfolio-full-qa.yml and portfolio-visual-quality.yml.
- Full-QA workflow performs JS syntax, node test suite, Chromium smoke, axe, branch vs master Lighthouse, optional live smoke and production Lighthouse; **production smoke and Lighthouse steps have continue-on-error**, so passing the workflow does not imply production performance passed.
- COMPONENT_ARCHITECTURE.md defines strict shared-component ownership and asymmetric bento spans.

## 3. Frozen behaviors / non-negotiable regression contract
- Preserve original 3D spiral/neural hero and existing portal scroll/handoff.
- Preserve project constellation ↔ varied-span bento view switch, including discovery/autoswitch behavior as currently approved.
- Preserve per-project thumbnail art, working vinyl animation, accurate cards, links, and responsive layout.
- Private Gallery: **exactly one top-level gallery card**, with existing in-card selected-release flow and locked checkout protections.
- Preserve single featured creative video; retain Beyond interactive bubble/modal opening and origin-aware close.
- Preserve mobile header compact menu, all five destinations, Escape/outside tap, keyboard and touch handling.
- Preserve footer-triggered LinkedIn presentation and its existing destination.
- Preserve current button shadow palette, hover, pressed, focus-visible and reduced-motion behavior.
- Preserve creator studio navigation to main portfolio and existing auth/edit/payment boundaries.
- Do not add separate case-study pages or a new SEO workstream.

## 4. Phased implementation plan
P0 — Regression baseline / performance: capture 320, 390, 768, 1440 viewport screenshots, interactions and production Lighthouse metrics. Fix performance root causes before adding GPU-intensive scenes. Performance failure must be visible in release decision.
P1 — Design: high-fidelity Living Universe + Project Worlds + Reactive Bento prototype. Trace each concept to existing DOM/JS ownership, including touch, exit/return and fallback states. Preserve approved original hero rather than replacing it.
P2 — Developer: incremental feature flags and component-scoped implementation; no unrelated page behavior changes. Neural-world explorer (#19) must bind nodes from live project DOM rather than hardcoded duplicate copy.
P3 — QA: new-feature unit and E2E assertions, screenshot comparisons to master, motion/accessibility, stable touch hit targets, browser navigation and return state; test previously approved behaviors.
P4 — Release: reviewed PR with evidence; merge only after required CI green and explicit QA findings disposition. Render deployment SHA must equal merged commit SHA; live production smoke and Core Web Vitals recorded.

## 5. Acceptance gates
1. One private gallery top-level card; selected release and locked checkout remain functional.
2. Header/navigation no horizontal overflow at 320 / 390 / 768 / 1440; Escape and outside tap close mobile menu.
3. Project bento uses nonuniform spans at desktop, single usable column on narrow screens; artwork not cropped unintentionally.
4. Hero/constellation switch/Beyond modal/creative feature/LinkedIn reveal behavior unchanged, verified by browser tests and screenshots.
5. All interactive controls have discernible names, keyboard focus, contrast, and reduced-motion alternatives.
6. No runtime errors and no broken project URLs; no accidental external network requirements in deterministic unit tests.
7. Performance targets: mobile LCP <= 2.5s, INP <= 200ms, CLS <= 0.1; Lighthouse mobile >= 90 is a project goal, not currently passing.
8. Production verification and performance do not silently pass due to CI continue-on-error. Record metrics and blocking decisions for each release.
9. Any exception to frozen behavior requires a documented change request with user approval.

## 6. Agent handoffs
Planning → QA establish current screenshots + failing-case inventory → Design build annotated motion prototype → Developer scoped implementation → QA release proof → DevOps merge/deploy → Monitoring verify.
No autonomous background agent runs are asserted by this document.

## 7. Deliverables still outstanding
- Fresh production screenshots and Lighthouse/field data (not measured in this review).
- Executed Chromium test run against latest deployed SHA (not executed in this review).
- High-fidelity interactive Figma prototype and implementation PR (not yet made).
- CI audit to decide whether production smoke/performance should be release-blocking.
