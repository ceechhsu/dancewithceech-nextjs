# Thanksgiving local preview

User approved this local preview on November 4, 2026 and explicitly authorized commit, push, and deployment. Release verification is recorded in `../thanksgiving-live-release.md` once deployed.

Preview: http://127.0.0.1:3101/?preview=thanksgiving

## Behavior

- Dimensional turkey, natural pumpkin, and gently drifting gold/russet leaves in the three existing homepage seasonal slots.
- Click, tap, Space, or Enter starts a short dance with original soft chimes and leaf rustle. A second activation stops/reset it. Activating another scene transfers the single player.
- No audio autoplay, no repeating audio, no overlapping scene players. Dance state follows actual media playback.
- Hide control stops audio; hiding the tab also stops playback. Reduced motion removes the seasonal animation while preserving intentional sound playback.
- Decorations run during November 2026 and end automatically at midnight beginning December 1, Pacific Time, including audio already playing in an open tab. This default can be adjusted before deployment.
- Local gateway serves a snapshot of the existing public lesson feed. Other API calls cannot write through the gateway. App runs with inert local credentials.

## Artwork

Generated using the built-in image generation tool with true alpha; optimized with Sharp, preserving transparency.

Final asset: `/Volumes/ACASIS4T/DanceWithCeech.com/thanksgiving-preview/public/thanksgiving/turkey-pumpkin.webp` (560 × 512, 87,076 bytes).

Original: `/Users/ceechhsu/.codex/generated_images/01a17b4e-235f-7661-9453-e390768bef18/exec-358318f5-e28a-4591-a01a-7508896baa76.png`.

Final generation prompt:

> Use case: stylized-concept. Asset type: transparent cutout character for a small Thanksgiving website decoration on a dark charcoal background. Create one adorable dimensional miniature turkey beside a small natural pumpkin, a few rich golden autumn maple leaves at its feet. Premium polished 3D animated-film charm, tactile soft feathers, round chestnut-brown body, friendly bright eyes, tiny muted red wattle, amber beak, layered fanned russet copper and honey-gold tail feathers, warm honey rim lighting and soft grounded ambient shadow. Turkey stands slightly left of center with pumpkin low at its right. Entire character, tail fan and pumpkin fully visible, centered compact composition, modest transparent margin around all edges, no background, no scene, no frame, no words or typography. True transparent alpha. Warm and welcoming rather than spooky. Natural pumpkin has no carved face. The turkey's silhouette must read clearly at 120 pixels wide. No extra characters, no hats, no costume.

## Sound

Final asset: `/Volumes/ACASIS4T/DanceWithCeech.com/thanksgiving-preview/public/thanksgiving/autumn-chimes.mp3` (7.2 seconds, stereo, 128 kbps, 116,236 bytes).

Original synthesized audio, no sampled music or external audio. Warm C-major chime notes with decaying harmonics and low-pass filtered leaf-rustle noise, gentle fade-in/out. Playback volume 0.5; file peak about -7 dBFS.

## Validation

- 24 focused tests passed, including start/end dates, DST boundary offsets, deadline timer, existing homepage, navigation, and rhythm trainer checks.
- Scoped ESLint and TypeScript checks passed.
- Independent read-only code review found no material issues.
- Optimized Next.js production build passed compilation, TypeScript, and all 144 static pages using inert local service placeholders. Initial sandbox build could not download the existing Google Fonts; network-enabled build fetched fonts successfully. No product code changed for that environment issue.
- Browser verified silent initial load, native audio duration 7.2 seconds, ongoing dance state, second-click stop/reset, Space/Enter, single-player scene transfer, natural audio ending, hide/show, and reduced motion.
- Browser verified no horizontal overflow at desktop 1920×1080, tablet 768×1024, and phone 375×667. Screenshots saved alongside this record.
- Isolated browser test clock set to one second before December 1 midnight Pacific; active sound and all scene controls disappeared after advancing across the deadline. The clock was used only in a disposable test tab, which was closed. The delivered preview uses the real clock.
- Read-only review completed with no material issues. See the live release record for subsequent commit, push, and deployment results.

## Local runtime at handoff

- Optimized app on loopback port 3102, gateway on loopback port 3101.
- Gateway script: `/private/tmp/dwc-thanksgiving-preview-gateway.cjs`.
- Public lesson snapshot: `/private/tmp/dwc-thanksgiving-public-lessons.json` (48 public lessons).
- Servers are left running for user review. Temporary runtime files may need recreating after a reboot.
- Before any future deployment, recheck the live deployment/source and preserve intervening website changes. User explicitly authorized this Thanksgiving release after reviewing the preview.
