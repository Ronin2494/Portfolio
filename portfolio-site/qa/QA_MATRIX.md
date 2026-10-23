# Portfolio — Full Website QA Matrix and Release Gate
**Audit date:** 2026-10-23 | **Scope:** `badbunny.work`, Render frontend, Portfolio membership API, creator tools, and preview assets.
**Status key:** AUTO = automated by existing Node suites; BROWSER = Chromium browser smoke; LIVE = production verification; MANUAL = external accounts/devices; NOT VERIFIED = cannot claim pass.

## Evidence and methodology
Based on [BrowserStack website QA](https://www.browserstack.com/guide/how-to-perform-website-qa-testing) and [TestGrid website testing](https://testgrid.io/blog/website-testing/): functional, usability, responsive, compatibility, accessibility, security, performance, regression, and real device coverage. Source links were supplied by the Product Owner. Test cases exercise supported controls rather than merely source-string presence. Explicitly separate real user flows from fixture-based coverage.

## Functional acceptance matrix
| ID | Component / journey | Cases required | Coverage | External dependency |
|---|---|---|---|---|
| NAV-01 | Header + footer | Anchor links, focus, canonical navigation, skip link | BROWSER | none |
| NAV-02 | Quick navigation | Open/close, aria-expanded, links, keyboard | BROWSER | none |
| HERO-01 | Neural portal | First frame, scrub, reverse scroll, handoff, pause/resume | AUTO + BROWSER (partial) | visual/manual full browser animation |
| HERO-02 | Reduced motion / mobile | Native scroll fallback, canvas stability, resize | AUTO + BROWSER (partial) | real device GPU |
| PROJECT-01 | Project constellation | Six nodes, selection, keyboard navigation, view discovery | AUTO + BROWSER | none |
| PROJECT-02 | Bento filter | All, Live, Building, count and hidden cards | AUTO + BROWSER | none |
| PROJECT-03 | Layered deck | Previous/next, mobile swipe, keyboard, filtering, ARIA | AUTO + BROWSER (partial) | touch hardware |
| PROJECT-04 | Project links | Correct destinations, open in new tab where applicable | AUTO | external websites |
| BEYOND-01 | Four Beyond cards | Open/close, reverse animation, Escape, focus return | AUTO + BROWSER | real motion visual QA |
| MUSIC-01 | Compositions | Title, links, empty-state, sorting, video collection | AUTO + BROWSER (partial) | source APIs |
| MUSIC-02 | Thumbnails | All catalog covers, video provider URL, image error fallback | AUTO + BROWSER (DOM only) | remote image availability |
| MOVE-01 | Step log | Today/yesterday, day create, update, delete, zero vs missing | AUTO + BROWSER | storage policies |
| MOVE-02 | Step validation | Bounds, invalid dates/decimals, persistence, optional calories and goal | AUTO + BROWSER | cross-device sync not supported |
| PRESENCE-01 | Meditation | Pop-out, published data/empty state, links | AUTO + BROWSER | source APIs |
| QUESTIONS-01 | Questions | Pop-out, text/list, focus and dismissal | AUTO + BROWSER | none |
| FILM-01 | Featured opening film | One video, embeds, title, media provider URL | AUTO | YouTube and browsers |
| CREATIVE-01 | Public editorial media | Categories, iframe rendering, link behavior and fallback | AUTO | media third parties |
| PRIVATE-01 | Membership gallery | Loading, empty, error, images locked, price formatting | BROWSER (mocked API) | live MongoDB/API |
| PAYMENT-01 | Checkout gating | Checkout button disabled when API/payments off | BROWSER (mocked API) | PayPal |
| PAYMENT-02 | Sandbox payment | Approved redirect, sandbox order, capture, unauthorized input, duplicate processing | API logic/static; **NOT VERIFIED live** | PayPal sandbox account |
| PAYMENT-03 | Real payment | Explicit live flags, fulfillment, refund/cancel webhook | **NOT VERIFIED** | live PayPal credentials |
| CHECKOUT-01 | Return view | Cancel, bad token, pending/success/error, no double charge | BROWSER (partial mock) | PayPal |
| STUDIO-01 | Creator authentication | Email link, bad/expired link, sign out, unauthorized member | AUTO/static + BROWSER signed-out | Firebase owner email |
| STUDIO-02 | Upload and publish | File format/size, upload fail/retry, locked visibility and deletion | Static review; **NOT VERIFIED end-to-end** | owner auth + API/Mongo |
| EDITOR-01 | Creative editor | Composition CRUD, validation, auth owner guard | AUTO + BROWSER signed-out | owner credentials |
| EDITOR-02 | Private daily logs | Toronto date, admin-only edits, bounds, upsert | AUTO | authenticated API |
| A11Y-01 | Accessibility | Semantic landmarks, labels, alt text, keyboard, focus | AUTO + BROWSER (partial) | WCAG audit/screen reader |
| MOBILE-01 | Layouts | 390px, 768px, 1440px, no horizontal overflow | BROWSER (partial) | iOS Safari/Android real devices |
| SEC-01 | API and UI safety | Input validation, auth token, unsafe URLs, private media | AUTO + static | penetration test |
| PERF-01 | Browser performance | First render, request weight, long tasks, CWV | **NOT VERIFIED external measurement** | WebPageTest/Lighthouse URL |
| SEO-01 | Metadata | Title, canonical, description, content visibility | BROWSER | search engines |

## Release policy and defect tracking
- A fixture-backed browser PASS **must not** be reported as success of a real PayPal transaction, Firebase authentication or API.
- Failures become tracked defects with steps to reproduce, severity, root cause, owner, regression case and retest.
- Production is **not fully QA certified** until browser tests pass, real-device checks and critical integration paths have evidence, and a performance report for the actual `badbunny.work` URL is captured.
- No automatic checkout capture or payment is executed by this suite.
- `portfolio-site/qa/browser-smoke.mjs` records machine-readable JSON and human-readable Markdown; GitHub Actions uploads artifacts.
- Existing test suite remains the release baseline. New QA workflow broadens syntax coverage to all frontend/backend JS.
- Run an independent Lighthouse and WebPageTest test **on badbunny.work**, not an unrelated public result. The supplied Catchpoint URL does not prove this site's performance.

## Known audit blockers
1. No authoritative, browser-derived Core Web Vitals or WebPageTest result for `badbunny.work` obtained yet.
2. Cross-browser (Firefox/WebKit) and real-device compatibility require dedicated execution and review.
3. PayPal checkout/payment and Firebase email-link flows need configured test accounts and controlled sandbox authorization.
4. The browser smoke suite stubs API responses intentionally to avoid accidental money movement or data mutations.

## Source references
- [BrowserStack QA approach](https://www.browserstack.com/guide/how-to-perform-website-qa-testing)
- [TestGrid website testing](https://testgrid.io/blog/website-testing/)
- [Catchpoint WebPageTest](https://www.catchpoint.com/webpagetest/)
