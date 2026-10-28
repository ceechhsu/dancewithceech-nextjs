# Class progress implementation plan

**Goal:** Add enrollment-controlled archery/workout journals and a teacher class dashboard without changing the public dance business or QR attendance.

**Architecture:** Reuse server-verified Google identity and the attendance roster. A service-only PostgreSQL RPC checks class ownership or active enrollment for every operation. Existing classes default to attendance only; instructors explicitly select a progress tool. Journals belong to an enrollment and class, with dated activity/result/notes and idempotent entry IDs. No live data changes are needed to develop or verify.

**Execution:** Inline, as requested; no subagents or deployment.

- [x] Write failing PostgreSQL integration tests for configuration, enrollment discovery, own-record isolation, class ownership, subject binding, validation, identity binding, revoked enrollment, private grants and instructor attendance detail.
- [x] Implement additive migration `20261018221205_attendance_class_progress.sql`, preserving existing attendance RPCs.
- [x] Add validated progress HTTP entrypoint using the existing identity/origin conventions; test request validation and real local HTTP access.
- [x] Add student journal page and class links, explicit instructor progress-tool configuration, teacher dashboard and class roster/dated attendance view. Reuse the attendance styles and controls.
- [x] Run attendance regressions, security tests, lint, typecheck and production build. Verify desktop/mobile in a disposable local database, with fictional accounts only, and save screenshots.
- [x] Document deployment order, class configuration and limits. Review diff and leave all unrelated changes intact.

**UI intent:** Students quickly record today's practice and review earlier weeks; teachers immediately open a class roster. Keep the existing dark attendance surfaces, blue links, native labeled controls, generous tap targets, and current typography/spacing. Lead with class name, then the task; group entry fields separately from dated history. No charts or invented scoring scheme.
