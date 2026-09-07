# Desktop Video Hero Design

## Goal

Replace the desktop homepage scrolly-telly hero with the same concise looping video treatment already used on mobile, so the headline, supporting copy, and booking actions are visible immediately.

## Scope

- Modify only `src/components/ScrollyHero.tsx` and focused tests if needed.
- Reuse the existing `/hero-mobile.mp4` asset.
- Preserve the existing headline, subheadline, “Rhythm First. Then Dance.” label, and links to `/private-lessons` and `/about`.
- Keep the rest of the homepage unchanged.

## Behavior

- Desktop and mobile use a one-viewport hero with a responsive, cover-style video crop.
- The video remains muted, inline, and decorative; meaningful information remains in HTML text.
- The hero has a poster fallback so the first visual state is useful before video playback begins.
- Reduced-motion users receive the poster/static state rather than forced animation.
- Existing contrast overlays remain so text and CTAs stay readable over the footage.

## Verification

- Run the focused hero/source tests and the project lint/build checks available in `nextjs-site`.
- Open the homepage locally at desktop and mobile widths.
- Confirm the headline and CTAs are visible without scrolling, the video loads and loops when motion is allowed, the poster is usable when motion is reduced, and the following homepage section begins immediately after one viewport.

