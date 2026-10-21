# User Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give every verified Google user a private My profile page with editable first/last name, nickname and photo, then show the finished live page in the in-app browser.

**Architecture:** Reuse existing trainer_profiles/trainer_preview_profiles and their validated photo/name logic. No duplicate schema or migration. Existing display_name is presented as Nickname, initially the Google display name, so practice challenges keep consistent identity. Google sign-in email, Google account data, class rosters and permissions remain separate. Server binds every read/save/photo to verified Google subject; no browser-selected account. General account endpoint omits unrelated rewards.

**Tech Stack:** Next.js/React, Auth.js, existing server Supabase and sharp, CSS modules, node:test/tsx.

**Design brief:** A dancer choosing how they appear in practice; familiar dark studio/gold palette, Barlow heading and quiet gray controls. Profile preview leads on desktop next to the single edit form, then stacks on phone. Domain: studio, dancer, practice, nickname, identity, portrait. Color world: black studio floor, graphite surfaces, gold logo, chalk-white text, muted gray secondary text. Signature: dancer nickname and portrait preview beside Google identity source. Avoid dashboard metrics, generic gradients and unrelated reward panels. Native form/fieldset/buttons and existing Google login. Four-pixel spacing scale; 24/32px sections, darker inset inputs, subtle borders; gold Save action and clear unsaved/saved/error states.

### Task 1: Reuse the private profile service

Files: modify `src/lib/trainer/api.ts`; add `src/app/api/account/profile/route.ts`, `src/app/api/account/profile/photo/route.ts`, `tests/account-profile.test.ts`.

- [x] Write failing service tests for guest/unverified rejection before DB, same-origin/body/account-selector protections, Google defaults, custom-name persistence, rewards independence, session-switch409, photo decode/re-encode/size checks and preview isolation.
- [x] Add a general profile handler using the existing validated profile logic with rewards disabled. Bind expected account header and session; reject query selectors and unknown body fields. Never permit email/role/roster edits.
- [x] Read/write private no-store/noindex responses; GET/POST profile and GET/HEAD custom photo only. Server re-encodes image, strips metadata and never fetches arbitrary photo URLs.

### Task 2: My profile page

Files: add `src/app/profile/page.tsx`, `src/components/profile/ProfileEditor.tsx`, `Profile.module.css`, image preparation helper; modify private path/CSP config, shared UserMenu/mobile menus/dashboard/owner sidebar and GoogleLogin.

- [x] Dynamic verified-session page, Google sign-in state, unavailable state; existing names/photo default from verified Google session, saved edits take precedence.
- [x] Build native labelled first/last/nickname form, readonly Google email, portrait preview, upload JPG/PNG/WebP up to10MB locally cropped/resized384 square before server decode, Google/remove options, Save/Cancel, unsaved/saved/loading/error/access-loss states. No write on initial load. Block cross-account save; clear draft if session changes. Client upload processing race must not overwrite a later selection/reset.
- [x] Add discoverable full-document My profile links in signed-in desktop/mobile menus, dashboard and owner workspace. Preserve existing practice profile store; rename its display-name label Nickname for consistency.
- [x] Include /profile and API routes in analytics exclusion/private headers. Allow only Google photo hosts and local/blob photo previews. Add concise profile notice.

### Task 3: Verification and live delivery

- [ ] Focused new/existing profile/auth/privacy tests, typecheck, scoped lint, optimized build and synthetic production HTTP checks including two identities, denied reads, save/reload, custom photo, Google/remove restore, no rewards/attendance access.
- [ ] Independent review; fix material issues. Verify actual UI via browser, responsive layout, keyboard labels and feedback.
- [ ] Commit exact source, stage production, verify guest denials, promote. Use signed-in owner profile without changing personal details unless an exact save/restore can preserve existing data. Refresh and leave live My profile visible in IAB; save a nonidentifying preview. Push runtime and verification notes to existing main/scoped branch.
