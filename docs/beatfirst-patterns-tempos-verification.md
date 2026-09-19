# BeatFirst patterns and tempos — 2026-09-19

## Private delivery

- Short URL: https://beatfirst-ceech.vercel.app
- Final deployment: https://dancewithceech-nextjs-2thfonio0-ceechhsus-projects.vercel.app (preview).
- Short alias assigned to the verified deployment. Production remains `dpl_FWFzp2tk7wfiQGKuDHBQAoUGj2wY`; no production promotion or merge.

## Behavior

The game now contains 18 levels. Levels 1–9 retain the exact original note times, lane assignments, durations, and scoring. Level 9 introduces a left kick and right clap, distinguished by sound, label, icon, and gold/blue color. Both sounds are mono and work without stereo headphones.

| Levels | Tempo | Progression |
| --- | --- | --- |
| 1–8 | 90 BPM | Existing clap introduction and patterns, unchanged |
| 9–10 | 90 BPM | Alternating kick/clap, extending from 15 to 20 seconds |
| 11–12 | 90 BPM | Paired hands, then a quiet gap |
| 13–14 | 100 BPM | Familiar paired/gap rhythm, then 25 seconds |
| 15–16 | 100 → 110 BPM | Extra half-beat kick, then faster tempo |
| 17–18 | 110 BPM | Extra half-beat clap, then 30 seconds |

Guests retain samples 1–3. Sign-in opens 4–6 immediately. Personal best 80 in each preceding level from 6 onward opens the next. Existing qualifying level 9 scores therefore open level 10 without replaying or resetting anything. Four-beat count-ins use each level’s tempo. Misses never stop scheduled sound.

Personal-best mastery stars are awarded at 80, 90, and 95 points. The journey uses six expandable chapters, explicit locked-level requirements, actual BPM labels, and next-challenge actions. When all levels are open, the replay suggestion chooses a played level closest to its next star, then an unplayed level, then the final level. The signed-in daily practice goal counts three completed rounds at any score in the player’s local calendar day. It is derived from saved recent attempts and updates immediately after saving, on focus, and every 30 seconds; no penalty, reminder, or streak reset is introduced.

## Local verification

- 76 BeatFirst tests pass. New tests were observed failing before implementation, including catalog/timing/audio, saved-level expansion, and practice goals.
- Exact SHA-256 snapshot of levels 1–9 note/timing data matches the prior catalog. All 18 levels replay perfectly under engine tests.
- Audio scheduling tests verify four clap count-in events at selected tempo, lane-specific buffers, nonempty decaying mono kick with upper-frequency attack, common output-aligned clock, and stopping prior sources. These verify generated sound and routing, not subjective phone-speaker audibility.
- New migration test retains an existing level 9 score, accepts 10–18, rejects 0/19, and preserves RLS/browser denial and service-role insert/select-only grants.
- Scoped ESLint, full TypeScript, and whitespace checks pass.
- Independent spec and quality reviews completed. Fixed review findings: unplayed levels could cause a false all-stars message; a new saved round could wait up to 30 seconds to update the daily count. Added regression for the unplayed fallback.
- At 375×667, real game UI in a temporary account fixture: level 10 scored 97 with 29/30 hits and an intentional miss, opening 11; level 13 at 100 BPM scored 100 with 30/30; level 16 at 110 BPM scored 97 with 46/47 and an intentional miss; level 18 completed 30 seconds at 110 BPM, 63/63 hits and score 96. Every count-in displayed 1, 2, 3, 4. Daily progress immediately changed 1/3 → 2/3 → 3/3 and displayed completion.
- Mobile idle/results controls, gold kick/blue clap notes and pads, all-open journey, old level 9 unlock, guest restrictions, and new-account 4–6 reward checked. No horizontal overflow (375px content/viewport). Desktop checked at 1280×900. Browser error/warning log empty. The temporary fixture was removed before deployment; viewport override reset and test tab closed.
- The owner reported successfully testing all nine prior levels after the Google callback fix. That is user-confirmed behavior, separate from these fixture/API checks.

## Database

Migration `20260919223617_beatfirst_eighteen_levels.sql` applied to academy project `ywianppupnxduthvyeyb`. Live constraint verified as 1–18, RLS remains enabled, and service_role remains SELECT/INSERT only; browser roles have no grants. No saved user attempts were changed.

Advisor findings remain unchanged: [RLS without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) is intentional for this server-only table. Previously investigated `rls_auto_enable()` event-trigger notices are outside this change; [advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).

## Deployed verification

- Vercel optimized build and full TypeScript pass. No temporary fixture route is in the build.
- Actual deployed API with an isolated signed test identity: new account opened 1–6; premature levels 7 and 18 returned 403; levels 4–6 saved without introductions; ordered levels 7–18 saved and opened all 18; changed-payload retries could not alter existing results; lower later scores kept bests/unlocks; mismatched owner returned 409 and another account saw zero attempts. All 16 created test rows were deleted by exact test subject; temporary token/header files were removed. This verifies deployed persistence, not a new browser OAuth exchange.
- On the final deployment and short alias: unauthenticated requests redirect to Vercel authentication (302), missing/wrong app passcode gives 401, correct passcode gives 200 containing the new level catalog, progress API without account session gives 401, removed fixture gives 404, and root redirects to the game (307). The existing short URL and passcode remain unchanged.

## Device follow-up
- Physical-phone listening remains a user check: confirm the kick is distinct at normal speaker volume, and try the 100/110 BPM transitions.
