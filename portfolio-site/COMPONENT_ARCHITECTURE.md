# Portfolio component ownership and design rules

This document is the implementation contract for changes to the approved Portfolio website.

## Page composition
- **Header and navigation:** portal header, site navigation, global dock.
- **Main content:** projects (constellation and asymmetric Bento), Beyond (four interactive cards and origin-aware modal), creative feature, membership gallery, connect.
- **Footer:** consistent navigation back to the portal and copyright information.
- **Shared primitives:** media thumbnails, card states, links, keyboard and motion interactions.

## Thumbnail component
- **Owner:** `media-thumbnail.js` and `media-thumbnail.css`.
- **Data source:** `creative-posts.json` is the source of truth for published video covers; creator entries may borrow the matching catalog cover.
- **Public music and meditation pop-outs:** `beyond.js` calls the shared thumbnail component.
- **Editorial media cards:** `creative.js` resolves the same validated cover data before creating backgrounds.
- **Featured intro film:** currently has a dedicated static poster. Preserve its cinematic presentation; its YouTube poster uses the same provider's canonical thumbnail endpoint.
- **Private paid membership gallery:** stays locked/obscured intentionally. Never expose the underlying media as a thumbnail without an explicit access policy.
- **Editor or studio preview:** previews the user's local/uploaded file, not a remote YouTube/Instagram thumbnail; do not change its access rules.

## Component change checklist
1. Identify the affected UI property and enumerate every renderer that uses it.
2. Review the approved wireframe and existing responsive/layout decisions before editing.
3. Change shared data handling and presentation once; avoid hand-editing each video card.
4. Keep fallback, missing-data, loading, mobile, reduced-motion, focus, and keyboard states.
5. Test the complete catalog and the live component invocation (not just source-string assertions).
6. Preserve existing product interactions (portal handoff, Bento asymmetry, modal return animations, secure gallery).
7. Review the PR, run the full quality gate, merge only after success, then check the deployed revision.

## Bento grid
Bento sizes should intentionally vary with content. Do not force all cards to equal spans. Use responsive spans that preserve hierarchy without clipping or horizontal overflow.
