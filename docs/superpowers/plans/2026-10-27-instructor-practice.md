# Instructor Personal Practice

**Goal:** The class instructor can record their own practice rounds with the existing arrow-count/distance controls and score wheel, without switching to a sample student or creating a roster enrollment.

**Design:** Reuse the score entry form. Keep the instructor’s own rounds and daily summary separate from student review. Existing students retain their current scorecard and privacy rules.

**Storage:** Add a private, service-only instructor-round table with class ID, verified instructor email/subject, round date, distance/unit, numeric scores, exact M/X marks, computed total and notes. Do not add the instructor to enrollment, attendance, challenges or tournament entrants. Verify class ownership with the existing trusted RPC before reading/writing personal rounds. Use a new additive migration and an atomic in-place browser-preview upgrade.

- [x] Add failing tests for instructor save/retry/history, dates and score validation, spoofed student/teacher identity, cross-class denial, students’ inability to see instructor rounds, role permissions and unchanged rosters.
- [x] Implement the new table and service-only RPC extension. Keep student requests on the established implementation; add instructor personal lists/counts/day history only to the owning verified instructor’s response.
- [x] Enable the existing form for instructor practice. Separate personal history and date summaries from student review; preserve calendar markers and score controls.
- [x] Upgrade preview schema in place and update browser/API fixtures. Test instructor and student practice, privacy, saved-data retention, navigation, tournaments and sample reset.
- [x] Run checks and visual verification, publish only the isolated preview, preserve the renewed share link/QR and verify the hosted result. Do not apply migrations to live classes or deploy production.

Review cases incorporated: same-email/different-subject privacy, class-owner changes, metadata/count privacy, ignored body identity, exact duplicate versus changed payload, concurrent retries, archived/date gates, all earlier preview schemas, rollback after upgrade failure, and role permissions.
