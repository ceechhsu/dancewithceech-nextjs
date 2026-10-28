# Calendar-first archery and opt-in tournaments

**Goal:** Open archery on the current class month's calendar. A selected date offers individual scoring and tournaments. Only the class instructor hosts; students opt in during a five-minute window before the instructor locks entrants and draws opponents.

**Decisions:** Highlight today, require a date selection to open tools, filter rounds/events by that date. Host registration for today only; past dates show history and future dates cannot accept scores. A five-minute server deadline stops joining, and the instructor can close early. Only the instructor's Close registration & draw action generates matches. Fewer than two entrants closes without awarding a champion. Existing one-to-one challenges remain a secondary tool.

**Architecture:** Add dated registration states to tournaments and wrap the existing service-only archery RPC, preserving the tested bracket engine for legacy data while denying the old host-selected draw entry point. Use the existing verified class identity on every action. All joins/leaves are for the caller's own enrollment; class locks serialize joins and close/draw. The preview runs the same migration and upgrades its browser schema without clearing saved rounds.

- [x] Add failing tests for host-only events, self opt-in/out, cutoff, duplicate joins, concurrent boundary serialization, cross-class access, zero/one participants, frozen entrants and random byes for eleven entrants.
- [x] Implement additive migration, validated request actions and server authorization.
- [x] Build a monthly calendar and date-specific score/event views. Replace participant picking with open signup, countdown, join/leave and instructor close/draw.
- [x] Upgrade the fictional preview safely; update existing UI tests for calendar navigation and the opt-in flow.
- [x] Verify build, permissions, scoring, prior attendance and hosted phone behavior. Update the existing stable preview alias and documentation; do not deploy production or edit real rosters.
